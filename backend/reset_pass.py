import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import get_password_hash

async def main():
    try:
        client = AsyncIOMotorClient('mongodb+srv://VimalkumarDB:Vimal%406789%23@vimal.dhoycqt.mongodb.net/?appName=Vimal')
        db = client['placement_ai']
        
        # New password
        new_password = 'AdminPassword123!'
        hashed = get_password_hash(new_password)
        
        result = await db['users'].update_one(
            {'email': 'vimalkumarg2366@gmail.com'},
            {'$set': {'hashed_password': hashed}}
        )
        print(f'Password updated. Modified count: {result.modified_count}')
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(main())
