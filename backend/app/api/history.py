from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.api.deps import get_current_user
from app.models.user import UserInDB
from app.services.history_service import undo_last_action, redo_last_action

router = APIRouter()

@router.post("/undo")
async def undo_action(current_user: UserInDB = Depends(get_current_user)):
    user_id = str(current_user.id) if hasattr(current_user, 'id') else current_user.email
    result = await undo_last_action(user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/redo")
async def redo_action(current_user: UserInDB = Depends(get_current_user)):
    user_id = str(current_user.id) if hasattr(current_user, 'id') else current_user.email
    result = await redo_last_action(user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/status")
async def check_history_status(current_user: UserInDB = Depends(get_current_user)):
    from app.db.mongodb import get_database
    from datetime import datetime, timedelta
    
    db = get_database()
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    user_id = str(current_user.id) if hasattr(current_user, 'id') else current_user.email
    
    has_undo = await db["action_logs"].find_one(
        {"user_id": user_id, "status": "ACTIVE", "timestamp": {"$gte": five_mins_ago}}
    )
    
    has_redo = await db["action_logs"].find_one(
        {"user_id": user_id, "status": "UNDONE", "timestamp": {"$gte": five_mins_ago}}
    )
    
    return {
        "can_undo": bool(has_undo),
        "can_redo": bool(has_redo)
    }
