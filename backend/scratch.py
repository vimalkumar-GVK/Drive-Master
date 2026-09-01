import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient('mongodb+srv://VimalkumarDB:Vimal%406789%23@vimal.dhoycqt.mongodb.net/?appName=Vimal')
    db = client['placement_ai']
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"Role: {u.get('role')} | college_id: {u.get('college_id')} | createdBy: {u.get('createdBy')} | _id: {u.get('_id')} | name: {u.get('name')}")
    client.close()

asyncio.run(test())
