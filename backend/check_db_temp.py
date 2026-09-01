import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    try:
        client = AsyncIOMotorClient('mongodb+srv://VimalkumarDB:Vimal%406789%23@vimal.dhoycqt.mongodb.net/?appName=Vimal')
        db = client['placement_ai']
        users = await db['users'].find().to_list(100)
        print(f'Found {len(users)} users:')
        for u in users:
            print(f'Email: {u.get("email")}, Role: {u.get("role")}')
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(main())
