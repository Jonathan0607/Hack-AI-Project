from motor.motor_asyncio import AsyncIOMotorClient

client: AsyncIOMotorClient = None
db = None

async def connect_to_mongo(uri: str, db_name: str):
    global client, db
    if uri and db_name:
        client = AsyncIOMotorClient(uri)
        db = client[db_name]
        print(f"Connected to MongoDB database: {db_name}")
    else:
        print("Warning: MongoDB credentials not provided.")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    return db
