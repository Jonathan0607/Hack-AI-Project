import asyncio
import os
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "Cluster0")

async def seed_data():
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    print(f"Connecting to MongoDB: {DB_NAME}...")
    # Using tlsAllowInvalidCertificates for macOS/Python 3.14 compatibility as seen in database.py
    client = AsyncIOMotorClient(MONGODB_URI, tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    
    # Clear existing mock data (optional, but good for clean state)
    # await db.analyses.delete_many({"mock": True})

    personas = [
        {
            "name": "Mark",
            "relationship": "Ex-partner",
            "base_risk": 8,
            "tags": ["Gaslighting", "Control", "Coercion", "Manipulation"],
            "messages": [
                "You know you're crazy, right? Nobody else would put up with you.",
                "Why didn't you answer my call? You're definitely hiding something.",
                "If you leave, you'll have nothing. I'm the only one who cares.",
                "I never said that. You're just making things up again.",
                "You're pathetic without me.",
                "I saw you with him. Don't lie to me.",
                "You'll regret ever crossing me."
            ]
        },
        {
            "name": "Sarah",
            "relationship": "Partner",
            "base_risk": 0,
            "tags": ["Healthy", "Supportive", "Empathetic"],
            "messages": [
                "Hey, hope you're having a good day! Love you.",
                "I'm so proud of what you accomplished today.",
                "Do you want to talk about what's bothering you? I'm here for you.",
                "I respect your decision. Let me know how I can support you.",
                "Just wanted to say I appreciate you.",
                "You're doing great, don't forget to take a break.",
                "I'm so lucky to have you in my life."
            ]
        },
        {
            "name": "Alex",
            "relationship": "Colleague",
            "base_risk": 5,
            "tags": ["Boundary Testing", "Hostility", "Passive Aggressive"],
            "messages": [
                "Are you sure you can handle this project? It seems a bit much for you.",
                "I saw you talking to the boss. Trying to get ahead of me?",
                "That's not how we do things here. Maybe listen more next time.",
                "Just a 'friendly' reminder that I'm still the lead on this.",
                "You always seem so distracted lately. Is everything okay at home?",
                "Must be nice to get all the credit for my hard work.",
                "I'll just fix this for you, clearly you're struggling."
            ]
        },
        {
            "name": "David",
            "relationship": "Stranger",
            "base_risk": 10,
            "tags": ["Extreme Hostility", "Threats", "Stalking"],
            "messages": [
                "I know where you live.",
                "You can't hide from me forever.",
                "You're going to pay for what you did.",
                "Watch your back.",
                "I'm coming for you.",
                "Check your windows tonight.",
                "This is just the beginning."
            ]
        },
        {
            "name": "Emily",
            "relationship": "Family",
            "base_risk": 3,
            "tags": ["Over-involved", "Guilt Tripping"],
            "messages": [
                "Why haven't you called Mom? She's so worried about you.",
                "I'm only saying this because I love you, but your new job is a mistake.",
                "You never have time for family anymore.",
                "It's like you don't even care about us.",
                "I do everything for you and this is how you treat me?",
                "Just remember who was there for you when nobody else was.",
                "You're becoming just like Dad."
            ]
        },
        {
            "name": "Coach Mike",
            "relationship": "Other",
            "base_risk": 0,
            "tags": ["Professional", "Encouraging", "Mentor"],
            "messages": [
                "Great workout today! Keep up the intensity.",
                "Don't get discouraged, progress takes time.",
                "I've seen a lot of growth in your technique lately.",
                "Focus on the fundamentals and the results will follow.",
                "You have a lot of potential, keep pushing yourself.",
                "Remember your 'why' when things get tough.",
                "Proud of your dedication to the sport."
            ]
        }
    ]

    entries = []
    now = datetime.utcnow()

    print("Generating mock data...")
    for persona in personas:
        # Generate 30-50 entries per persona over the last 180 days
        num_entries = random.randint(30, 50)
        for i in range(num_entries):
            days_ago = random.randint(0, 180)
            timestamp = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            # Vary risk score slightly
            risk_score = min(10, max(0, persona["base_risk"] + random.randint(-1, 2)))
            
            # Select random tags
            selected_tags = random.sample(persona["tags"], k=random.randint(1, len(persona["tags"]))) if persona["tags"] else []

            entry = {
                "timestamp": timestamp,
                "source": random.choice(["screenshot", "audio"]),
                "extracted_text": [{"sender": persona["name"], "text": random.choice(persona["messages"])}],
                "analysis": {
                    "toxicity_score": random.randint(risk_score * 10 - 10, risk_score * 10) if risk_score > 0 else 0,
                    "control_score": random.randint(risk_score * 10 - 10, risk_score * 10) if risk_score > 0 else 0,
                    "gaslighting_score": random.randint(risk_score * 10 - 10, risk_score * 10) if risk_score > 0 else 0,
                    "overall_risk_score": risk_score,
                    "explanation": f"This interaction shows patterns of {', '.join(selected_tags).lower()} associated with {persona['name']}.",
                    "tags": selected_tags
                },
                "contact_name": persona["name"],
                "relationship_type": persona["relationship"],
                "tags": selected_tags,
                "mock": True
            }
            entries.append(entry)


    if entries:
        print(f"Inserting {len(entries)} mock entries...")
        result = await db.analyses.insert_many(entries)
        print(f"Successfully inserted {len(result.inserted_ids)} entries.")
    else:
        print("No entries generated.")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
