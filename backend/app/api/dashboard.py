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
    
    # 1. Student Information
    total_students = await db["students"].count_documents({"is_deleted": {"$ne": True}})
    
    # Calculate unique placed students from the placed_students collection
    placed_cursor = db["placed_students"].find({})
    placed_students_list = await placed_cursor.to_list(length=10000)
    unique_placed_rolls = list(set([s.get("roll_no") for s in placed_students_list if s.get("roll_no")]))
    
    placed_students_count = len(unique_placed_rolls)
    not_placed = total_students - placed_students_count if total_students > placed_students_count else 0
    
    # Calculate Average CTC
    ctcs = []
    for p in placed_students_list:
        try:
            val = float(p.get('ctc_lpa', 0))
            if val > 0: ctcs.append(val)
        except (ValueError, TypeError):
            pass
    avg_ctc = sum(ctcs) / len(ctcs) if ctcs else 0.0

    student_info = {
        "total": total_students,
        "registered": total_students, 
        "placed": placed_students_count,
        "not_placed": not_placed,
        "avg_ctc": round(avg_ctc, 2),
        "pending_interviews": 0 # Not tracked in DB currently
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
            "status": "Placed" if s.get("roll_no") in unique_placed_rolls else "Pending"
        })

    # 2. Placement Team Members
    team_cursor = db["users"].find({"role": {"$in": ["Manager", "manager", "placement_lead", "Member", "Analyst"]}})
    team_members = await team_cursor.to_list(length=10)
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
    company_cursor = db["companies"].find({})
    companies = await company_cursor.to_list(length=20)
    
    company_data = []
    for c in companies:
        c_id = str(c.get("_id"))
        selected = c.get("selected_count", 0)
        appeared = c.get("appeared_count", 0) # Fallback to 0 if not tracking applications yet
        
        company_data.append({
            "name": c.get("name"),
            "location": c.get("location"),
            "contact": c.get("contact_person", "N/A"),
            "appeared": appeared,
            "selected": selected,
            "ctc": float(c.get("ctc", 0)) if c.get("ctc") else 0.0
        })
        
    return {
        "student_info": student_info,
        "students_list": students_data,
        "team_members": team_data,
        "companies": company_data,
        "monthly_placements": [] # No real date tracking for placements yet
    }
