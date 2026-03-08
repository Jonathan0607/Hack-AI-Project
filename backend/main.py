import os
import io
import json
import asyncio
import logging
from datetime import datetime

# Configure logging at the absolute start
log_file = os.path.join(os.path.dirname(__file__), "debug_log.txt")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.info("--- BACKEND STARTING UP ---")

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from pydantic_settings import BaseSettings
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import PIL.Image
import httpx
from elevenlabs.client import ElevenLabs
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import VoiceResponse, Connect
import base64
import re
from typing import List, Optional
from bson import ObjectId
from database import connect_to_mongo, close_mongo_connection, get_db
from models import AnalysisEntry, ChatRequest

class Settings(BaseSettings):
    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    ngrok_authtoken: str = ""
    vapi_key: str = ""
    mongodb_uri: str = ""
    db_name: str = ""

    class Config:
        env_file = "../.env"
        extra = "ignore"

# Logic moved to top of file
# ...

settings = Settings()
app = FastAPI(title="Project Haven")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"DEBUG: Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"DEBUG: Response status: {response.status_code}")
    return response

# Configure Gemini with the provided API key
genai.configure(api_key=settings.gemini_api_key)
generation_config_json = {
  "temperature": 0.2,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}
safety_settings = [
  {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
  {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
  {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
  {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

analysis_model = genai.GenerativeModel(
  model_name="gemini-2.5-flash",
  generation_config=generation_config_json,
  safety_settings=safety_settings
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
    "explanation": "A concise explanation of the scores (strictly 3 to 5 sentences long). You MUST explicitly cite the specific DSM-5 diagnostic criteria and real articles/resources from hospitals or therapists that justify these scores.",
    "tags": ["Manipulation", "Stalking", "Hostility", "Coercion", "Gaslighting", "Boundary Testing"],
    "partner_name": "String if identified, otherwise Unknown"
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
    "explanation": "A concise explanation of the scores (strictly 3 to 5 sentences long). You MUST explicitly cite the specific DSM-5 diagnostic criteria and real articles/resources from hospitals or therapists that justify these scores.",
    "tags": ["Manipulation", "Hostility", "Fear", "Confusion", "Coercion"],
    "partner_name": "Unknown"
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

# ChatRequest moved to models.py

@app.on_event("startup")
async def startup_events():
    # Ngrok Tunnel initialization
    app.state.public_url = "https://unevangelized-karolyn-workmanly.ngrok-free.dev"
    app.state.frontend_url = "https://hanna-unidentified-basically.ngrok-free.dev"
    
    # Check for external Ngrok URL first (managed by CLI)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tunnel_file = os.path.join(current_dir, "tunnel_url.txt")
    frontend_file = os.path.join(current_dir, "frontend_url.txt")

    print(f"DEBUG: Looking for tunnel files in: {current_dir}")

    if os.path.exists(tunnel_file):
        try:
            with open(tunnel_file, "r") as f:
                app.state.public_url = f.read().strip()
                print(f"DEBUG: Using Ngrok backend URL from file: {app.state.public_url}")
        except Exception as e:
            print(f"DEBUG: Error reading tunnel_url.txt: {e}")

    if os.path.exists(frontend_file):
        try:
            with open(frontend_file, "r") as f:
                app.state.frontend_url = f.read().strip()
                print(f"DEBUG: Using Ngrok frontend URL from file: {app.state.frontend_url}")
        except Exception as e:
            print(f"DEBUG: Error reading frontend_url.txt: {e}")

    await connect_to_mongo(settings.mongodb_uri, settings.db_name)

@app.on_event("shutdown")
async def shutdown_events():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Project Haven API"}

@app.get("/conversations")
async def get_conversations():
    return []

@app.get("/analyses")
async def get_analyses(contact_name: Optional[str] = None):
    db = get_db()
    if db is None:
        return []
    
    query = {}
    if contact_name:
        query["contact_name"] = contact_name
        
    cursor = db.analyses.find(query).sort("timestamp", -1)
    analyses = await cursor.to_list(length=100)
    # Convert ObjectId to string
    for a in analyses:
        a["_id"] = str(a["_id"])
        if "timestamp" in a and isinstance(a["timestamp"], datetime):
            a["timestamp"] = a["timestamp"].isoformat()
    return analyses

@app.post("/analyses/{analysis_id}/reflection")
async def save_reflection(analysis_id: str, reflection: dict):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    result = await db.analyses.update_one(
        {"_id": ObjectId(analysis_id)},
        {"$set": {"user_reflection": reflection.get("content")}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {"status": "success"}

@app.get("/stats")
async def get_stats():
    db = get_db()
    if db is None:
        return {}
    
    # Aggregation for tags and average scores
    cursor = db.analyses.find({}, {"analysis": 1})
    docs = await cursor.to_list(length=1000)
    
    tag_counts = {}
    total_risk = 0
    count = 0
    
    for d in docs:
        analysis = d.get("analysis", {})
        tags = analysis.get("tags", [])
        for t in tags:
            tag_counts[t] = tag_counts.get(t, 0) + 1
        
        total_risk += analysis.get("overall_risk_score", 0)
        count += 1
            
    return {
        "tag_counts": tag_counts,
        "avg_risk_score": total_risk / count if count > 0 else 0,
        "total_analyses": count
    }

@app.get("/contacts")
async def get_contacts():
    db = get_db()
    if db is None:
        return []
    
    pipeline = [
        {
            "$group": {
                "_id": "$contact_name",
                "relationship": {"$first": "$relationship_type"},
                "avg_risk": {"$avg": "$analysis.overall_risk_score"},
                "highest_risk": {"$max": "$analysis.overall_risk_score"},
                "incident_count": {"$sum": 1},
                "last_incident": {"$max": "$timestamp"}
            }
        },
        {"$sort": {"highest_risk": -1}}
    ]
    
    cursor = db.analyses.aggregate(pipeline)
    contacts = await cursor.to_list(length=100)
    
    # Format for frontend
    formatted_contacts = []
    for c in contacts:
        formatted_contacts.append({
            "name": c["_id"],
            "relationship": c["relationship"],
            "avgRisk": round(c["avg_risk"], 1) if c["avg_risk"] else 0,
            "highestRisk": c["highest_risk"],
            "count": c["incident_count"],
            "lastSeen": c["last_incident"].isoformat() if isinstance(c["last_incident"], datetime) else None
        })
        
    return formatted_contacts

@app.get("/stream/{id}")
async def stream_conversation(id: str):
    raise HTTPException(status_code=404, detail="Conversation storage is disabled")

@app.post("/analyze-screenshot")
async def analyze_screenshot(
    file: UploadFile = File(...),
    contact_name: Optional[str] = Form("Unknown"),
    relationship_type: Optional[str] = Form("Unknown")
):
    try:
        contents = await file.read()
        image = PIL.Image.open(io.BytesIO(contents))
        
        logger.info(f"DEBUG: Analyzing screenshot for contact: {contact_name}")
        response = analysis_model.generate_content([SYSTEM_PROMPT_SCREENSHOT, image])
        
        # Check if response was blocked
        if not response.candidates or not response.candidates[0].content.parts:
            logger.error(f"ERROR: Gemini response blocked. Finish reason: {response.candidates[0].finish_reason if response.candidates else 'Unknown'}")
            raise HTTPException(status_code=500, detail=f"Analysis blocked by safety filters. Reason: {response.candidates[0].finish_reason if response.candidates else 'Unknown'}")

        # Robust JSON parsing
        text_content = response.text
        logger.info(f"DEBUG: Gemini raw response length: {len(text_content)}")
        
        # Remove markdown code blocks if present
        json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
        else:
            clean_json = text_content
            
        try:
            result = json.loads(clean_json)
        except json.JSONDecodeError as je:
            logger.error(f"ERROR decoding JSON from Gemini: {je}. Raw: {text_content[:200]}")
            # Fallback for very messy responses
            raise HTTPException(status_code=500, detail="Failed to parse analysis metadata.")
        
        db = get_db()
        if db is not None:
            analysis_data = result.get("analysis", {})
            # Ensure required fields exist
            for field in ["toxicity_score", "control_score", "gaslighting_score", "overall_risk_score"]:
                if field not in analysis_data: analysis_data[field] = 0
            if "explanation" not in analysis_data: analysis_data["explanation"] = "No explanation provided."
            if "tags" not in analysis_data: analysis_data["tags"] = []

            analysis_doc = AnalysisEntry(
                source="screenshot",
                extracted_text=result.get("extracted_text", []),
                analysis=analysis_data,
                contact_name=contact_name if (contact_name and contact_name != "Unknown") else analysis_data.get("partner_name", "Unknown"),
                relationship_type=relationship_type,
                tags=analysis_data.get("tags", [])
            )
            inserted_result = await db.analyses.insert_one(analysis_doc.model_dump())
            result["_id"] = str(inserted_result.inserted_id)
            logger.info(f"DEBUG: Screenshot analysis saved with ID: {result['_id']}")
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR in analyze_screenshot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe-audio")
async def transcribe_audio(
    file: UploadFile = File(...),
    contact_name: Optional[str] = Form("Unknown"),
    relationship_type: Optional[str] = Form("Unknown")
):
    try:
        # Transcribe audio using ElevenLabs
        contents = await file.read()
        audio_stream = io.BytesIO(contents)
        audio_stream.name = "audio.webm" # Required for correct MIME type detection in ElevenLabs SDK

        logger.info(f"DEBUG: Transcribing audio for contact: {contact_name}")
        transcription_result = elevenlabs_client.speech_to_text.convert(
             file=audio_stream,
             model_id="scribe_v1"
        )
        
        transcript = transcription_result.text
        logger.info(f"DEBUG: Transcribed text: {transcript[:100]}...")
        
        # Analyze transcript using Gemini
        full_prompt = f"{SYSTEM_PROMPT_AUDIO}\n\nTranscript:\n{transcript}"
        response = analysis_model.generate_content(full_prompt)
        
        # Check if response was blocked
        if not response.candidates or not response.candidates[0].content.parts:
            logger.error(f"ERROR: Gemini response (audio) blocked. Finish reason: {response.candidates[0].finish_reason if response.candidates else 'Unknown'}")
            raise HTTPException(status_code=500, detail=f"Analysis blocked by safety filters. Reason: {response.candidates[0].finish_reason if response.candidates else 'Unknown'}")

        # Robust JSON parsing
        text_content = response.text
        json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
        else:
            clean_json = text_content
            
        try:
            result = json.loads(clean_json)
        except json.JSONDecodeError as je:
            logger.error(f"ERROR decoding JSON (audio) from Gemini: {je}. Raw: {text_content[:200]}")
            raise HTTPException(status_code=500, detail="Failed to parse analysis metadata.")
        
        # Explicitly set the extracted text to match the transcript just in case Gemini gets confused
        result["extracted_text"] = [
            {
               "sender": "speaker",
               "text": transcript
            }
        ]

        db = get_db()
        if db is not None:
            analysis_data = result.get("analysis", {})
            # Ensure required fields exist
            for field in ["toxicity_score", "control_score", "gaslighting_score", "overall_risk_score"]:
                if field not in analysis_data: analysis_data[field] = 0
            if "explanation" not in analysis_data: analysis_data["explanation"] = "No explanation provided."
            if "tags" not in analysis_data: analysis_data["tags"] = []

            analysis_doc = AnalysisEntry(
                source="audio",
                extracted_text=result.get("extracted_text", []),
                analysis=analysis_data,
                contact_name=contact_name if (contact_name and contact_name != "Unknown") else analysis_data.get("partner_name", "Unknown"),
                relationship_type=relationship_type,
                tags=analysis_data.get("tags", [])
            )
            inserted_result = await db.analyses.insert_one(analysis_doc.model_dump())
            result["_id"] = str(inserted_result.inserted_id)
            logger.info(f"DEBUG: Audio analysis saved with ID: {result['_id']}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR processing audio: {e}", exc_info=True)
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

        print(f"Initiating Vapi call to {to_number}")
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {settings.vapi_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "phoneNumberId": "1f160ff1-b07a-482a-bc05-ad145bc099c7",
                "customer": {
                    "number": to_number
                }
            }
            response = await client.post(
                "https://api.vapi.ai/call/phone", 
                headers=headers, 
                json=payload, 
                timeout=30.0
            )
            
            if response.status_code not in (200, 201):
                error_msg = response.text
                print(f"Vapi API Error: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Failed to initiate call via Vapi: {error_msg}")
                
            data = response.json()
            print(f"DEBUG: Vapi Outbound call successful, Call ID: {data.get('id')}")
            return {"call_sid": data.get("id")}
            
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
