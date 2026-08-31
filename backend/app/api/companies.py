from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
import pandas as pd
import io
import os
import PyPDF2
from datetime import datetime

from app.db.mongodb import get_database
from app.api.deps import require_role
from app.models.user import UserInDB, RoleEnum
from app.services.history_service import log_action

router = APIRouter()

# Directory for storing JD files locally
UPLOAD_DIR = "uploads/jds"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class CompanyCreate(BaseModel):
    name: str
    location: str
    website: str
    contact_person: str
    phone: str
    email: str
    size: str
    status: str
    address: Optional[str] = None
    map_url: Optional[str] = None
    ctc_lpa: Optional[str] = None

class ManualRegisteredStudents(BaseModel):
    roll_numbers: List[str]
    
@router.get("")
async def get_companies(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD, RoleEnum.RECRUITER]))
):
    db = get_database()
    cursor = db["companies"].find({})
    companies = await cursor.to_list(length=100)
    
    result = []
    for c in companies:
        c["id"] = str(c["_id"])
        del c["_id"]
        result.append(c)
        
    return result

@router.post("")
async def create_company(
    company: CompanyCreate,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    comp_dict = company.model_dump()
    comp_dict["created_at"] = datetime.utcnow().isoformat()
    comp_dict["created_by"] = {
        "name": current_user.name,
        "role": current_user.role,
        "email": current_user.email
    }
    comp_dict["selected_count"] = 0
    
    res = await db["companies"].insert_one(comp_dict)
    comp_dict["id"] = str(res.inserted_id)
    del comp_dict["_id"]
    
    await log_action(
        user_id=current_user.email,
        collection_name="companies",
        action="CREATE",
        document_id=comp_dict["id"],
        previous_data=None,
        new_data=comp_dict
    )
    
    return {"message": "Company added successfully", "company": comp_dict}

@router.post("/upload")
async def upload_companies(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        db = get_database()
        
        # Clean columns and handle NaNs
        df = df.replace({float('nan'): None})
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        def get_val(row, possible_keys, default=''):
            for k in possible_keys:
                if k in row and row[k] is not None:
                    val = str(row[k]).strip()
                    if val.lower() != 'nan' and val != '':
                        return val
            return default
            
        companies_to_insert = []
        for index, row in df.iterrows():
            name = get_val(row, ['company name', 'name', 'company'])
            if not name:
                continue
                
            companies_to_insert.append({
                "name": name,
                "location": get_val(row, ['location', 'city']),
                "website": get_val(row, ['website', 'url']),
                "contact_person": get_val(row, ['contact person', 'hr name', 'contact']),
                "phone": get_val(row, ['phone', 'mobile', 'contact number']),
                "email": get_val(row, ['email', 'hr email']),
                "size": get_val(row, ['size', 'company size', 'employees']),
                "status": get_val(row, ['status', 'company status'], default='COLD').upper(),
                "address": get_val(row, ['address', 'full address']),
                "map_url": get_val(row, ['map', 'map url', 'map link', 'google map']),
                "ctc_lpa": get_val(row, ['ctc', 'ctc lpa', 'ctc (lpa)', 'salary', 'package']),
                "created_at": datetime.utcnow().isoformat(),
                "created_by": {
                    "name": current_user.name,
                    "role": current_user.role,
                    "email": current_user.email
                },
                "selected_count": 0
            })
            
        if not companies_to_insert:
            return {"message": "No valid companies found in the file. Ensure you have 'Company Name' column."}
            
        await db["companies"].insert_many(companies_to_insert)
        
        return {"message": f"Successfully processed {len(companies_to_insert)} companies."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    existing_company = await db["companies"].find_one({"_id": obj_id})
    if not existing_company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    res = await db["companies"].delete_one({"_id": obj_id})
    
    await log_action(
        user_id=current_user.email,
        collection_name="companies",
        action="DELETE",
        document_id=company_id,
        previous_data=existing_company,
        new_data=None
    )
        
    # Also delete placed students for this company
    await db["placed_students"].delete_many({"company_id": company_id})
    
    return {"message": "Company deleted"}

class CompanyStatusUpdate(BaseModel):
    status: str

@router.patch("/{company_id}/status")
async def update_company_status(
    company_id: str,
    status_update: CompanyStatusUpdate,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    res = await db["companies"].update_one(
        {"_id": obj_id},
        {"$set": {"status": status_update.status}}
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return {"message": "Status updated successfully"}

@router.patch("/{company_id}/status/request")
async def request_company_status(
    company_id: str,
    status_update: CompanyStatusUpdate,
    current_user: UserInDB = Depends(require_role([RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    res = await db["companies"].update_one(
        {"_id": obj_id},
        {"$set": {
            "pending_status": status_update.status,
            "status_requested_by": current_user.name or current_user.email,
            "status_requested_role": current_user.role,
            "status_requested_at": datetime.utcnow().isoformat()
        }}
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return {"message": "Status change requested successfully"}

@router.get("/status_requests")
async def get_status_requests(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    cursor = db["companies"].find({"pending_status": {"$exists": True, "$ne": None}})
    companies = await cursor.to_list(length=1000)
    
    result = []
    for c in companies:
        c["id"] = str(c["_id"])
        del c["_id"]
        result.append(c)
        
    return result

@router.get("/status_requests/history")
async def get_status_requests_history(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    cursor = db["companies"].find({"status_history": {"$exists": True, "$not": {"$size": 0}}})
    companies = await cursor.to_list(length=1000)
    
    history_list = []
    for c in companies:
        company_id = str(c["_id"])
        company_name = c.get("name", "Unknown Company")
        for entry in c.get("status_history", []):
            entry_copy = dict(entry)
            entry_copy["company_id"] = company_id
            entry_copy["company_name"] = company_name
            history_list.append(entry_copy)
            
    # Sort descending by resolved_at
    history_list.sort(key=lambda x: x.get("resolved_at", ""), reverse=True)
    return history_list

@router.post("/{company_id}/status/approve")
async def approve_company_status(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    company = await db["companies"].find_one({"_id": obj_id})
    if not company or not company.get("pending_status"):
        raise HTTPException(status_code=404, detail="No pending status request found for this company")
        
    history_entry = {
        "requested_status": company["pending_status"],
        "requested_by": company.get("status_requested_by", "Unknown"),
        "requested_role": company.get("status_requested_role", "Unknown"),
        "requested_at": company.get("status_requested_at", datetime.utcnow().isoformat()),
        "action": "APPROVED",
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": current_user.email
    }

    res = await db["companies"].update_one(
        {"_id": obj_id},
        {
            "$set": {"status": company["pending_status"]},
            "$unset": {
                "pending_status": "",
                "status_requested_by": "",
                "status_requested_role": "",
                "status_requested_at": ""
            },
            "$push": {"status_history": history_entry}
        }
    )
    
    return {"message": "Status approved successfully"}

@router.post("/{company_id}/status/reject")
async def reject_company_status(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    company = await db["companies"].find_one({"_id": obj_id})
    if not company or not company.get("pending_status"):
        raise HTTPException(status_code=404, detail="No pending status request found for this company")
        
    history_entry = {
        "requested_status": company["pending_status"],
        "requested_by": company.get("status_requested_by", "Unknown"),
        "requested_role": company.get("status_requested_role", "Unknown"),
        "requested_at": company.get("status_requested_at", datetime.utcnow().isoformat()),
        "action": "REJECTED",
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": current_user.email
    }

    res = await db["companies"].update_one(
        {"_id": obj_id},
        {
            "$unset": {
                "pending_status": "",
                "status_requested_by": "",
                "status_requested_role": "",
                "status_requested_at": ""
            },
            "$push": {"status_history": history_entry}
        }
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return {"message": "Status rejected successfully"}

@router.put("/{company_id}")
async def update_company_details(
    company_id: str,
    company: CompanyCreate,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
        
    comp_dict = company.model_dump()
    
    existing_company = await db["companies"].find_one({"_id": obj_id})
    if not existing_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    res = await db["companies"].update_one(
        {"_id": obj_id},
        {"$set": comp_dict}
    )
    
    updated_company = await db["companies"].find_one({"_id": obj_id})
    
    await log_action(
        user_id=current_user.email,
        collection_name="companies",
        action="UPDATE",
        document_id=company_id,
        previous_data=existing_company,
        new_data=updated_company
    )
    
    return {"message": "Company updated successfully"}


@router.post("/{company_id}/upload_jd")
async def upload_jd(
    company_id: str,
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    if not file.filename.endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload PDF or DOC.")
        
    file_path = os.path.join(UPLOAD_DIR, f"{company_id}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    jd_url = f"/uploads/jds/{company_id}_{file.filename}"
    jd_text = ""
    
    if file.filename.endswith('.pdf'):
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    jd_text += text + "\n"
        except Exception as e:
            print(f"Error extracting text from JD PDF: {e}")
    
    await db["companies"].update_one(
        {"_id": ObjectId(company_id)},
        {"$set": {"jd_url": jd_url, "jd_text": jd_text, "status": "HOT"}}
    )
    
    return {"message": "JD uploaded successfully", "jd_url": jd_url}

@router.post("/{company_id}/upload_students")
async def upload_placed_students(
    company_id: str,
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        db = get_database()
        
        # Clean columns and handle NaNs
        df = df.replace({float('nan'): None})
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        def get_val(row, possible_keys, default=''):
            for k in possible_keys:
                if k in row and row[k] is not None:
                    val = str(row[k]).strip()
                    if val.lower() != 'nan' and val != '':
                        return val
            return default
            
        placed_students = []
        for index, row in df.iterrows():
            roll_no = get_val(row, ['roll no', 'roll_no', 'roll number', 'rollno', 'id'])
            if not roll_no:
                continue
                
            placed_students.append({
                "company_id": company_id,
                "s_no": get_val(row, ['s.no', 's.no.', 'sno', 'sl no', 'serial number']),
                "roll_no": roll_no,
                "name": get_val(row, ['name', 'student name']),
                "department": get_val(row, ['department', 'dept', 'branch']),
                "company_name": get_val(row, ['company', 'company name']),
                "ctc_lpa": get_val(row, ['ctc(in lpa)', 'ctc', 'ctc (lpa)', 'package'])
            })
            
        if not placed_students:
            return {"message": "No valid students found in the file. Ensure you have 'Roll No' column."}
            
        # Delete existing placed students for this company to replace them
        await db["placed_students"].delete_many({"company_id": company_id})
        await db["placed_students"].insert_many(placed_students)
        
        # Update selected count
        await db["companies"].update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"selected_count": len(placed_students), "status": "DRIVE COMPLETED"}}
        )
        
        return {"message": f"Successfully processed {len(placed_students)} placed students."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PlacedStudentInput(BaseModel):
    roll_no: str
    ctc_lpa: str

class ManualPlacedStudents(BaseModel):
    students: List[PlacedStudentInput]

@router.post("/{company_id}/placed_students/manual")
async def add_manual_placed_students(
    company_id: str,
    data: ManualPlacedStudents,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Get company to get company_name
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company_name = company.get("name", "")
    
    placed_students = []
    
    # Process each student
    for s_input in data.students:
        roll_no = s_input.roll_no.strip()
        ctc_lpa = s_input.ctc_lpa.strip()
        
        if not roll_no:
            continue
            
        # Fetch from master DB
        student_doc = await db["students"].find_one({"roll_no": roll_no})
        
        placed_students.append({
            "company_id": company_id,
            "s_no": len(placed_students) + 1,
            "roll_no": roll_no,
            "name": student_doc.get("name", "") if student_doc else "",
            "department": student_doc.get("department", "") if student_doc else "",
            "company_name": company_name,
            "ctc_lpa": ctc_lpa
        })
        
    if not placed_students:
        return {"message": "No valid students provided."}
        
    try:
        # Avoid duplicates by deleting these roll numbers for this company first
        roll_numbers_to_delete = [s["roll_no"] for s in placed_students]
        await db["placed_students"].delete_many({
            "company_id": company_id,
            "roll_no": {"$in": roll_numbers_to_delete}
        })
        
        await db["placed_students"].insert_many(placed_students)
        
        # Update selected count based on total placed students for this company
        total_selected = await db["placed_students"].count_documents({"company_id": company_id})
        
        await db["companies"].update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"selected_count": total_selected, "status": "DRIVE COMPLETED"}}
        )
        
        return {"message": f"Successfully added {len(placed_students)} selected students manually."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{company_id}/download_students")
async def download_placed_students(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    cursor = db["placed_students"].find({"company_id": company_id})
    students = await cursor.to_list(length=1000)
    
    if not students:
        raise HTTPException(status_code=404, detail="No placed students found for this company")
        
    df = pd.DataFrame(students)
    # Rename columns to match requirements
    df = df.rename(columns={
        "s_no": "S.No",
        "roll_no": "Roll No",
        "name": "Name",
        "department": "Department",
        "company_name": "Company",
        "ctc_lpa": "CTC(in LPA)"
    })
    
    # Keep only the required columns
    columns_to_keep = ["S.No", "Roll No", "Name", "Department", "Company", "CTC(in LPA)"]
    # Only keep columns that actually exist in the dataframe to prevent KeyError
    columns_to_keep = [c for c in columns_to_keep if c in df.columns]
    df = df[columns_to_keep]
    
    # Save to Excel in BytesIO
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Placed Students')
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="placed_students_{company_id}.xlsx"'
    }
    
    return StreamingResponse(
        output,
        headers=headers,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.delete("/placed_students/{placed_id}")
async def delete_placed_student(
    placed_id: str, 
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    res = await db["placed_students"].delete_one({"_id": ObjectId(placed_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Placed student not found")
    return {"message": "Placed student deleted successfully"}

@router.put("/placed_students/{placed_id}")
async def update_placed_student(
    placed_id: str, 
    data: dict, 
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    update_data = {}
    if "Name" in data: update_data["name"] = data["Name"]
    if "Department" in data: update_data["department"] = data["Department"]
    if "Roll No" in data: update_data["roll_no"] = data["Roll No"]
    if "CTC (LPA)" in data: update_data["ctc_lpa"] = data["CTC (LPA)"]
    if "Company" in data: update_data["company_name"] = data["Company"]
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    res = await db["placed_students"].update_one(
        {"_id": ObjectId(placed_id)},
        {"$set": update_data}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Placed student not found")
    return {"message": "Placed student updated successfully"}

async def process_ats_background(company_id: str, roll_numbers: list[str]):
    db = get_database()
    try:
        from bson import ObjectId
        company = await db["companies"].find_one({"_id": ObjectId(company_id)})
        jd_text = company.get("jd_text", "")
        if not jd_text:
            print("No JD text found for ATS background processing.")
            return
            
        from app.services.ml_ats import calculate_ats_scores_batch, get_match_status, extract_text_from_url
        
        import asyncio
        
        # We need to process in batches to avoid taking too much memory at once
        batch_size = 50
        for i in range(0, len(roll_numbers), batch_size):
            batch_rolls = roll_numbers[i:i+batch_size]
            students_cursor = db["students"].find({"roll_no": {"$in": batch_rolls}})
            students = await students_cursor.to_list(length=batch_size)
            
            resume_texts = []
            for s in students:
                url = s.get("resume_url", "")
                text = extract_text_from_url(url) if url else ""
                if not text:
                    text = f"{s.get('name')} {s.get('department')} {s.get('skills', '')}"
                resume_texts.append(text)
                
            # Run the heavy CPU-bound ML model in a separate thread to prevent blocking the event loop
            scores = await asyncio.to_thread(calculate_ats_scores_batch, jd_text, resume_texts)
            
            updates = []
            from pymongo import UpdateOne
            for j, s in enumerate(students):
                updates.append(
                    UpdateOne(
                        {"company_id": company_id, "roll_no": s["roll_no"]},
                        {"$set": {
                            "ats_score": scores[j],
                            "match_status": get_match_status(scores[j]),
                            "student_id": str(s["_id"])
                        }},
                        upsert=True
                    )
                )
            if updates:
                await db["company_registered_students"].bulk_write(updates)
                
        # Also update the company with the registered count
        await db["companies"].update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"registered_count": len(roll_numbers)}}
        )
    except Exception as e:
        print(f"Background ATS processing failed: {e}")

@router.post("/{company_id}/registered_students/upload")
async def upload_registered_students(
    company_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")

    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))

        df.columns = [c.strip().lower() for c in df.columns]
        
        # Find roll_no column
        roll_col = next((c for c in df.columns if 'roll' in c or 'register' in c), None)
        if not roll_col:
            raise HTTPException(status_code=400, detail="Excel must contain a Roll No / Register No column.")
            
        roll_numbers = df[roll_col].dropna().astype(str).tolist()
        
        db = get_database()
        
        # Initialize basic records immediately
        updates = []
        from pymongo import UpdateOne
        for roll in roll_numbers:
            updates.append(
                UpdateOne(
                    {"company_id": company_id, "roll_no": roll},
                    {"$setOnInsert": {
                        "ats_score": 0,
                        "match_status": "Pending Analysis",
                        "student_id": None
                    }},
                    upsert=True
                )
            )
        if updates:
            await db["company_registered_students"].bulk_write(updates)
            
        # Queue the background task to calculate ATS scores
        background_tasks.add_task(process_ats_background, company_id, roll_numbers)
            
        return {"message": f"Successfully uploaded {len(roll_numbers)} registered students. ATS Analysis started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.post("/{company_id}/registered_students/manual")
async def add_manual_registered_students(
    company_id: str,
    data: ManualRegisteredStudents,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    try:
        roll_numbers = [r.strip() for r in data.roll_numbers if r.strip()]
        if not roll_numbers:
            raise HTTPException(status_code=400, detail="No roll numbers provided")
            
        db = get_database()
        
        # Initialize basic records immediately
        updates = []
        from pymongo import UpdateOne
        for roll in roll_numbers:
            updates.append(
                UpdateOne(
                    {"company_id": company_id, "roll_no": roll},
                    {"$setOnInsert": {
                        "ats_score": 0,
                        "match_status": "Pending Analysis",
                        "student_id": None
                    }},
                    upsert=True
                )
            )
        if updates:
            await db["company_registered_students"].bulk_write(updates)
            
        # Queue the background task to calculate ATS scores
        background_tasks.add_task(process_ats_background, company_id, roll_numbers)
            
        return {"message": f"Successfully added {len(roll_numbers)} registered student(s). ATS Analysis started in background."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process manual entry: {str(e)}")

@router.get("/{company_id}/registered_students")
async def get_registered_students(
    company_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # 1. Get all registered records for this company
    cursor = db["company_registered_students"].find({"company_id": company_id})
    reg_records = await cursor.to_list(length=2000)
    
    if not reg_records:
        return {"students": []}
        
    roll_numbers = [r["roll_no"] for r in reg_records]
    
    # 2. Get the full student data from students collection
    students_cursor = db["students"].find({"roll_no": {"$in": roll_numbers}})
    students = await students_cursor.to_list(length=2000)
    
    # 3. Merge data
    student_map = {s["roll_no"]: s for s in students}
    
    result = []
    for r in reg_records:
        roll = r["roll_no"]
        if roll in student_map:
            s_data = student_map[roll]
            s_data["_id"] = str(s_data["_id"])
            s_data["ats_score"] = r.get("ats_score", 0)
            s_data["match_status"] = r.get("match_status", "Pending")
            s_data["attended"] = r.get("attended", False)
            result.append(s_data)
            
    # Sort by ats_score descending
    result.sort(key=lambda x: x.get("ats_score", 0), reverse=True)
            
    return {"students": result}

class AttendanceUpdate(BaseModel):
    attended: bool

@router.patch("/{company_id}/registered_students/{roll_no}/attendance")
async def update_attendance(
    company_id: str,
    roll_no: str,
    attendance_update: AttendanceUpdate,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    res = await db["company_registered_students"].update_one(
        {"company_id": company_id, "roll_no": roll_no},
        {"$set": {"attended": attendance_update.attended}}
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found in registered list")
        
    return {"message": "Attendance updated successfully"}

class BulkAttendanceManual(BaseModel):
    roll_numbers: List[str]

@router.post("/{company_id}/registered_students/attend_bulk/manual")
async def mark_bulk_attended_manual(
    company_id: str,
    data: BulkAttendanceManual,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    try:
        roll_numbers = [r.strip() for r in data.roll_numbers if r.strip()]
        if not roll_numbers:
            raise HTTPException(status_code=400, detail="No roll numbers provided")
            
        db = get_database()
        res = await db["company_registered_students"].update_many(
            {"company_id": company_id, "roll_no": {"$in": roll_numbers}},
            {"$set": {"attended": True}}
        )
        return {"message": f"Successfully marked {res.modified_count} students as attended out of {len(roll_numbers)} requested."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process manual attendance: {str(e)}")

@router.post("/{company_id}/registered_students/attend_bulk/upload")
async def mark_bulk_attended_upload(
    company_id: str,
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")

    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))

        df.columns = [c.strip().lower() for c in df.columns]
        roll_col = next((c for c in df.columns if 'roll' in c or 'register' in c), None)
        if not roll_col:
            raise HTTPException(status_code=400, detail="Excel must contain a Roll No / Register No column.")
            
        roll_numbers = df[roll_col].dropna().astype(str).tolist()
        roll_numbers = [r.strip() for r in roll_numbers if r.strip()]
        
        if not roll_numbers:
            return {"message": "No valid roll numbers found in the file."}

        db = get_database()
        res = await db["company_registered_students"].update_many(
            {"company_id": company_id, "roll_no": {"$in": roll_numbers}},
            {"$set": {"attended": True}}
        )
        
        return {"message": f"Successfully marked {res.modified_count} students as attended from Excel."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
