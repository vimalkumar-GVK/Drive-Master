from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.models.user import UserInDB, RoleEnum
from app.services.history_service import log_action
from bson import ObjectId
import pandas as pd
import io
import math

router = APIRouter()

class StudentManualEntry(BaseModel):
    roll_no: str
    name: str
    department: str
    gender: str
    acc: str
    sslc_percentage: float
    sslc_year: str
    hsc_percentage: float
    hsc_year: str
    ug_percentage: float
    ug_year: str
    grad_year: str
    email: str
    phone: str
    resume_url: str = ""
    video_url: str = ""
    photo_url: str = ""
    portfolio_url: str = ""
    github_url: str = ""
    linkedin_url: str = ""

@router.post("/admin/students")
async def add_student_manually(
    student: StudentManualEntry,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    student_dict = student.model_dump()
    
    existing_student = await db["students"].find_one({"roll_no": student.roll_no})
    
    await db["students"].update_one(
        {"roll_no": student.roll_no},
        {"$set": student_dict},
        upsert=True
    )
    
    updated_student = await db["students"].find_one({"roll_no": student.roll_no})
    
    await log_action(
        user_id=current_user.email,
        collection_name="students",
        action="UPDATE" if existing_student else "CREATE",
        document_id=str(updated_student["_id"]),
        previous_data=existing_student,
        new_data=updated_student
    )
    
    return {"message": "Student added successfully"}

@router.post("/admin/students/upload")
async def upload_students_excel(
    file: UploadFile = File(...),
    mode: str = Query("upsert"),
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding='utf-16')
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        db = get_database()
        inserted = 0
        updated = 0
        
        # Clean NaN values which break MongoDB
        df = df.replace({float('nan'): None})
        
        # Clean column names to make matching easier
        df.columns = [str(c).strip().lower() for c in df.columns]

        # Check if the current columns look like valid headers
        valid_header_keywords = ['roll', 'reg', 'name', 'email', 'department', 'dept', 'gender', 'sslc', 'hsc', 'cgpa']
        current_cols_str = " ".join(df.columns)
        has_valid_header = any(k in current_cols_str for k in valid_header_keywords)

        if not has_valid_header:
            # Search first 15 rows for a valid header
            for i, row in df.head(15).iterrows():
                row_str = " ".join([str(x).lower() for x in row.values if x is not None])
                if sum(1 for k in valid_header_keywords if k in row_str) >= 2: # at least 2 keywords match
                    df.columns = [str(c).strip().lower() for c in row.values]
                    df = df.iloc[i+1:].reset_index(drop=True)
                    break

        def get_val(row, possible_keys, default=''):
            for k in possible_keys:
                if k in row and row[k] is not None:
                    val = str(row[k]).strip()
                    if val.lower() != 'nan' and val != '':
                        return val
            return default

        def get_float_val(row, possible_keys, default=0.0):
            val = get_val(row, possible_keys, "")
            if not val:
                return default
            try:
                # Remove any % signs or letters, then convert to float
                clean_val = ''.join(c for c in val if c.isdigit() or c == '.')
                return float(clean_val) if clean_val else default
            except ValueError:
                return default

        parsed_students = []
        roll_nos = []
        for index, row in df.iterrows():
            roll_no = get_val(row, ['roll no', 'roll_no', 'roll number', 'rollno', 'id', 'roll', 'reg no', 'reg_no', 'regno', 'register no', 'register number', 'university no', 'registration number', 'register no.', 'reg.no', 'reg. no'])
            if roll_no:
                roll_nos.append(roll_no)
                parsed_students.append((roll_no, row))
                
        if mode == "preview":
            existing_count = await db["students"].count_documents({"roll_no": {"$in": roll_nos}})
            new_count = len(roll_nos) - existing_count
            return {"new_count": new_count, "existing_count": existing_count, "total_count": len(roll_nos)}

        for roll_no, row in parsed_students:
            student_data = {
                "roll_no": roll_no,
                "name": get_val(row, ['name', 'student name', 'full name', 'first name', 'candidate name', 'student_name']),
                "department": get_val(row, ['department', 'dept', 'branch', 'course', 'degree', 'stream']),
                "gender": get_val(row, ['gender', 'sex', 'm/f']),
                "acc": get_val(row, ['accommodation', 'acc', 'hosteller/day scholar', 'hostel', 'stay', 'residence']),
                "sslc_percentage": get_float_val(row, ['sslc % [year]', 'sslc', 'sslc %', '10th', '10th %', '10th percentage', 'x', 'x %', 'class 10', 'class 10 %']),
                "hsc_percentage": get_float_val(row, ['hsc % [year]', 'hsc', 'hsc %', '12th', '12th %', '12th percentage', '12th/diploma %', 'xii', 'xii %', 'class 12', 'class 12 %']),
                "ug_percentage": get_float_val(row, ['ug % [year]', 'ug', 'ug %', 'cgpa', 'degree %', 'ug percentage', 'b.tech %', 'btech %', 'b.e %', 'be %', 'current cgpa']),
                "grad_year": get_val(row, ['year of graduation', 'grad year', 'passing year', 'year', 'yop', 'batch', 'passout year']),
                "email": get_val(row, ['email', 'email id', 'email address', 'mail', 'mail id', 'student email', 'personal email']),
                "phone": get_val(row, ['phone number', 'phone', 'mobile', 'contact', 'mobile number', 'contact number', 'student mobile']),
                "resume_url": get_val(row, ['resume link (preview)', 'resume', 'resume link', 'resume url', 'cv', 'cv link']),
                "video_url": get_val(row, ['intro video [preview]', 'video', 'video link', 'intro video', 'video resume']),
                "github_url": get_val(row, ['github', 'github link', 'github profile', 'github url']),
                "linkedin_url": get_val(row, ['linkedin', 'linkedin link', 'linkedin profile', 'linkedin url', 'linked in'])
            }

            if mode == "insert_only":
                exists = await db["students"].find_one({"roll_no": roll_no})
                if exists:
                    continue
                await db["students"].insert_one(student_data)
                inserted += 1
            else:
                result = await db["students"].update_one(
                    {"roll_no": roll_no},
                    {"$set": student_data},
                    upsert=True
                )
                if result.upserted_id:
                    inserted += 1
                elif result.modified_count:
                    updated += 1
                
        return {"message": f"Successfully processed {len(roll_nos)} records. Inserted: {inserted}, Updated: {updated}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/students/placed")
async def get_all_placed_students(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    # Fetch placed students, sorted by created_at (newest first)
    cursor = db["placed_students"].find({}).sort("created_at", -1)
    placed_students = await cursor.to_list(length=10000)
    
    # Format the response
    result = []
    for s in placed_students:
        result.append({
            "id": str(s.get("_id")),
            "roll_no": s.get("roll_no", "N/A"),
            "name": s.get("name", "N/A"),
            "department": s.get("department", "N/A"),
            "company_name": s.get("company_name", "N/A"),
            "ctc_lpa": s.get("ctc_lpa", "N/A"),
            "created_at": s.get("created_at")
        })
    return result

@router.get("/admin/students")
async def get_students_for_admin(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    cursor = db["students"].find({"is_deleted": {"$ne": True}})
    students = await cursor.to_list(length=10000)
    # Fetch placed students to determine status from active companies
    company_cursor = db["companies"].find({"isActive": True})
    active_companies = await company_cursor.to_list(length=1000)
    
    placed_info = {}
    for c in active_companies:
        for r in c.get("placedStudents", []):
            if r:
                r_clean = str(r).strip().upper()
                placed_info[r_clean] = {
                    "company_name": c.get("name", "N/A"),
                    "ctc_lpa": c.get("ctc_lpa", "N/A")
                }

    # Return formatted list matching the frontend UI requirements
    result = []
    for s in students:
        roll_clean = str(s.get("roll_no", "")).strip().upper()
        result.append({
            "id": str(s.get("_id")),
            "roll_no": s.get("roll_no", "N/A"),
            "name": s.get("name", "N/A"),
            "department": s.get("department", "N/A"),
            "gender": s.get("gender", "N/A"),
            "acc": s.get("acc", "ACC"),
            "sslc": f"{s.get('sslc_percentage', 0)} ({s.get('sslc_year', 'N/A')})",
            "hsc": f"{s.get('hsc_percentage', 0)} ({s.get('hsc_year', 'N/A')})",
            "ug": f"{s.get('ug_percentage', 0)} ({s.get('ug_year', 'N/A')})",
            "grad_year": s.get("grad_year", "N/A"),
            "email": s.get("email", "N/A"),
            "phone": s.get("phone", "N/A"),
            "resume_url": s.get("resume_url"),
            "video_url": s.get("video_url"),
            "photo_url": s.get("photo_url"),
            "portfolio_url": s.get("portfolio_url"),
            "placement_status": "Placed" if roll_clean in placed_info else "YTBP",
            "placed_company": placed_info[roll_clean]["company_name"] if roll_clean in placed_info else None,
            "placed_ctc": placed_info[roll_clean]["ctc_lpa"] if roll_clean in placed_info else None
        })
    return result

@router.get("/admin/students/trash")
async def get_trashed_students_for_admin(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    cursor = db["students"].find({"is_deleted": True})
    students = await cursor.to_list(length=10000)
    
    result = []
    for s in students:
        result.append({
            "id": str(s.get("_id")),
            "roll_no": s.get("roll_no", "N/A"),
            "name": s.get("name", "N/A"),
            "department": s.get("department", "N/A"),
            "gender": s.get("gender", "N/A"),
            "acc": s.get("acc", "ACC"),
            "sslc": f"{s.get('sslc_percentage', 0)} ({s.get('sslc_year', 'N/A')})",
            "hsc": f"{s.get('hsc_percentage', 0)} ({s.get('hsc_year', 'N/A')})",
            "ug": f"{s.get('ug_percentage', 0)} ({s.get('ug_year', 'N/A')})",
            "grad_year": s.get("grad_year", "N/A"),
            "email": s.get("email", "N/A"),
            "phone": s.get("phone", "N/A"),
            "delete_reason": s.get("delete_reason", "N/A"),
        })
    return result

@router.delete("/admin/students/{student_id}")
async def delete_student(
    student_id: str,
    reason: str = None,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    existing_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    try:
        update_data = {"is_deleted": True}
        if reason:
            update_data["delete_reason"] = reason

        result = await db["students"].update_one(
            {"_id": ObjectId(student_id)},
            {"$set": update_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    updated_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    
    await log_action(
        user_id=current_user.email,
        collection_name="students",
        action="UPDATE",
        document_id=student_id,
        previous_data=existing_student,
        new_data=updated_student
    )
        
    return {"message": "Student moved to trash"}

@router.post("/admin/students/{student_id}/restore")
async def restore_student(
    student_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    existing_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    try:
        result = await db["students"].update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {"is_deleted": False}, "$unset": {"delete_reason": ""}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    updated_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    
    await log_action(
        user_id=current_user.email,
        collection_name="students",
        action="UPDATE",
        document_id=student_id,
        previous_data=existing_student,
        new_data=updated_student
    )
        
    return {"message": "Student restored successfully"}

@router.delete("/admin/students/{student_id}/permanent")
async def permanent_delete_student(
    student_id: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    existing_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    try:
        result = await db["students"].delete_one({"_id": ObjectId(student_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    await log_action(
        user_id=current_user.email,
        collection_name="students",
        action="DELETE",
        document_id=student_id,
        previous_data=existing_student,
        new_data=None
    )
        
    return {"message": "Student permanently deleted"}

@router.put("/admin/students/{student_id}")
async def update_student(
    student_id: str,
    student: StudentManualEntry,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    existing_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    try:
        result = await db["students"].update_one(
            {"_id": ObjectId(student_id)},
            {"$set": student.model_dump()}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    updated_student = await db["students"].find_one({"_id": ObjectId(student_id)})
    
    await log_action(
        user_id=current_user.email,
        collection_name="students",
        action="UPDATE",
        document_id=student_id,
        previous_data=existing_student,
        new_data=updated_student
    )
        
    return {"message": "Student updated successfully"}


@router.get("/admin/ats-analysis")
async def get_ats_analysis(
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.PLACEMENT_LEAD]))
):
    db = get_database()
    
    # Fetch ATS records
    students_cursor = db["students"].find({"is_deleted": {"$ne": True}}, {"roll_no": 1, "name": 1, "department": 1, "resume_url": 1, "resume_quality": 1})
    students_docs = await students_cursor.to_list(length=10000)
    
    analysis = []
    for s in students_docs:
        analysis.append({
            "roll_no": s.get("roll_no"),
            "name": s.get("name"),
            "department": s.get("department"),
            "resume_url": s.get("resume_url", ""),
            "resume_quality": s.get("resume_quality")
        })
    
    return {
        "analysis": analysis
    }

@router.post("/admin/students/{roll_no}/calculate-quality")
async def calculate_student_quality(
    roll_no: str,
    current_user: UserInDB = Depends(require_role([RoleEnum.ADMIN, RoleEnum.MANAGER]))
):
    db = get_database()
    student = await db["students"].find_one({"roll_no": roll_no})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    resume_url = student.get("resume_url")
    if not resume_url:
        raise HTTPException(status_code=400, detail="No resume URL found for this student")
        
    from app.services.ml_ats import extract_text_from_url, calculate_resume_structure_score
    
    extracted_text = extract_text_from_url(resume_url)
    
    quality_score = calculate_resume_structure_score(extracted_text)
    
    await db["students"].update_one(
        {"roll_no": roll_no},
        {"$set": {"resume_quality": quality_score}}
    )
    
    return quality_score
