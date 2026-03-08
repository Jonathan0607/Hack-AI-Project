import os
import json
import asyncio
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import PIL.Image
import io
import httpx
from elevenlabs.client import ElevenLabs
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import VoiceResponse, Connect
from fastapi import WebSocket, WebSocketDisconnect
import base64

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "haven"
    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    class Config:
        env_file = "../.env"

settings = Settings()
app = FastAPI(title="Project Haven")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini with the provided API key
genai.configure(api_key=settings.gemini_api_key)
generation_config_json = {
  "temperature": 0.2,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}
analysis_model = genai.GenerativeModel(
  model_name="gemini-2.5-flash",
  generation_config=generation_config_json,
)

# Configure ElevenLabs with the provided API key
elevenlabs_client = ElevenLabs(api_key=settings.elevenlabs_api_key)

SYSTEM_PROMPT_SCREENSHOT = """
Analyze the provided screenshot of a text message conversation. 
Your goal is to extract the text and assess the conversation for potential signs of abuse. You must act as an expert clinical psychologist. You must strictly ground your analysis in the Diagnostic and Statistical Manual of Mental Disorders (DSM-5-TR) criteria regarding abusive relationships, power dynamics, and related disorders, as well as real, peer-reviewed articles from hospitals and therapists.

Please provide your analysis strictly in the following JSON format:
{
  "extracted_text": [
    {
      "sender": "self" | "partner",
      "text": "The text of this specific message bubble."
    }
  ],
  "analysis": {
    "toxicity_score": <int 0-10>,
    "control_score": <int 0-10>,
    "gaslighting_score": <int 0-10>,
    "overall_risk_score": <int 0-10>,
    "explanation": "A concise explanation of the scores (strictly 3 to 5 sentences long). You MUST explicitly cite the specific DSM-5 diagnostic criteria and real articles/resources from hospitals or therapists that justify these scores."
  }
}
"""

SYSTEM_PROMPT_AUDIO = """
Analyze the following text transcript of a user speaking. 
Your goal is to assess their spoken words for potential signs that they are perpetuating or experiencing abuse. You must act as an expert clinical psychologist. You must strictly ground your analysis in the Diagnostic and Statistical Manual of Mental Disorders (DSM-5-TR) criteria regarding abusive relationships, power dynamics, and related disorders, as well as real, peer-reviewed articles from hospitals and therapists.

Please provide your analysis strictly in the following JSON format:
{
  "extracted_text": [
    {
      "sender": "speaker",
      "text": "The transcript of the audio provided."
    }
  ],
  "analysis": {
    "toxicity_score": <int 0-10>,
    "control_score": <int 0-10>,
    "gaslighting_score": <int 0-10>,
    "overall_risk_score": <int 0-10>,
    "explanation": "A concise explanation of the scores (strictly 3 to 5 sentences long). You MUST explicitly cite the specific DSM-5 diagnostic criteria and real articles/resources from hospitals or therapists that justify these scores."
  }
}
"""

SYSTEM_PROMPT_CHAT = """
You are an expert clinical psychologist and an empathetic support assistant. The user has just run an interaction through an abuse detection scan. 
Below is the context of the transcript and the diagnostic scores/explanation it received.

The user is asking you a follow up question. 
You MUST provide helpful, supportive, and highly actionable advice.
Critically, you must use your Google Search grounding tool to explicitly provide and link to real-world resources (e.g. real therapists, hospital articles, verifiable abuse hotlines, reputable psychological associations).
Ensure the tone is supportive, professional, and clear. Format your response strictly using rich Markdown formatting (e.g. bolding, bullet points, hyperlinks to actual websites).
Keep your responses extremely concise and to the point. Limit your response to 2-3 short paragraphs at most, and focus on direct, practical advice without being overwhelming.
"""

class ChatRequest(BaseModel):
    extracted_text: list
    analysis: dict
    question: str

@app.on_event("startup")
async def startup_events():

    # Database initialization
    try:
        print("Connecting to MongoDB...")
        app.mongodb_client = AsyncIOMotorClient(settings.mongodb_uri)
        app.mongodb = app.mongodb_client[settings.db_name]
        # Verify connection (non-blocking ping)
        # We don't await an operation here to avoid blocking startup if DB is down.
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        app.mongodb = None

@app.on_event("shutdown")
async def shutdown_events():
    if hasattr(app, 'mongodb_client'):
        app.mongodb_client.close()

@app.get("/")
async def root():
    return {"message": "Project Haven API"}

@app.get("/conversations")
async def get_conversations():
    cursor = app.mongodb.conversations.find().sort("risk_score", -1)
    conversations = await cursor.to_list(length=100)
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    return conversations

@app.get("/stream/{id}")
async def stream_conversation(id: str):
    async def event_generator():
        conv = await app.mongodb.conversations.find_one({"thread_id": id})
        if not conv:
            yield "data: {\"error\": \"Not found\"}\n\n"
            return
        
        for msg in conv.get("messages", []):
            await asyncio.sleep(1)
            yield f"data: {json.dumps(msg)}\n\n"
        
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/analyze-screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = PIL.Image.open(io.BytesIO(contents))
        
        response = analysis_model.generate_content([SYSTEM_PROMPT_SCREENSHOT, image])
        
        # Ensure we return valid JSON
        result = json.loads(response.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Transcribe audio using ElevenLabs
        contents = await file.read()
        audio_stream = io.BytesIO(contents)
        audio_stream.name = "audio.webm" # Required for correct MIME type detection in ElevenLabs SDK

        transcription_result = elevenlabs_client.speech_to_text.convert(
             file=audio_stream,
             model_id="scribe_v1"
        )
        
        transcript = transcription_result.text
        
        # Analyze transcript using Gemini
        full_prompt = f"{SYSTEM_PROMPT_AUDIO}\n\nTranscript:\n{transcript}"
        response = analysis_model.generate_content(full_prompt)
        
        # Ensure we return valid JSON (with the exact same structure as the screenshot endpoint)
        result = json.loads(response.text)
        
        # Explicitly set the extracted text to match the transcript just in case Gemini gets confused
        result["extracted_text"] = [
            {
               "sender": "speaker",
               "text": transcript
            }
        ]

        return result
    except Exception as e:
        print(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_analysis(request: ChatRequest):
    try:
        # Construct context for the model
        context = f"Transcript:\n{json.dumps(request.extracted_text, indent=2)}\n\nAnalysis Results:\n{json.dumps(request.analysis, indent=2)}"
        full_prompt = f"{SYSTEM_PROMPT_CHAT}\n\n{context}\n\nUser Question:\n{request.question}"
        
        # Bypass Python SDK protobuf issues by hitting the REST API directly
        async with httpx.AsyncClient() as client:
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "tools": [{"google_search": {}}],
                "generationConfig": {
                    "temperature": 0.4,
                    "topP": 0.95,
                    "topK": 40,
                    "maxOutputTokens": 8192,
                }
            }
            
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key}"
            response = await client.post(api_url, json=payload, timeout=30.0)
            
            if response.status_code != 200:
                print(f"Gemini API Error: {response.text}")
                raise HTTPException(status_code=500, detail="Error generating chat response")
                
            data = response.json()
            answer_text = data["candidates"][0]["content"]["parts"][0]["text"]
            
        return {"answer": answer_text}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/initiate-call")
async def initiate_call(to_number: str):
    try:
        # Ensure number is in E.164 format (simple version for US)
        if not to_number.startswith('+'):
            if len(to_number) == 10:
                to_number = f"+1{to_number}"
            else:
                to_number = f"+{to_number}"

        client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Use placeholder public URL for localhost development or actual prod domain
        public_url = "https://project-haven-backend.loca.lt"
        
        response = VoiceResponse()
        connect = Connect()
        connect.stream(url=f"wss://{public_url.split('//')[1]}/twilio-voice-stream")
        response.append(connect)
        
        print(f"Initiating call to {to_number} from {settings.twilio_phone_number}")
        
        call = client.calls.create(
            to=to_number,
            from_=settings.twilio_phone_number,
            twiml=str(response)
        )
        return {"call_sid": call.sid}
    except Exception as e:
        error_msg = str(e)
        print(f"Error initiating call: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.websocket("/twilio-voice-stream")
async def twilio_voice_stream(websocket: WebSocket):
    await websocket.accept()
    print("Twilio WebSocket connected")
    
    # ElevenLabs STS WebSocket URL
    # Voice ID: QLAlOeRuLwKX0skeTR7R
    voice_id = "QLAlOeRuLwKX0skeTR7R"
    sts_url = f"wss://api.elevenlabs.io/v1/speech-to-speech/{voice_id}/stream-input?model_id=eleven_english_sts_v2"
    
    async with httpx.AsyncClient() as client:
        # ElevenLabs requires a WebSocket for real-time STS
        # We'll use the 'websockets' library for the ElevenLabs connection
        import websockets as ws_lib
        
        async with ws_lib.connect(sts_url, extra_headers={"xi-api-key": settings.elevenlabs_api_key}) as el_ws:
            # Send initial configuration
            bos_message = {
                "text": " ", # STS requires text even if empty for initiation
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.8
                },
                "generation_config": {
                    "chunk_length_schedule": [120, 160, 250, 290]
                }
            }
            await el_ws.send(json.dumps(bos_message))
            
            async def receive_from_el():
                try:
                    async for message in el_ws:
                        data = json.loads(message)
                        if data.get("audio"):
                            # Send audio back to Twilio
                            audio_payload = data["audio"]
                            media_message = {
                                "event": "media",
                                "media": {
                                    "payload": audio_payload
                                }
                            }
                            await websocket.send_text(json.dumps(media_message))
                except Exception as e:
                    print(f"Error receiving from ElevenLabs: {e}")

            asyncio.create_task(receive_from_el())
            
            try:
                while True:
                    data = await websocket.receive_text()
                    msg = json.loads(data)
                    
                    if msg["event"] == "media":
                        # Forward audio chunk to ElevenLabs
                        payload = msg["media"]["payload"]
                        el_msg = {
                            "audio": payload,
                            "flush": False
                        }
                        await el_ws.send(json.dumps(el_msg))
                    elif msg["event"] == "stop":
                        print("Twilio stopped the stream")
                        break
            except WebSocketDisconnect:
                print("Twilio WebSocket disconnected")
            except Exception as e:
                print(f"Error in Twilio stream loop: {e}")
            finally:
                # End stream with ElevenLabs
                await el_ws.send(json.dumps({"audio": ""}))
