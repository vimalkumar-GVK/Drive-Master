import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client[os.getenv('MONGO_DB_NAME')]
    
    docs = await db.students.find().to_list(1000)
    seen_names = set()
    duplicates_to_delete = []
    
    for s in docs:
        name = s.get("name")
        if name in seen_names:
            duplicates_to_delete.append(s.get("_id"))
        else:
            seen_names.add(name)
            
    print(f"Found {len(duplicates_to_delete)} duplicates by name")
    if duplicates_to_delete:
        res = await db.students.delete_many({"_id": {"$in": duplicates_to_delete}})
        print(f"Deleted {res.deleted_count} duplicates")

asyncio.run(run())
