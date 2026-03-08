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
from analytics.stats_engine import RiskAnalyzer

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "haven"
    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    port: str = "8000"
    next_public_api_url: str = "http://localhost:8000"

    class Config:
        env_file = "../.env"
        extra = "ignore"

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
"""

class ChatRequest(BaseModel):
    extracted_text: list
    analysis: dict
    question: str

@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(settings.mongodb_uri)
    app.mongodb = app.mongodb_client[settings.db_name]

@app.on_event("shutdown")
async def shutdown_db_client():
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
            
        analyzer = RiskAnalyzer()
        
        for msg in conv.get("messages", []):
            await asyncio.sleep(1)
            
            text_to_analyze = msg.get("text", "")
            full_prompt = f"{SYSTEM_PROMPT_AUDIO}\n\nTranscript:\n{text_to_analyze}"
            
            try:
                response = await asyncio.wait_for(
                    analysis_model.generate_content_async(full_prompt),
                    timeout=15.0
                )
                result = json.loads(response.text)
                scores = result.get("analysis", {})
            except Exception as e:
                print(f"Error calling Gemini in stream: {e}")
                scores = {
                    "error": "API Timeout",
                    "toxicity_score": 0,
                    "control_score": 0,
                    "gaslighting_score": 0,
                    "overall_risk_score": 0,
                    "signal_detected": False,
                    "z_score": 0.0
                }
                
            analysis = analyzer.analyze(scores)
            
            msg.update(scores)
            msg.update(analysis)
            
            yield f"data: {json.dumps(msg)}\n\n"
        
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/analyze-screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = PIL.Image.open(io.BytesIO(contents))
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(analysis_model.generate_content, [SYSTEM_PROMPT_SCREENSHOT, image]),
                timeout=20.0
            )
            # Ensure we return valid JSON
            result = json.loads(response.text)
            return result
        except Exception as api_e:
            print(f"API Error calling Gemini: {api_e}")
            return {
                "error": "API Timeout",
                "toxicity_score": 0,
                "control_score": 0,
                "gaslighting_score": 0,
                "overall_risk_score": 0,
                "signal_detected": False,
                "z_score": 0.0
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Transcribe audio using ElevenLabs
        contents = await file.read()
        audio_stream = io.BytesIO(contents)
        audio_stream.name = "audio.webm" # Required for correct MIME type detection in ElevenLabs SDK

        try:
            transcription_result = await asyncio.wait_for(
                asyncio.to_thread(
                    elevenlabs_client.speech_to_text.convert,
                    file=audio_stream,
                    model_id="scribe_v1"
                ),
                timeout=20.0
            )
            transcript = transcription_result.text
            
            # Analyze transcript using Gemini
            full_prompt = f"{SYSTEM_PROMPT_AUDIO}\n\nTranscript:\n{transcript}"
            response = await asyncio.wait_for(
                asyncio.to_thread(analysis_model.generate_content, full_prompt),
                timeout=20.0
            )
            
            # Ensure we return valid JSON (with the exact same structure as the screenshot endpoint)
            result = json.loads(response.text)
        except Exception as api_err:
            print(f"API Error during transcription/analysis: {api_err}")
            return {
                "error": "API Timeout",
                "toxicity_score": 0,
                "control_score": 0,
                "gaslighting_score": 0,
                "overall_risk_score": 0,
                "signal_detected": False,
                "z_score": 0.0
            }
        
        # Explicitly set the extracted text to match the transcript just in case Gemini gets confused
        result["extracted_text"] = [
            {
               "sender": "speaker",
               "text": transcript
            }
        ]

        # Pass live Gemini scores through RiskAnalyzer
        analyzer = RiskAnalyzer()
        analysis_scores = analyzer.analyze(result.get("analysis", {}))
        if "analysis" not in result:
            result["analysis"] = {}
        result["analysis"].update(analysis_scores)

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
                return {"answer": "Network latency detected. Please try your search again."}
                
            data = response.json()
            answer_text = data["candidates"][0]["content"]["parts"][0]["text"]
            
        return {"answer": answer_text}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {"answer": "Network latency detected. Please try your search again."}
