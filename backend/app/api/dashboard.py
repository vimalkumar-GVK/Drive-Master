from fastapi import APIRouter, Depends
from app.db.mongodb import get_database
from app.api.deps import require_role, get_current_user
from app.models.user import UserInDB, RoleEnum

router = APIRouter()

@router.get("/admin/metrics")
async def get_admin_dashboard_metrics(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Fetch companies to use for fallbacks
    company_cursor = db["companies"].find({})
    companies = await company_cursor.to_list(length=100)
    
    # 1. Student Information
    total_students = await db["students"].count_documents({"is_deleted": {"$ne": True}})
    
    # Calculate unique placed students from the active companies' placedStudents array
    company_cursor = db["companies"].find({"isActive": True})
    active_companies = await company_cursor.to_list(length=100)
    
    all_placed = []
    for c in active_companies:
        all_placed.extend(c.get("placedStudents", []))
        
    unique_placed_rolls = list(set([str(r).strip().upper() for r in all_placed if r]))
    
    placed_students_count = len(unique_placed_rolls)
    if placed_students_count == 0:
        # Fallback to sum of selected_count across all companies
        placed_students_count = sum(c.get("selected_count", 0) for c in companies)
        
    not_placed = total_students - placed_students_count if total_students > placed_students_count else 0
    
    # Calculate Average CTC
    ctcs = []
    for c in active_companies:
        placed = c.get("placedStudents", [])
        if placed:
            try:
                val_str = str(c.get('ctc_lpa', '0')).lower().replace("lpa", "").strip()
                val = float(val_str)
                if val > 0:
                    ctcs.extend([val] * len(placed))
            except (ValueError, TypeError):
                pass
            
    if not ctcs:
        # Fallback to companies ctc_lpa
        for c in companies:
            try:
                val = float(str(c.get("ctc_lpa", "0")).lower().replace("lpa", "").strip())
                if val > 0: ctcs.append(val)
            except (ValueError, TypeError):
                pass
                
    avg_ctc = sum(ctcs) / len(ctcs) if ctcs else 0.0

    from datetime import datetime, timedelta
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    pending_query = {
        "status": {"$nin": ["DRIVE_COMPLETED"]},
        "isActive": True
    }
    
    if current_user.role == RoleEnum.PLACEMENT_LEAD:
        pending_query = {
            "status": {"$nin": ["DRIVE_COMPLETED"]},
            "$or": [
                {"isActive": True},
                {"created_by.email": current_user.email}
            ]
        }
        
    pending_interviews_count = await db["companies"].count_documents(pending_query)
    
    pending_week_query = pending_query.copy()
    pending_week_query["created_at"] = {"$gte": start_of_week}
    
    pending_this_week = await db["companies"].count_documents(pending_week_query)

    student_info = {
        "total": total_students,
        "registered": total_students, 
        "placed": placed_students_count,
        "not_placed": not_placed,
        "avg_ctc": round(avg_ctc, 2),
        "pending_interviews": pending_interviews_count,
        "pending_this_week": pending_this_week
    }
    
    # Fetch real students for the table
    students_cursor = db["students"].find({"is_deleted": {"$ne": True}}).sort("_id", -1).limit(100)
    recent_students = await students_cursor.to_list(length=100)
    students_data = []
    for s in recent_students:
        students_data.append({
            "roll_no": s.get("roll_no", ""),
            "name": s.get("name", ""),
            "department": s.get("department", ""),
            "email": s.get("email", ""),
            "phone": s.get("phone", ""),
            "status": "Placed" if str(s.get("roll_no", "")).strip().upper() in unique_placed_rolls else "YTBP"
        })

    # 2. Placement Team Members (Including Admins, excluding self)
    team_cursor = db["users"].find({
        "role": {"$nin": ["student", "Student"]},
        "email": {"$ne": current_user.email}
    })
    team_members = await team_cursor.to_list(length=1000)
    team_data = [
        {
            "name": user.get("full_name", user.get("email", "").split("@")[0]), 
            "role": user.get("role", "Member"), 
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={user.get('email')}",
            "email": user.get("email", "")
        }
        for user in team_members
    ]
    
    # 3. Companies List
    company_data = []
    for c in companies:
        c_id = str(c.get("_id"))
        placed = c.get("placedStudents", [])
        
        selected = len(placed)
        if selected == 0:
            selected = c.get("selected_count", 0)
            
        appeared = c.get("registered_count", 0)
        if appeared < selected:
            appeared = selected # Fallback to selected if appeared is lower
            
        try:
            avg_comp_ctc = float(str(c.get("ctc_lpa", "0")).lower().replace("lpa", "").strip())
        except (ValueError, TypeError):
            avg_comp_ctc = 0.0
        
        company_data.append({
            "name": c.get("name"),
            "location": c.get("location"),
            "contact": c.get("contact_person", "N/A"),
            "appeared": appeared,
            "selected": selected,
            "ctc": round(avg_comp_ctc, 2)
        })
        
    return {
        "student_info": student_info,
        "students_list": students_data,
        "team_members": team_data,
        "companies": company_data,
        "monthly_placements": [] # No real date tracking for placements yet
    }
