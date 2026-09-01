import os
import json
from pymongo import MongoClient
from bson import json_util
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["placement_ai"]

def main():
    print("1. Backing up verification_requests...")
    verifications = list(db.verification_requests.find({}))
    backup_file = os.path.join(os.path.dirname(__file__), "backup_verification_requests.json")
    
    with open(backup_file, 'w') as f:
        json.dump(verifications, f, default=json_util.default, indent=2)
    print(f"Backed up {len(verifications)} records to {backup_file}")
    
    print("2. Migrating to approvals collection...")
    approvals = []
    for v in verifications:
        new_app = {
            "type": v.get("requestType"),
            "companyId": str(v.get("companyId")),
            "companyData": {}, # No company data for verification requests
            "requestedBy": v.get("requestedBy"),
            "status": v.get("status"),
            "managerAction": v.get("managerAction"),
            "adminAction": v.get("adminAction"),
            "createdAt": v.get("created_at") or v.get("createdAt")
        }
        approvals.append(new_app)
        
    if approvals:
        db.approvals.insert_many(approvals)
        print(f"Inserted {len(approvals)} records into approvals collection")
    else:
        print("No records to migrate.")
        
    count_ver = len(verifications)
    count_app = db.approvals.count_documents({})
    print(f"Verification requests backed up: {count_ver}, Total Approvals in DB: {count_app}")
    
    print("3. Updating existing companies...")
    result = db.companies.update_many(
        {"isActive": {"$exists": False}},
        {"$set": {
            "isActive": True,
            "isGloballyApproved": True,
            "approval_status": "APPROVED_GLOBALLY"
        }}
    )
    print(f"Updated {result.modified_count} existing companies.")
    
    print("Migration complete!")

if __name__ == "__main__":
    main()
