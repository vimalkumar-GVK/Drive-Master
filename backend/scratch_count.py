import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db_name = os.getenv("MONGO_DB_NAME")
    
    print(f"Connecting to {mongo_uri} / {mongo_db_name}")
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
    db = client[mongo_db_name]
    
    print("Companies count:", await db.companies.count_documents({}))
    
asyncio.run(main())
