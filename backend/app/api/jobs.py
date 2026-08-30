from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.models.user import UserInDB, RoleEnum
from app.services.ai_ats import evaluate_resume_with_gemini
from bson import ObjectId
from datetime import datetime

router = APIRouter()

class JobCreate(BaseModel):
    title: str
    company_name: str
    location: str
    package: str
    role_type: str = "Full-Time"
    deadline: str = "2026-10-30"
    eligibility_criteria: str = "UG > 70%, No active backlogs"
    description: str
    required_skills: List[str] = ["Python", "React", "SQL"]

class JobApply(BaseModel):
    job_id: str
    student_roll_no: str
    resume_text: Optional[str] = ""

@router.get("")
async def get_all_jobs():
    db = get_database()
    cursor = db["jobs"].find({})
    jobs = await cursor.to_list(length=100)
    
    # Format ObjectId for response
    result = []
    for j in jobs:
        j["id"] = str(j["_id"])
        del j["_id"]
        result.append(j)
        
    # Removed fake default jobs insertion
            
    return result

@router.post("")
async def create_job(job: JobCreate):
    db = get_database()
    job_dict = job.model_dump()
    job_dict["created_at"] = datetime.utcnow().isoformat()
    
    res = await db["jobs"].insert_one(job_dict)
    job_dict["id"] = str(res.inserted_id)
    del job_dict["_id"]
    return {"message": "Job Drive posted successfully", "job": job_dict}

@router.post("/apply")
async def apply_to_job(application: JobApply):
    db = get_database()
    
    # Check if already applied
    existing = await db["applications"].find_one({
        "job_id": application.job_id,
        "student_roll_no": application.student_roll_no
    })
    if existing:
        return {"message": "Already applied to this drive", "status": existing.get("status", "Applied")}
        
    # Get job details
    job = None
    try:
        job = await db["jobs"].find_one({"_id": ObjectId(application.job_id)})
    except Exception:
        job = await db["jobs"].find_one({"title": {"$regex": application.job_id, "$options": "i"}})
        
    jd_text = job.get("description", "") if job else ""
    
    # Run ATS evaluation
    eval_result = evaluate_resume_with_gemini(
        job_description=jd_text,
        resume_text=application.resume_text or f"Student Resume: {application.student_roll_no}"
    )
    
    app_doc = {
        "job_id": application.job_id,
        "student_roll_no": application.student_roll_no,
        "company_name": job.get("company_name", "Company") if job else "Recruiter Drive",
        "job_title": job.get("title", "Software Role") if job else "Software Role",
        "status": "Applied",
        "applied_at": datetime.utcnow().strftime("%d %b %Y"),
        "ats_score": eval_result.get("ats_score", 75),
        "match_status": eval_result.get("match_status", "Good Match"),
        "ats_evaluation": eval_result
    }
    
    await db["applications"].insert_one(app_doc)
    app_doc["id"] = str(app_doc["_id"])
    del app_doc["_id"]
    
    return {"message": "Application submitted successfully", "application": app_doc}

@router.get("/applications/{roll_no}")
async def get_student_applications(roll_no: str):
    db = get_database()
    cursor = db["applications"].find({"student_roll_no": roll_no})
    apps = await cursor.to_list(length=50)
    
    result = []
    for a in apps:
        a["id"] = str(a["_id"])
        del a["_id"]
        result.append(a)
    return result

@router.get("/candidates/matches")
async def get_recruiter_candidate_matches(job_id: Optional[str] = None):
    db = get_database()
    
    # Fetch all students
    students_cursor = db["students"].find({})
    students = await students_cursor.to_list(length=100)
    
    # Fetch job description
    jd_text = ""
    if job_id and job_id != "all":
        try:
            job = await db["jobs"].find_one({"_id": ObjectId(job_id)})
            if job:
                jd_text = job.get("description", "")
        except Exception:
            pass
            
    matches = []
    for s in students:
        s_resume = f"Student Name: {s.get('name')}. Department: {s.get('department')}. UG: {s.get('ug_percentage')}%."
        eval_res = evaluate_resume_with_gemini(jd_text, s_resume) if jd_text else {}
        
        matches.append({
            "id": str(s["_id"]),
            "roll_no": s.get("roll_no", "N/A"),
            "name": s.get("name", "N/A"),
            "department": s.get("department", "N/A"),
            "ug_percentage": s.get("ug_percentage", 0),
            "email": s.get("email", ""),
            "phone": s.get("phone", ""),
            "resume_url": s.get("resume_url", ""),
            "video_url": s.get("video_url", ""),
            "ats_score": eval_res.get("ats_score", 78),
            "match_status": eval_res.get("match_status", "Good Match"),
            "key_strengths": eval_res.get("key_strengths", ["Strong Academic Foundation"]),
            "missing_skills": eval_res.get("missing_skills", []),
            "recommendations": eval_res.get("recommendations", [])
        })
        
    # Sort by ATS score descending
    matches.sort(key=lambda x: x["ats_score"], reverse=True)
    return matches
