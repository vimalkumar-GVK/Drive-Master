from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.models.user import UserInDB, RoleEnum
import pandas as pd
import io
from datetime import datetime
from bson import ObjectId

router = APIRouter()

def create_excel_response(df: pd.DataFrame, filename: str):
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Report")
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(
        buffer, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.get("/export/companies")
async def export_companies(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    companies = await db["companies"].find({}).to_list(length=1000)
    
    if not companies:
        raise HTTPException(status_code=404, detail="No companies found")
        
    data = []
    for i, c in enumerate(companies):
        data.append({
            "S.No": i + 1,
            "Company Name": c.get("name"),
            "Location": c.get("location"),
            "Website": c.get("website"),
            "Contact Person": c.get("contact_person"),
            "Phone": c.get("phone"),
            "Email": c.get("email"),
            "Size": c.get("size"),
            "Status": c.get("status"),
            "Selected Count": c.get("selected_count", 0)
        })
        
    df = pd.DataFrame(data)
    filename = f"Companies_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/export/students/all")
async def export_all_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    students = await db["students"].find({"is_deleted": {"$ne": True}}).to_list(length=5000)
    
    if not students:
        raise HTTPException(status_code=404, detail="No students found")
        
    data = []
    for i, s in enumerate(students):
        data.append({
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "Gender": s.get("gender"),
            "Accommodation": s.get("accommodation"),
            "SSLC %": s.get("sslc_percentage"),
            "HSC %": s.get("hsc_percentage"),
            "UG %": s.get("ug_percentage"),
            "Email": s.get("email"),
            "Phone": s.get("phone")
        })
        
    df = pd.DataFrame(data)
    filename = f"Overall_Students_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/export/students/placed")
async def export_placed_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    placed = await db["placed_students"].find({}).to_list(length=5000)
    
    if not placed:
        raise HTTPException(status_code=404, detail="No placed students found")
        
    # Standardize output
    data = []
    for i, p in enumerate(placed):
        data.append({
            "S.No": i + 1,
            "Roll No": p.get("roll_no"),
            "Name": p.get("name"),
            "Department": p.get("department"),
            "Company": p.get("company_name"),
            "CTC (LPA)": p.get("ctc_lpa")
        })
        
    df = pd.DataFrame(data)
    filename = f"Selected_Students_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/export/students/unplaced")
async def export_unplaced_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Get all roll numbers that are placed
    placed = await db["placed_students"].find({}, {"roll_no": 1}).to_list(length=5000)
    placed_roll_nos = [p.get("roll_no") for p in placed if p.get("roll_no")]
    
    # Query students NOT in placed_roll_nos
    unplaced_students = await db["students"].find({
        "is_deleted": {"$ne": True},
        "roll_no": {"$nin": placed_roll_nos}
    }).to_list(length=5000)
    
    if not unplaced_students:
        raise HTTPException(status_code=404, detail="No unplaced students found")
        
    data = []
    for i, s in enumerate(unplaced_students):
        data.append({
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "SSLC %": s.get("sslc_percentage"),
            "HSC %": s.get("hsc_percentage"),
            "UG %": s.get("ug_percentage"),
            "Email": s.get("email"),
            "Phone": s.get("phone")
        })
        
    df = pd.DataFrame(data)
    filename = f"Unplaced_Students_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/export/students/company/{company_id}")
async def export_company_students(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    placed = await db["placed_students"].find({"company_id": company_id}).to_list(length=5000)
    
    if not placed:
        raise HTTPException(status_code=404, detail="No selected students found for this company")
        
    data = []
    company_name = placed[0].get("company_name", "Company") if placed else "Company"
    
    for i, p in enumerate(placed):
        data.append({
            "S.No": i + 1,
            "Roll No": p.get("roll_no"),
            "Name": p.get("name"),
            "Department": p.get("department"),
            "Company": p.get("company_name"),
            "CTC (LPA)": p.get("ctc_lpa")
        })
        
    df = pd.DataFrame(data)
    filename = f"Selected_Students_{company_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/preview/companies")
async def preview_companies(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    companies = await db["companies"].find({}).to_list(length=1000)
    
    if not companies:
        raise HTTPException(status_code=404, detail="No companies found")
        
    data = []
    for i, c in enumerate(companies):
        data.append({
            "S.No": i + 1,
            "Company Name": c.get("name"),
            "Location": c.get("location"),
            "Website": c.get("website"),
            "Contact Person": c.get("contact_person"),
            "Phone": c.get("phone"),
            "Email": c.get("email"),
            "Size": c.get("size"),
            "Status": c.get("status"),
            "Selected Count": c.get("selected_count", 0)
        })
        
    
    if not data:
        return {"columns": [], "data": []}
    return {"columns": list(data[0].keys()), "data": data}

@router.get("/preview/students/all")
async def preview_all_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    students = await db["students"].find({"is_deleted": {"$ne": True}}).to_list(length=5000)
    
    if not students:
        raise HTTPException(status_code=404, detail="No students found")
        
    data = []
    for i, s in enumerate(students):
        data.append({
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "Gender": s.get("gender"),
            "Accommodation": s.get("accommodation"),
            "SSLC %": s.get("sslc_percentage"),
            "HSC %": s.get("hsc_percentage"),
            "UG %": s.get("ug_percentage"),
            "Email": s.get("email"),
            "Phone": s.get("phone")
        })
        
    
    if not data:
        return {"columns": [], "data": []}
    return {"columns": list(data[0].keys()), "data": data}

@router.get("/preview/students/placed")
async def preview_placed_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    placed = await db["placed_students"].find({}).to_list(length=5000)
    
    if not placed:
        raise HTTPException(status_code=404, detail="No placed students found")
        
    # Standardize output
    data = []
    for i, p in enumerate(placed):
        data.append({
            "S.No": i + 1,
            "Roll No": p.get("roll_no"),
            "Name": p.get("name"),
            "Department": p.get("department"),
            "Company": p.get("company_name"),
            "CTC (LPA)": p.get("ctc_lpa")
        })
        
    
    if not data:
        return {"columns": [], "data": []}
    return {"columns": list(data[0].keys()), "data": data}

@router.get("/preview/students/unplaced")
async def preview_unplaced_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Get all roll numbers that are placed
    placed = await db["placed_students"].find({}, {"roll_no": 1}).to_list(length=5000)
    placed_roll_nos = [p.get("roll_no") for p in placed if p.get("roll_no")]
    
    # Query students NOT in placed_roll_nos
    unplaced_students = await db["students"].find({
        "is_deleted": {"$ne": True},
        "roll_no": {"$nin": placed_roll_nos}
    }).to_list(length=5000)
    
    if not unplaced_students:
        raise HTTPException(status_code=404, detail="No unplaced students found")
        
    data = []
    for i, s in enumerate(unplaced_students):
        data.append({
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "SSLC %": s.get("sslc_percentage"),
            "HSC %": s.get("hsc_percentage"),
            "UG %": s.get("ug_percentage"),
            "Email": s.get("email"),
            "Phone": s.get("phone")
        })
        
    
    if not data:
        return {"columns": [], "data": []}
    return {"columns": list(data[0].keys()), "data": data}

@router.get("/preview/students/company/{company_id}")
async def preview_company_students(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    placed = await db["placed_students"].find({"company_id": company_id}).to_list(length=5000)
    
    if not placed:
        raise HTTPException(status_code=404, detail="No selected students found for this company")
        
    data = []
    company_name = placed[0].get("company_name", "Company") if placed else "Company"
    
    columns = ["S.No", "Roll No", "Name", "Department", "Company", "CTC (LPA)"]
    for i, p in enumerate(placed):
        data.append({
            "_id": str(p["_id"]),
            "S.No": i + 1,
            "Roll No": p.get("roll_no"),
            "Name": p.get("name"),
            "Department": p.get("department"),
            "Company": p.get("company_name"),
            "CTC (LPA)": p.get("ctc_lpa")
        })
        
    
    if not data:
        return {"columns": [], "data": []}
    return {"columns": columns, "data": data}

@router.get("/export/students/department/{department}")
async def export_department_students(
    department: str,
    status: str = "all", # all, placed, unplaced
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    query = {"department": department, "is_deleted": {"$ne": True}}
    
    placed = await db["placed_students"].find({"department": department}).to_list(length=5000)
    placed_roll_nos = [p.get("roll_no") for p in placed if p.get("roll_no")]
    
    if status == "placed":
        query["roll_no"] = {"$in": placed_roll_nos}
    elif status == "unplaced":
        query["roll_no"] = {"$nin": placed_roll_nos}
        
    students = await db["students"].find(query).to_list(length=5000)
    
    if not students:
        raise HTTPException(status_code=404, detail=f"No {status} students found for department {department}")
        
    data = []
    placed_map = {}
    if status in ["all", "placed"]:
        for p in placed:
            if p.get("roll_no"):
                placed_map[p["roll_no"]] = p.get("company_name", "")
                
    for i, s in enumerate(students):
        row = {
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "Gender": s.get("gender"),
            "Status": "Placed" if s.get("roll_no") in placed_roll_nos else "Unplaced"
        }
        if status in ["all", "placed"]:
            row["Company"] = placed_map.get(s.get("roll_no"), "-")
        data.append(row)
        
    df = pd.DataFrame(data)
    filename = f"{department}_{status}_Students_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return create_excel_response(df, filename)

@router.get("/preview/students/department/{department}")
async def preview_department_students(
    department: str,
    status: str = "all", # all, placed, unplaced
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    query = {"department": department, "is_deleted": {"$ne": True}}
    
    placed = await db["placed_students"].find({"department": department}).to_list(length=5000)
    placed_roll_nos = [p.get("roll_no") for p in placed if p.get("roll_no")]
    
    if status == "placed":
        query["roll_no"] = {"$in": placed_roll_nos}
    elif status == "unplaced":
        query["roll_no"] = {"$nin": placed_roll_nos}
        
    students = await db["students"].find(query).to_list(length=5000)
    
    if not students:
        raise HTTPException(status_code=404, detail=f"No {status} students found for department {department}")
        
    data = []
    placed_map = {}
    if status in ["all", "placed"]:
        for p in placed:
            if p.get("roll_no"):
                placed_map[p["roll_no"]] = p.get("company_name", "")
                
    for i, s in enumerate(students):
        row = {
            "S.No": i + 1,
            "Roll No": s.get("roll_no"),
            "Name": s.get("name"),
            "Department": s.get("department"),
            "Gender": s.get("gender"),
            "Status": "Placed" if s.get("roll_no") in placed_roll_nos else "Unplaced"
        }
        if status in ["all", "placed"]:
            row["Company"] = placed_map.get(s.get("roll_no"), "-")
        data.append(row)
        
    if not data:
        return {"columns": [], "data": []}
    return {"columns": list(data[0].keys()), "data": data}
