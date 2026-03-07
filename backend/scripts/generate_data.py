import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "sentinel")

async def generate():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db.conversations

    await collection.delete_many({})

    docs = []
    
    noise_scenarios = [
        "What time is dinner?",
        "Did you pick up the laundry?",
        "How was your day at work?",
        "Don't forget to buy milk.",
        "I'm running late, start without me.",
        "Can we watch that new movie tonight?",
        "Happy Birthday!",
        "Thanks for the help yesterday.",
        "Where did you put the remote?",
        "Have a good trip!"
    ]

    for i, scenario in enumerate(noise_scenarios):
        docs.append({
            "thread_id": f"noise_{i}",
            "risk_score": 0.1,
            "type": "noise",
            "messages": [
                {"sender": "partner", "text": scenario, "timestamp": datetime.utcnow().isoformat()},
                {"sender": "counselor_client", "text": "Sure!", "timestamp": datetime.utcnow().isoformat()}
            ],
            "created_at": datetime.utcnow().isoformat()
        })

    signal_scenarios = [
        "You always remember things wrong. You're crazy.",
        "Nobody else would ever want you but me.",
        "If you leave, you'll regret it.",
        "I'm not letting you see your family this weekend.",
        "You're making this up again.",
        "Why do you always try to make me look bad?",
        "You're completely dependent on me.",
        "I'll take the kids if you try anything.",
        "Your friends don't actually like you.",
        "I'm the only one who tells you the truth."
    ]

    risk_scores = [0.8, 0.7, 0.9, 0.95, 0.85, 0.75, 0.88, 0.98, 0.72, 0.9]

    for i, scenario in enumerate(signal_scenarios):
        docs.append({
            "thread_id": f"signal_{i}",
            "risk_score": risk_scores[i],
            "type": "signal",
            "messages": [
                {"sender": "counselor_client", "text": "I don't think that's how it happened.", "timestamp": datetime.utcnow().isoformat()},
                {"sender": "partner", "text": scenario, "timestamp": datetime.utcnow().isoformat()}
            ],
            "created_at": datetime.utcnow().isoformat()
        })

    await collection.insert_many(docs)
    print(f"Inserted {len(docs)} conversation threads.")
    client.close()

if __name__ == "__main__":
    asyncio.run(generate())
