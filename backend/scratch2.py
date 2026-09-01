import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def migrate_users():
    client = AsyncIOMotorClient('mongodb+srv://VimalkumarDB:Vimal%406789%23@vimal.dhoycqt.mongodb.net/?appName=Vimal')
    db = client['placement_ai']
    
    admin_id_str = "6a944aca5300614bda15e7b1"
    
    # Update Placement Leed to have createdBy = admin
    res = await db.users.update_many(
        {"role": {"$nin": ["admin", "ADMIN", "student", "Student"]}, "createdBy": {"$exists": False}},
        {"$set": {"createdBy": admin_id_str}}
    )
    print(f"Updated {res.modified_count} users to have createdBy={admin_id_str}")
    
    # Also verify that the admin has themselves accessible
    res2 = await db.users.update_many(
        {"_id": ObjectId(admin_id_str), "createdBy": {"$exists": False}},
        {"$set": {"createdBy": admin_id_str}}
    )
    print(f"Updated {res2.modified_count} admins to have createdBy themselves")
    
    client.close()

asyncio.run(migrate_users())
