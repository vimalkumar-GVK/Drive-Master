import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

async def migrate_added_by():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.placement_ai
    
    companies = await db.companies.find({
        "$or": [
            {"createdByName": {"$exists": False}},
            {"createdByName": "Admin User"},
            {"createdByName": "Portal User"},
            {"createdByRole": {"$exists": False}}
        ]
    }).to_list(length=1000)
    
    print(f"Found {len(companies)} companies to update...")
    
    updated_count = 0
    for company in companies:
        creator = None
        
        # 1. Try to find the user in DB by ID
        if "createdBy" in company and company["createdBy"]:
            from bson import ObjectId
            try:
                creator = await db.users.find_one({"_id": ObjectId(company["createdBy"])})
            except Exception:
                pass
        
        # 2. Fallback try to find user by email
        if not creator and "created_by" in company and "email" in company["created_by"]:
            creator = await db.users.find_one({"email": company["created_by"]["email"]})
            
        if creator:
            new_name = creator.get("full_name") or creator.get("name") or creator.get("email")
            new_role = creator.get("role", "PLACEMENT_LEAD").upper()
            new_email = creator.get("email")
        else:
            # 3. If no user in DB, use the requested fallback logic
            existing_nested = company.get("created_by", {})
            new_name = company.get("createdByName") or existing_nested.get("name") or "Unknown User"
            
            existing_role = company.get("createdByRole") or existing_nested.get("role") or ""
            if existing_role.upper() == "ADMIN":
                new_role = "ADMIN"
            elif existing_role.upper() == "MANAGER":
                new_role = "MANAGER"
            else:
                new_role = "PLACEMENT_LEAD"
                
            new_email = company.get("createdByEmail") or existing_nested.get("email") or ""
            
            if new_name == "Admin User" or new_name == "Portal User":
                new_role = "ADMIN" # Default back to admin if name suggests it

        await db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {
                "createdByName": new_name,
                "createdByRole": new_role,
                "createdByEmail": new_email
            }}
        )
        updated_count += 1
        print(f"Updated company {company.get('name')} -> Added by: {new_name} ({new_role})")
            
    print(f"Successfully updated {updated_count} companies.")

if __name__ == "__main__":
    asyncio.run(migrate_added_by())
