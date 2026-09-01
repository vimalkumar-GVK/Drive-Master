from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from bson import ObjectId
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.models.user import UserInDB, RoleEnum
from app.core.security import get_password_hash
from app.services.history_service import log_action
from datetime import datetime
import uuid

router = APIRouter()

class AddMemberRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str
    access_levels: List[str]

@router.get("/members")
async def get_team_members(current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))):
    db = get_database()
    current_user_doc = await db["users"].find_one({"_id": ObjectId(current_user.id)})
    if not current_user_doc:
        return {"members": []}
        
    query = {}
    
    if current_user.role == RoleEnum.PLACEMENT_LEAD:
        admin_id = current_user_doc.get("createdBy") or current_user_doc.get("college_id")
        if admin_id:
            query = {"$or": [
                {"college_id": admin_id}, 
                {"createdBy": admin_id}, 
                {"_id": ObjectId(admin_id) if isinstance(admin_id, str) and len(admin_id)==24 else admin_id}
            ]}
    elif current_user.role == RoleEnum.ADMIN:
        current_id_str = str(current_user.id)
        query = {"$or": [
            {"college_id": current_id_str}, 
            {"createdBy": current_id_str}, 
            {"_id": ObjectId(current_user.id)}
        ]}
    elif current_user.role == RoleEnum.MANAGER:
        college_id = current_user_doc.get("college_id")
        if college_id:
            query = {"college_id": college_id}
        
    if not query:
        query = {"role": {"$nin": ["student", "Student"]}}
        
    users = await db["users"].find(query).to_list(length=100)
    
    result = []
    for u in users:
        role = u.get("role", "").lower()
        if role == "student":
            continue
            
        full_name = u.get("full_name") or u.get("name") or "Unknown"
        avatar_initials = "".join([part[0] for part in full_name.split() if part])[:2].upper()
        if not avatar_initials:
            avatar_initials = "U"
            
        is_you = str(u.get("_id")) == str(current_user.id)
        
        result.append({
            "_id": str(u.get("_id")),
            "name": full_name,
            "username": u.get("username") or u.get("email") or "",
            "role": u.get("role", ""),
            "avatar_initials": avatar_initials,
            "isYou": is_you,
            "isOnline": True
        })
        
    role_order = {"admin": 1, "manager": 2, "placement_lead": 3}
    
    def get_sort_key(member):
        is_you_score = 0 if member["isYou"] else 1
        role_score = role_order.get(member["role"].lower(), 99)
        return (is_you_score, role_score, member["name"])
        
    result.sort(key=get_sort_key)
    
    return {"members": result}

@router.post("/members")
async def add_team_member(
    req: AddMemberRequest,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    
    # Check if user already exists
    existing = await db["users"].find_one({"email": req.email})
    if existing:
        return {"message": "User already exists", "user": {"email": req.email}}

    current_user_doc = await db["users"].find_one({"_id": ObjectId(current_user.id)})
    
    new_user = {
        "email": req.email,
        "name": req.full_name,
        "full_name": req.full_name,
        "role": req.role,
        "access_levels": req.access_levels,
        "hashed_password": get_password_hash(req.password),
        "created_at": datetime.utcnow(),
        "createdBy": str(current_user.id),
        "college_id": current_user_doc.get("college_id") if current_user_doc else None
    }
    inserted_id = await db["users"].insert_one(new_user)
    
    # Remove _id for JSON serialization
    new_user.pop("_id", None)
    
    await log_action(
        user_id=current_user.email,
        collection_name="users",
        action="CREATE",
        document_id=req.email,
        previous_data=None,
        new_data=new_user
    )
    
    return {"message": "Team member added successfully", "user": new_user}

class UpdateMemberRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    access_levels: Optional[List[str]] = None

@router.put("/members/{email}")
async def update_team_member(
    email: str,
    req: UpdateMemberRequest,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    update_data = {}
    if req.full_name is not None:
        update_data["full_name"] = req.full_name
        update_data["name"] = req.full_name
    if req.role is not None:
        update_data["role"] = req.role
    if req.access_levels is not None:
        update_data["access_levels"] = req.access_levels
        
    if not update_data:
        return {"message": "No data to update"}
        
    existing_user = await db["users"].find_one({"email": email})
    if not existing_user:
        return {"message": "User not found"}
        
    result = await db["users"].update_one(
        {"email": email},
        {"$set": update_data}
    )
    
    updated_user = await db["users"].find_one({"email": email})
    
    await log_action(
        user_id=current_user.email,
        collection_name="users",
        action="UPDATE",
        document_id=email,
        previous_data=existing_user,
        new_data=updated_user
    )
        
    return {"message": "Team member updated successfully"}

@router.delete("/members/{email}")
async def delete_team_member(
    email: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    
    existing_user = await db["users"].find_one({"email": email})
    if not existing_user:
        return {"message": "User not found"}
        
    result = await db["users"].delete_one({"email": email})
    
    await log_action(
        user_id=current_user.email,
        collection_name="users",
        action="DELETE",
        document_id=email,
        previous_data=existing_user,
        new_data=None
    )
        
    return {"message": "Team member deleted successfully"}

@router.get("/workflow")
async def get_team_workflow(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Fetch companies to build workflow
    company_cursor = db["companies"].find({})
    companies = await company_cursor.to_list(length=100)
    
    # Fetch all placed students to calculate correct counts
    placed_cursor = db["placed_students"].find({})
    placed_docs = await placed_cursor.to_list(length=10000)
    
    placed_counts = {}
    for doc in placed_docs:
        cid = str(doc.get("company_id", ""))
        if cid:
            placed_counts[cid] = placed_counts.get(cid, 0) + 1
    
    workflow_data = {
        "cold": [],
        "warm": [],
        "hot": [],
        "completed": []
    }
    
    for c in companies:
        c_id = str(c["_id"])
        status = c.get("status", "cold").lower()
        if status == "drive completed":
            status = "completed"
        
        card = {
            "id": c_id,
            "company": c.get("name", "Unknown"),
            "assigned_name": c.get("assigned_to_name", "Unassigned"),
            "assigned_role": c.get("assigned_to_role", "-"),
            "has_jd": c.get("has_jd", False),
            "students_placed": placed_counts.get(c_id, 0),
            "location": c.get("location", ""),
            "website": c.get("website", ""),
            "size": c.get("size", ""),
            "contact_person": c.get("contact_person", ""),
            "email": c.get("email", ""),
            "phone": c.get("phone", ""),
            "address": c.get("address", ""),
            "map_url": c.get("map_url", ""),
            "ctc_lpa": c.get("ctc_lpa", ""),
            "created_by": c.get("created_by")
        }
        
        if status in workflow_data:
            workflow_data[status].append(card)
        else:
            workflow_data["cold"].append(card)
            
    # If no companies in DB, return empty workflow
            
    # Get recently added members from users collection (case-insensitive role match)
    user_cursor = db["users"].find(
        {"role": {"$regex": "^(manager|placement_lead|member|analyst)$", "$options": "i"}}
    ).sort("_id", -1).limit(8)
    users = await user_cursor.to_list(length=8)
    
    recent_members = []
    for u in users:
        email = u.get("email", "default")
        name = u.get("name") or u.get("full_name") or email
        recent_members.append({
            "id": str(u["_id"]),
            "name": name,
            "role": u.get("role", ""),
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={email}&backgroundColor=6366f1,8b5cf6,06b6d4"
        })
    
    return {
        "workflow": workflow_data,
        "recent_members": recent_members
    }

@router.get("/companies/{company_id}/placed_students")
async def get_company_placed_students(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # 1. Fetch the company details
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    company_name = company.get("name", "Unknown") if company else "Unknown"

    # 2. Get all placed students for this company
    placed_cursor = db["placed_students"].find({"company_id": company_id})
    placed_docs = await placed_cursor.to_list(length=1000)
    roll_nos = [doc["roll_no"] for doc in placed_docs if "roll_no" in doc]

    if not roll_nos:
        return {"company": company_name, "students": []}

    # 3. Fetch student details for these roll nos
    students_cursor = db["students"].find({"roll_no": {"$in": roll_nos}})
    students = await students_cursor.to_list(length=1000)
    
    # Create a mapping of roll_no -> placed_doc for easy lookup
    placed_map = {doc["roll_no"]: doc for doc in placed_docs if "roll_no" in doc}
    company_ctc = company.get("ctc_lpa", "N/A") if company else "N/A"
    
    for s in students:
        s["_id"] = str(s["_id"])
        # Always reflect the latest company CTC 
        s["ctc_lpa"] = company_ctc
        
    return {"company": company_name, "students": students}
