import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client[os.getenv('MONGO_DB_NAME')]
    
    docs = await db.students.find().to_list(1000)
    names = {}
    for s in docs:
        name = s.get("name")
        if name not in names:
            names[name] = []
        names[name].append(s)
        
    for name, entries in names.items():
        if len(entries) > 1:
            print(f"Duplicate {name} ({len(entries)} entries)")
            for e in entries:
                print(f"  - Roll No: {e.get('roll_no')}, is_deleted: {e.get('is_deleted')}")

asyncio.run(run())
