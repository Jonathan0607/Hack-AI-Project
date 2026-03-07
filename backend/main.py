from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from fastapi.middleware.cors import CORSMiddleware
import os

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "sentinel"

    class Config:
        env_file = "../.env"

settings = Settings()
app = FastAPI(title="Project Sentinel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(settings.mongodb_uri)
    app.mongodb = app.mongodb_client[settings.db_name]

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import asyncio
import json

@app.get("/")
async def root():
    return {"message": "Project Sentinel API"}

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
