from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    try:
        # Add a server selection timeout to fail fast if DB is down
        db.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verify connection
        await db.client.admin.command('ping')
        db.db = db.client[settings.MONGO_DB_NAME]
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB. Error: {e}")
        # Re-raise the exception so the app fails to start if DB is required
        raise e

async def close_mongo_connection():
    if db.client is not None:
        db.client.close()
        print("Closed MongoDB connection.")

def get_database():
    return db.db
