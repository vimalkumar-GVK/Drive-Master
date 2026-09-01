from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import get_database
from app.api.deps import require_role, get_current_user
from app.models.user import UserInDB, RoleEnum
from app.models.approval import (
    ApprovalRequestCreate,
    ApprovalRequest,
    ApprovalStatus,
    RequestTypeEnum,
    ApprovalAction
)

router = APIRouter()

class ActionRequest(BaseModel):
    approvalId: str
    action: str # "APPROVE" or "REJECT"
    remarks: Optional[str] = None

@router.post("/request", response_model=ApprovalRequest)
async def create_approval_request(
    request_data: ApprovalRequestCreate,
    current_user: UserInDB = Depends(require_role([RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # 1. Prevent duplicate pending requests for the same company and type (unless it's a new verification)
    # Actually, user requested: "db.approvals.find_one({companyId: X, status: {'$in': ['PENDING_MANAGER', 'PENDING_ADMIN']}})"
    existing = await db.approvals.find_one({
        "companyId": request_data.companyId,
        "status": {"$in": [ApprovalStatus.PENDING_MANAGER.value, ApprovalStatus.PENDING_ADMIN.value]}
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already pending approval"
        )
        
    # 2. Delete any old REJECTED records for the same company + same requestType to allow re-request
    await db.approvals.delete_many({
        "companyId": request_data.companyId,
        "type": request_data.type.value,
        "status": {"$in": [ApprovalStatus.REJECTED_BY_MANAGER.value, ApprovalStatus.REJECTED_BY_ADMIN.value]}
    })
    
    # 3. Create the new request
    new_request_dict = request_data.model_dump()
    new_request_dict["requestedBy"] = str(current_user.id)
    new_request_dict["status"] = ApprovalStatus.PENDING_MANAGER.value
    new_request_dict["createdAt"] = datetime.utcnow()
    
    result = await db.approvals.insert_one(new_request_dict)
    new_request_dict["_id"] = str(result.inserted_id)
    
    # Update company approval_status (and verification_status for backward compat)
    update_data = {
        "approval_status": ApprovalStatus.PENDING_MANAGER.value,
        "updated_at": datetime.utcnow()
    }
    if request_data.type != RequestTypeEnum.COMPANY_CREATION:
        update_data["verification_status"] = ApprovalStatus.PENDING_MANAGER.value
        
    await db.companies.update_one(
        {"_id": ObjectId(request_data.companyId)},
        {"$set": update_data}
    )
    
    return new_request_dict

@router.post("/manager/action")
async def manager_action(
    action_req: ActionRequest,
    current_user: UserInDB = Depends(require_role([RoleEnum.MANAGER, RoleEnum.ADMIN]))
):
    db = get_database()
    req = await db.approvals.find_one({"_id": ObjectId(action_req.approvalId)})
    
    if not req:
        raise HTTPException(status_code=404, detail="Approval Request not found")
        
    if req["status"] != ApprovalStatus.PENDING_MANAGER.value:
        raise HTTPException(status_code=400, detail="Request is not pending manager approval")
        
    if action_req.action == "REJECT" and not action_req.remarks:
        raise HTTPException(status_code=400, detail="Remarks are required for rejection")
        
    action_record = {
        "by": current_user.name,
        "at": datetime.utcnow(),
        "remarks": action_req.remarks
    }
    
    new_status = ApprovalStatus.APPROVED_GLOBALLY.value if action_req.action == "APPROVE" else ApprovalStatus.REJECTED_BY_MANAGER.value
    
    await db.approvals.update_one(
        {"_id": ObjectId(action_req.approvalId)},
        {
            "$set": {
                "status": new_status,
                "managerAction": action_record,
            }
        }
    )
    
    update_data = {
        "approval_status": new_status,
        "updated_at": datetime.utcnow()
    }
    
    if action_req.action == "APPROVE":
        if req["type"] == RequestTypeEnum.COMPANY_CREATION.value:
            update_data["isActive"] = True
            update_data["isGloballyApproved"] = True
        else:
            update_data["isVerified"] = True
            update_data["verification_status"] = new_status
    else:
        if req["type"] != RequestTypeEnum.COMPANY_CREATION.value:
            update_data["verification_status"] = new_status
        
    await db.companies.update_one(
        {"_id": ObjectId(req["companyId"])},
        {"$set": update_data}
    )
    
    return {"message": f"Successfully {action_req.action}d by manager."}

@router.post("/admin/action")
async def admin_action(
    action_req: ActionRequest,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    req = await db.approvals.find_one({"_id": ObjectId(action_req.approvalId)})
    
    if not req:
        raise HTTPException(status_code=404, detail="Approval Request not found")
        
    if req["status"] != ApprovalStatus.PENDING_ADMIN.value:
        raise HTTPException(status_code=400, detail="Request is not pending admin approval")
        
    if action_req.action == "REJECT" and not action_req.remarks:
        raise HTTPException(status_code=400, detail="Remarks are required for rejection")
        
    action_record = {
        "by": current_user.name,
        "at": datetime.utcnow(),
        "remarks": action_req.remarks
    }
    
    new_status = ApprovalStatus.APPROVED_GLOBALLY.value if action_req.action == "APPROVE" else ApprovalStatus.REJECTED_BY_ADMIN.value
    
    await db.approvals.update_one(
        {"_id": ObjectId(action_req.approvalId)},
        {
            "$set": {
                "status": new_status,
                "adminAction": action_record,
            }
        }
    )
    
    update_company = {
        "approval_status": new_status,
        "updated_at": datetime.utcnow()
    }
    
    if action_req.action == "APPROVE":
        if req["type"] == RequestTypeEnum.COMPANY_CREATION.value:
            update_company["isActive"] = True
            update_company["isGloballyApproved"] = True
        else:
            update_company["isVerified"] = True
            update_company["verification_status"] = new_status
    else:
        if req["type"] != RequestTypeEnum.COMPANY_CREATION.value:
             update_company["verification_status"] = new_status
            
    await db.companies.update_one(
        {"_id": ObjectId(req["companyId"])},
        {"$set": update_company}
    )
    
    return {"message": f"Successfully {action_req.action}d by admin."}

@router.get("/list")
async def list_approvals(
    role: str = None,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    query = {}
    
    target_role = role or current_user.role.value
    
    if target_role == RoleEnum.PLACEMENT_LEAD.value:
        query = {"requestedBy": str(current_user.id)}
    elif target_role == RoleEnum.MANAGER.value:
        query = {"status": {"$in": [
            ApprovalStatus.PENDING_MANAGER.value,
            ApprovalStatus.PENDING_ADMIN.value,
            ApprovalStatus.REJECTED_BY_MANAGER.value,
            ApprovalStatus.APPROVED_GLOBALLY.value
        ]}}
    elif target_role == RoleEnum.ADMIN.value:
        query = {}
        
    cursor = db.approvals.find(query).sort("createdAt", -1)
    docs = await cursor.to_list(length=200)
    
    results = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        company = await db.companies.find_one({"_id": ObjectId(d["companyId"])})
        if company:
            d["companyName"] = company.get("name", "Unknown")
        else:
            d["companyName"] = d.get("companyData", {}).get("name", "Unknown")
        results.append(d)
        
    pending = []
    history = []
    
    for req in results:
        status_val = req.get("status")
        if status_val in [ApprovalStatus.PENDING_MANAGER.value, ApprovalStatus.PENDING_ADMIN.value]:
            pending.append(req)
        else:
            history.append(req)
            
    return {"pending": pending, "history": history}

@router.get("/pending-count")
async def get_pending_count(
    role: str = None,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    target_role = role or current_user.role.value
    
    if target_role == RoleEnum.PLACEMENT_LEAD.value:
        return {"count": 0} # Leads don't approve
    elif target_role == RoleEnum.MANAGER.value:
        count = await db.approvals.count_documents({"status": ApprovalStatus.PENDING_MANAGER.value})
        return {"count": count}
    elif target_role == RoleEnum.ADMIN.value:
        count = await db.approvals.count_documents({"status": ApprovalStatus.PENDING_ADMIN.value})
        return {"count": count}
        
    return {"count": 0}
