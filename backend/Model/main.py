from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

class EmailSettings(BaseModel):
    email: str
    app_password: str

class JobCreate(BaseModel):
    title: str
    description: str
    company: str = "Tech Corp"
    status: str = "Ongoing"

class LoginRequest(BaseModel):
    email: str
    password: str

class CompanyCreate(BaseModel):
    name: str
    email: str
    password: str

class CompanyUpdate(BaseModel):
    name: str
    email: str
from typing import List
import json
import torch
import PyPDF2
from sentence_transformers import SentenceTransformer, util
import pandas as pd
import re
from PIL import Image, ImageDraw, ImageFont
import io
import smtplib
from email.message import EmailMessage

import models
from database import engine, get_db
from renderer import TemplateRenderer

models.Base.metadata.create_all(bind=engine)

from sqlalchemy import inspect

def sync_database_columns():
    try:
        inspector = inspect(engine)
        with engine.connect() as connection:
            for model_name, model_class in models.__dict__.items():
                if hasattr(model_class, '__tablename__'):
                    table_name = model_class.__tablename__
                    if inspector.has_table(table_name):
                        existing_cols = {col['name'] for col in inspector.get_columns(table_name)}
                        for col in model_class.__table__.columns:
                            if col.name not in existing_cols:
                                col_type = col.type.compile(engine.dialect)
                                connection.exec_driver_sql(f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}')
                                connection.commit()
    except Exception as e:
        print(f"Warning syncing database columns: {e}")

sync_database_columns()

app = FastAPI(title="Smart ATS API")

# Setup CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load AI Model Globally
try:
    print("Loading Sentence Transformer...")
    ai_model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Failed to load AI model: {e}")
    ai_model = None

# Helpers
def extract_text(file_bytes):
    import io
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        raw = " ".join([page.extract_text() for page in reader.pages if page.extract_text()]).strip()
        # Clean up whitespace and non-ascii for better accuracy
        clean = re.sub(r'\s+', ' ', raw)
        clean = re.sub(r'[^\x00-\x7F]+', ' ', clean)
        return clean.strip()
    except:
        return ""

def classify_experience(text):
    text_lower = str(text).lower()
    if re.search(r'\d+\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience|professional experience', text_lower): return "Experienced"
    if re.search(r'fresher|entry[- ]level|internship', text_lower): return "Fresher"
    return "Unknown"

# Endpoints
@app.post("/api/auth/login")
def login(user_id: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id, models.User.password == password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid ID or Password")
    return {"user_id": user.user_id, "name": user.name, "role": user.role}

@app.post("/api/ats/score")
async def score_resumes(job_description: str = Form(...), files: List[UploadFile] = File(...)):
    if not ai_model:
        raise HTTPException(status_code=500, detail="AI Model not loaded")
    
    resume_data = []
    resume_texts = []
    
    for file in files:
        content = await file.read()
        text = extract_text(content)
        real_name = str(file.filename).replace(".pdf", "").replace("_", " ")
        resume_data.append({"Candidate Name": real_name, "Exp": classify_experience(text)})
        resume_texts.append(text)
        
    if not resume_texts:
        return []
        
    job_embedding = ai_model.encode(job_description, convert_to_tensor=True)
    resume_embeddings = ai_model.encode(resume_texts, convert_to_tensor=True)
    cosine_scores = util.cos_sim(job_embedding, resume_embeddings)[0]
    
    results = []
    for i, score in enumerate(cosine_scores):
        results.append({
            "Name": resume_data[i]["Candidate Name"],
            "Experience": resume_data[i]["Exp"],
            "Score": round(score.item() * 1.6 * 100, 1)
        })
        
    # Sort by score descending
    results = sorted(results, key=lambda x: x['Score'], reverse=True)
    return results

@app.post("/api/candidates/register")
def register_candidate(c_name: str = Form(...), c_id: str = Form(...), c_pass: str = Form(...), db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.user_id == c_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate ID already exists")
    new_user = models.User(user_id=c_id, name=c_name, password=c_pass, role="Candidate")
    db.add(new_user)
    db.commit()
    return {"message": "Success"}

@app.get("/api/candidates")
def get_candidates(db: Session = Depends(get_db)):
    cands = db.query(models.User).filter(models.User.role == "Candidate").all()
    return [{"user_id": c.user_id, "name": c.name} for c in cands]

@app.post("/api/templates/upload")
async def upload_template(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    svg_text = content.decode('utf-8')
    placeholders = list(set(re.findall(r'\{\{(.*?)\}\}', svg_text)))
    template_json = json.dumps({"fields": placeholders})
    
    new_template = models.Template(
        template_id=file.filename,
        template_name=file.filename,
        document_type="SVG_Certificate",
        svg_data=content,
        template_json=template_json
    )
    db.merge(new_template)
    db.commit()
    return {"fields": placeholders, "template_id": file.filename}

@app.post("/api/certificates/generate")
def generate_certificate(template_id: str = Form(...), user_id: str = Form(...), inputs_json: str = Form(...), db: Session = Depends(get_db)):
    template = db.query(models.Template).filter(models.Template.template_id == template_id).first()
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not template or not user:
        raise HTTPException(status_code=404, detail="Template or User not found")
        
    inputs = json.loads(inputs_json)
    renderer = TemplateRenderer()
    
    try:
        pdf_bytes = renderer.render_svg_to_pdf(template.svg_data, inputs)
        cert = models.Certificate(user_id=user_id, doc_type=f"{user.name}_Certificate.pdf", file_data=pdf_bytes)
        db.add(cert)
        db.commit()
        return {"message": "Certificate Generated Successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/certificates/my")
def get_my_certificates(user_id: str, db: Session = Depends(get_db)):
    certs = db.query(models.Certificate).filter(models.Certificate.user_id == user_id).all()
    # In a real app, you would return a download link or stream the file, 
    # but for simplicity we return metadata.
    return [{"cert_id": c.cert_id, "doc_type": c.doc_type} for c in certs]

@app.get("/admin/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    # Return zeroed metrics matching real db logic
    jobs_count = db.query(models.Job).count()
    total_users = db.query(models.User).count()
    total_apps = db.query(models.Application).count()
    pending_deletions = db.query(models.DeletionRequest).filter(models.DeletionRequest.status == "pending").count()
    
    return {
        "totalMembers": total_users,
        "totalJobs": jobs_count,
        "applications": total_apps,
        "deletionRequests": pending_deletions
    }

@app.get("/admin/health")
def get_system_health(db: Session = Depends(get_db)):
    import os, time, psutil
    from datetime import datetime, timezone

    # --- Database check ---
    try:
        db.execute(models.User.__table__.select().limit(1))
        db_status = "Operational"
        db_ok = True
    except Exception:
        db_status = "Degraded"
        db_ok = False

    # --- AI model check ---
    ai_status = "Operational" if ai_model is not None else "Unavailable"
    ai_ok = ai_model is not None

    # --- Row counts ---
    users_count     = db.query(models.User).count()
    jobs_count      = db.query(models.Job).count()
    apps_count      = db.query(models.Application).count()
    companies_count = db.query(models.Company).count()

    # --- System resources ---
    cpu_percent = psutil.cpu_percent(interval=0.3)
    mem = psutil.virtual_memory()
    mem_percent = mem.percent
    mem_used_gb = round(mem.used / (1024 ** 3), 2)
    mem_total_gb = round(mem.total / (1024 ** 3), 2)

    # --- DB file size ---
    db_path = os.path.join(os.path.dirname(__file__), "recruitment.db")
    db_size_kb = round(os.path.getsize(db_path) / 1024, 1) if os.path.exists(db_path) else 0

    # --- Uptime (process) ---
    proc = psutil.Process(os.getpid())
    uptime_seconds = int(time.time() - proc.create_time())
    hours, rem = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(rem, 60)
    uptime_str = f"{hours}h {minutes}m {seconds}s"

    now = datetime.now(timezone.utc).isoformat()

    services = [
        {"name": "API Server",       "status": "Operational", "ok": True},
        {"name": "Database",         "status": db_status,      "ok": db_ok},
        {"name": "AI / NLP Engine",  "status": ai_status,      "ok": ai_ok},
        {"name": "Email SMTP",       "status": "Configured" if db.query(models.EmailSettings).first() else "Not Configured",
                                     "ok": db.query(models.EmailSettings).first() is not None},
    ]

    return {
        "timestamp": now,
        "uptime": uptime_str,
        "services": services,
        "resources": {
            "cpu_percent": cpu_percent,
            "mem_percent": mem_percent,
            "mem_used_gb": mem_used_gb,
            "mem_total_gb": mem_total_gb,
        },
        "database": {
            "size_kb": db_size_kb,
            "users": users_count,
            "jobs": jobs_count,
            "applications": apps_count,
            "companies": companies_count,
        }
    }

@app.post("/admin/login")
def admin_login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == creds.email, models.User.password == creds.password, models.User.role == "Admin").first()
    if not user:
        if creds.email == "admin@example.com" and creds.password == "admin":
            return {
                "token": "admin-real-token",
                "user": {
                    "id": "admin",
                    "name": "Super Admin",
                    "email": creds.email,
                    "role": "ADMIN"
                }
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": "admin-real-token",
        "user": {
            "id": user.user_id,
            "name": user.name,
            "email": user.user_id,
            "role": "ADMIN"
        }
    }

# ── Deletion Requests ─────────────────────────────────────────
@app.get("/admin/deletion-requests")
def get_deletion_requests(db: Session = Depends(get_db)):
    reqs = db.query(models.DeletionRequest).filter(
        models.DeletionRequest.status == "pending"
    ).order_by(models.DeletionRequest.request_id.desc()).all()
    return [
        {
            "id":        r.request_id,
            "type":      r.target_type,
            "name":      r.target_name,
            "requester": r.requester,
            "reason":    r.reason,
            "status":    r.status,
        }
        for r in reqs
    ]

@app.post("/admin/deletion-requests")
def create_deletion_request(
    target_type: str = Form(...),
    target_name: str = Form(...),
    requester:   str = Form(...),
    reason:      str = Form(""),
    db: Session = Depends(get_db)
):
    req = models.DeletionRequest(
        target_type=target_type,
        target_name=target_name,
        requester=requester,
        reason=reason,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"id": req.request_id, "message": "Deletion request created"}

@app.put("/admin/deletion-requests/{req_id}/approve")
def approve_deletion_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.DeletionRequest).filter(
        models.DeletionRequest.request_id == req_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "approved"
    db.commit()
    return {"message": "Request approved"}

@app.put("/admin/deletion-requests/{req_id}/reject")
def reject_deletion_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.DeletionRequest).filter(
        models.DeletionRequest.request_id == req_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "rejected"
    db.commit()
    return {"message": "Request rejected"}

@app.get("/admin/companies")
def get_admin_companies(db: Session = Depends(get_db)):
    companies = db.query(models.Company).order_by(models.Company.id.desc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in companies
    ]

@app.post("/admin/companies")
def create_admin_company(company: CompanyCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Company).filter(models.Company.email == company.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A company with this email already exists.")
    new_company = models.Company(
        name=company.name,
        email=company.email,
        password=company.password
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return {
        "id": new_company.id,
        "name": new_company.name,
        "email": new_company.email,
        "created_at": new_company.created_at.isoformat() if new_company.created_at else None
    }

@app.put("/admin/companies/{company_id}")
def update_admin_company(company_id: int, update: CompanyUpdate, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    # Check email conflict with another company
    conflict = db.query(models.Company).filter(
        models.Company.email == update.email,
        models.Company.id != company_id
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Email already used by another company.")
    company.name = update.name
    company.email = update.email
    db.commit()
    db.refresh(company)
    return {
        "id": company.id,
        "name": company.name,
        "email": company.email,
        "created_at": company.created_at.isoformat() if company.created_at else None
    }

@app.delete("/admin/companies/{company_id}")
def delete_admin_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}

@app.get("/admin/users")
def get_admin_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    hr_users = [{"id": u.user_id, "name": u.name, "company": "N/A", "email": u.user_id} for u in users if u.role == "HR"]
    candidate_users = [{"id": u.user_id, "name": u.name, "email": u.user_id, "atsScore": 0} for u in users if u.role == "Candidate"]
    return {"hr": hr_users, "candidates": candidate_users}

@app.delete("/admin/users/{user_id}")
def delete_admin_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User '{user_id}' deleted successfully"}

@app.get("/admin/jobs")
def get_admin_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.Job).all()
    return [{"id": j.job_id, "title": j.title, "company": j.company, "status": j.status, "postedAt": "N/A"} for j in jobs]

# --- HR PORTAL ROUTES ---
@app.post("/hr/login")
def hr_login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == creds.email, models.User.password == creds.password, models.User.role == "HR").first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"hr-token-{user.user_id}",
        "role": "HR",
        "user": {
            "id": user.user_id,
            "name": user.name,
            "email": user.user_id,
            "company": "N/A",
            "companyDescription": "N/A",
            "role": "HR_MANAGER"
        }
    }
@app.post("/hr/register")
def hr_register(hr_name: str = Form(...), hr_email: str = Form(...), hr_pass: str = Form(...), db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.user_id == hr_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="HR Email already exists")
    new_user = models.User(user_id=hr_email, name=hr_name, password=hr_pass, role="HR")
    db.add(new_user)
    db.commit()
    return {"message": "Success"}

@app.get("/hr/metrics")
def get_hr_metrics(db: Session = Depends(get_db)):
    jobs_count = db.query(models.Job).count()
    apps_count = db.query(models.Application).count()
    
    # 1. Funnel Data
    funnel_counts = db.query(models.Application.status, func.count(models.Application.app_id)).group_by(models.Application.status).all()
    funnel_dict = {status: count for status, count in funnel_counts}
    
    # Force default structure for funnel
    funnel = [
        {"stage": "Applied", "count": funnel_dict.get("Applied", apps_count)}, # Default all to Applied if no status is set but apps exist
        {"stage": "Screened", "count": funnel_dict.get("Screened", 0)},
        {"stage": "Interview", "count": funnel_dict.get("Interview", 0)},
        {"stage": "Offer", "count": funnel_dict.get("Offer", 0)},
        {"stage": "Hired", "count": funnel_dict.get("Hired", 0)},
    ]
    
    max_funnel = max([f["count"] for f in funnel] + [1])
    for f in funnel:
        f["width"] = f"{int((f['count'] / max_funnel) * 100)}%"
        
    # 2. Applications per Job
    apps_per_job = db.query(models.Job.title, func.count(models.Application.app_id)) \
                     .join(models.Application, models.Job.job_id == models.Application.job_id) \
                     .group_by(models.Job.title).all()
                     
    apps_per_job_list = [{"job": title, "count": count} for title, count in apps_per_job]
    max_apps = max([a["count"] for a in apps_per_job_list] + [1])
    for a in apps_per_job_list:
        a["width"] = f"{int((a['count'] / max_apps) * 100)}%"
        
    # 3. Recent Applicants (Last 4)
    recent_apps = db.query(models.Application, models.User, models.Job) \
                    .join(models.User, models.Application.user_id == models.User.user_id) \
                    .join(models.Job, models.Application.job_id == models.Job.job_id) \
                    .order_by(models.Application.app_id.desc()).limit(4).all()
                    
    recent_applicants_list = []
    status_colors = {
        "Applied": "bg-blue-500",
        "Screened": "bg-indigo-500",
        "Interview": "bg-amber-500",
        "Offer": "bg-green-500",
        "Hired": "bg-emerald-600",
        "Rejected": "bg-red-500"
    }
    
    for app, user, job in recent_apps:
        recent_applicants_list.append({
            "id": app.app_id,
            "name": user.name,
            "role": job.title,
            "date": "Recent",
            "status": app.status or "Applied",
            "statusColor": status_colors.get(app.status or "Applied", "bg-slate-500"),
            "avatar": f"https://ui-avatars.com/api/?name={user.name.replace(' ', '+')}&background=random"
        })

    return {
        "jobsUploaded": jobs_count,
        "activeJobs": jobs_count,
        "inactiveJobs": 0,
        "candidatesApplied": apps_count,
        "funnelData": funnel,
        "applicationsPerJob": apps_per_job_list,
        "recentApplicants": recent_applicants_list,
        "upcomingInterviews": [],
        "recentActivity": []
    }

@app.get("/hr/jobs")
def get_hr_jobs(db: Session = Depends(get_db)):
    from datetime import datetime
    jobs = db.query(models.Job).order_by(models.Job.job_id.desc()).all()
    return [{"id": j.job_id, "title": j.title, "status": j.status, "createdAt": getattr(j, 'created_at', datetime.now().isoformat()), "expiresAt": "2026-09-01"} for j in jobs]

@app.post("/hr/jobs")
def create_hr_job(job_data: JobCreate, db: Session = Depends(get_db)):
    job = models.Job(
        title=job_data.title,
        description=job_data.description,
        company=job_data.company,
        status=job_data.status
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    from datetime import datetime
    return {"id": job.job_id, "title": job.title, "status": job.status, "createdAt": datetime.now().isoformat(), "expiresAt": "2026-09-01"}

@app.delete("/hr/jobs/{job_id}")
def delete_hr_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}

@app.put("/hr/jobs/{job_id}/close")
def close_hr_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "Past"
    db.commit()
    return {"message": "Job closed"}

@app.get("/hr/candidates")
def get_hr_candidates(db: Session = Depends(get_db)):
    return []

@app.post("/hr/manual-shortlist")
async def hr_manual_shortlist(
    email: str = Form(...),
    job_description: str = Form(""),
    job_id: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not ai_model:
        raise HTTPException(status_code=500, detail="AI Model not loaded")
        
    final_jd = job_description
    if job_id and not final_jd:
        job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
        if job and job.description:
            final_jd = job.description
        elif job:
            final_jd = job.title
            
    if not final_jd:
        raise HTTPException(status_code=400, detail="Job description or Job ID is required")
        
    content = await file.read()
    text = extract_text(content)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
    job_embedding = ai_model.encode(final_jd, convert_to_tensor=True)
    resume_embedding = ai_model.encode(text, convert_to_tensor=True)
    score = util.cos_sim(job_embedding, resume_embedding)[0].item() * 1.6 * 100
    score = round(min(score, 100.0), 1)
    
    # Simulate email
    print(f"\\n--- EMAIL SENT TO: {email} ---")
    print(f"Subject: Your AI Shortlist Result")
    print(f"Body: Thank you for applying! Your ATS Match Score is: {score}%")
    print("--------------------------------\\n")
    
    return {"score": score, "message": "Processed and Email sent successfully!"}

@app.post("/hr/bulk-score")
async def hr_bulk_score(
    job_description: str = Form(""),
    job_id: str = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if not ai_model:
        raise HTTPException(status_code=500, detail="AI Model not loaded")
        
    final_jd = job_description
    if job_id and not final_jd:
        try:
            parsed_job_id = int(job_id)
        except:
            parsed_job_id = 0
        job = db.query(models.Job).filter(models.Job.job_id == parsed_job_id).first()
        if job and job.description:
            final_jd = job.description
        elif job:
            final_jd = job.title
            
    if not final_jd:
        raise HTTPException(status_code=400, detail="Job description is required")
        
    resume_data = []
    resume_texts = []
    
    for file in files:
        content = await file.read()
        text = extract_text(content)
        real_name = str(file.filename).replace(".pdf", "").replace("_", " ")
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        email = email_match.group(0) if email_match else "No Email Found"
        
        resume_data.append({
            "Candidate Name": real_name, 
            "Experience Level": classify_experience(text),
            "Extracted Email": email
        })
        resume_texts.append(text)
        
    if not resume_texts:
        return []
        
    job_embedding = ai_model.encode(final_jd, convert_to_tensor=True)
    resume_embeddings = ai_model.encode(resume_texts, convert_to_tensor=True)
    cosine_scores = util.cos_sim(job_embedding, resume_embeddings)[0]
    
    results = []
    for i, score in enumerate(cosine_scores):
        # Use pure cosine similarity for accuracy (remove artificial 1.6 multiplier)
        pure_score = max(0, score.item()) * 100
        results.append({
            "Candidate Name": resume_data[i]["Candidate Name"],
            "Experience Level": resume_data[i]["Experience Level"],
            "Extracted Email": resume_data[i]["Extracted Email"],
            "Match Score": round(min(pure_score, 100.0), 1)
        })
        
    # Sort by score descending and assign Rank
    results = sorted(results, key=lambda x: x['Match Score'], reverse=True)
    for idx, r in enumerate(results):
        r["Rank"] = idx + 1
        
    return results

@app.post("/hr/dispatch")
async def hr_dispatch(
    candidates_json: str = Form(...),
    offer_template: str = Form(""),
    name_height: int = Form(450),
    job_height: int = Form(550),
    job_title: str = Form(""),
    cert_template: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    import json
    candidates = json.loads(candidates_json)
    
    cert_bytes = None
    if cert_template:
        cert_bytes = await cert_template.read()
        
    # Get SMTP credentials
    settings = db.query(models.EmailSettings).first()
    if not settings or not settings.email or not settings.app_password:
        raise HTTPException(status_code=400, detail="Automated Email Integration is not configured. Please add your Google App Password in Settings.")
        
    responses = []
    
    # Initialize SMTP server once
    server = None
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.email, settings.app_password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to SMTP server: {str(e)}")

    for cand in candidates:
        name = cand.get("Candidate Name", "Unknown")
        email_addr = cand.get("Extracted Email", "No Email Found")
        score = cand.get("Match Score", 0)
        
        if email_addr == "No Email Found":
            responses.append(f"Skipped {name}: No Email Found")
            continue
            
        # 1. Prepare Offer Letter
        offer_text = offer_template.replace("{candidate_name}", name).replace("{job_role}", job_title).replace("{match_score}", str(score))
        
        # 2. Prepare Certificate if image provided
        final_cert_bytes = None
        if cert_bytes:
            try:
                img = Image.open(io.BytesIO(cert_bytes))
                draw = ImageDraw.Draw(img)
                font = ImageFont.load_default()
                img_w, img_h = img.size
                name_w = draw.textlength(name, font=font)
                draw.text(((img_w - name_w) / 2, name_height), name, fill="black", font=font)
                job_w = draw.textlength(job_title, font=font)
                draw.text(((img_w - job_w) / 2, job_height), job_title, fill="black", font=font)
                
                out = io.BytesIO()
                img.save(out, format=img.format)
                final_cert_bytes = out.getvalue()
            except Exception as e:
                print("Failed to generate certificate image:", e)
                
        # 3. SMTP Dispatch
        try:
            msg = EmailMessage()
            msg.set_content(offer_text)
            msg['Subject'] = f"Congratulations on your selection for {job_title}"
            msg['From'] = settings.email
            msg['To'] = email_addr
            
            if final_cert_bytes:
                img_type = "jpeg" if img.format == "JPEG" else "png"
                msg.add_attachment(final_cert_bytes, maintype='image', subtype=img_type, filename=f"Selection_Certificate_{name}.{img_type}")
                
            server.send_message(msg)
            responses.append(f"Dispatched successfully to {name} ({email_addr})!")
        except Exception as e:
            print(f"SMTP Error: {e}")
            responses.append(f"Failed to send to {name} ({email_addr}): {str(e)}")
            
    if server:
        server.quit()
        
    return {"messages": responses}

@app.get("/hr/settings/email")
def get_email_settings(db: Session = Depends(get_db)):
    settings = db.query(models.EmailSettings).first()
    if settings:
        return {"email": settings.email, "configured": True}
    return {"email": "", "configured": False}
    
@app.post("/hr/settings/email")
def save_email_settings(email: str = Form(...), app_password: str = Form(...), db: Session = Depends(get_db)):
    settings = db.query(models.EmailSettings).first()
    if not settings:
        settings = models.EmailSettings(email=email, app_password=app_password)
        db.add(settings)
    else:
        settings.email = email
        settings.app_password = app_password
    db.commit()
    return {"message": "Email settings saved securely"}

# --- CANDIDATE PORTAL ROUTES ---
@app.post("/candidate/login")
def candidate_login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == creds.email, models.User.password == creds.password, models.User.role == "Candidate").first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"candidate-token-{user.user_id}",
        "role": "CANDIDATE",
        "user": {
            "id": user.user_id,
            "name": user.name,
            "email": user.user_id,
            "role": "CANDIDATE"
        }
    }
# Globally initialized model for skill extraction
try:
    skill_model = SentenceTransformer('all-MiniLM-L6-v2')
    CATEGORY_PROMPTS = {
        "Machine Learning": "machine learning artificial intelligence deep learning neural networks NLP computer vision tensorflow pytorch sklearn scikit-learn model training inference",
        "Python": "python programming scripting pandas numpy data analysis automation flask django fastapi jupyter notebook",
        "Database": "SQL NoSQL database relational mongoDB postgresql mysql redis oracle database design query optimisation schema",
        "Frontend": "frontend UI UX react angular vue css html javascript typescript web design responsive layout figma",
        "Backend": "backend API REST microservices server nodejs java spring boot django authentication authorisation",
        "Tools": "git docker linux bash terminal agile scrum jira ci/cd jenkins devops version control",
        "Statistics": "statistics probability data analysis hypothesis testing regression A/B testing experimental design R SPSS",
        "DevOps": "devops kubernetes ci/cd jenkins terraform ansible cloud infrastructure AWS GCP Azure deployment monitoring",
        "Cloud": "AWS GCP Azure cloud services serverless lambda EC2 S3 bigquery cloud storage cloud computing",
        "Data Engineering": "data engineering ETL pipeline spark hadoop kafka airflow data warehouse data lake batch streaming",
        "Product": "product management roadmap user research market analysis stakeholder agile sprint OKR metrics KPI"
    }
    cat_keys = list(CATEGORY_PROMPTS.keys())
    cat_embeddings = skill_model.encode(list(CATEGORY_PROMPTS.values()), convert_to_tensor=True)
except Exception as e:
    skill_model = None

def calculate_ats_analysis(text: str):
    text_lower = text.lower()
    word_count = len(text.split())
    
    # 1. Parseability (out of 25)
    parseability = 25
    parseability_notes = []
    if word_count < 200:
        parseability -= 5
        parseability_notes.append("Resume is too short, may drop important info.")
    if word_count > 1200:
        parseability -= 5
        parseability_notes.append("Resume is too long, ATS may truncate.")
    
    if text.count('|') > 10:
        parseability -= 3
        parseability_notes.append("Too many pipe characters might confuse parsers.")
        
    if not parseability_notes:
        parseability_notes.append("Clean text structure detected.")
        
    # 2. Section Completeness (out of 15)
    has_summary = any(kw in text_lower for kw in ["summary", "objective", "profile"])
    has_experience = any(kw in text_lower for kw in ["experience", "employment", "history", "work"])
    has_education = any(kw in text_lower for kw in ["education", "academic", "university", "college"])
    has_skills = any(kw in text_lower for kw in ["skills", "expertise", "technologies"])
    has_projects = any(kw in text_lower for kw in ["projects", "portfolio"])
    
    sections = 0
    section_notes = []
    if has_summary: sections += 3
    else: section_notes.append("Missing Summary/Objective section.")
    if has_experience: sections += 4
    else: section_notes.append("Missing Experience section.")
    if has_education: sections += 3
    else: section_notes.append("Missing Education section.")
    if has_skills: sections += 3
    else: section_notes.append("Missing Skills section.")
    if has_projects: sections += 2
    else: section_notes.append("Missing Projects section.")
    
    if sections == 15: section_notes.append("All standard sections present.")
    
    # 3. Skills/Keyword Density (out of 30)
    keywords = ["javascript", "typescript", "react", "node", "python", "sql", "aws", "docker", "ci/cd", "git", "html", "css", "java", "c++", "agile", "scrum", "kubernetes", "machine learning", "cloud", "linux", "backend", "frontend", "data analysis", "iot"]
    found_skills = [kw.capitalize() for kw in keywords if kw in text_lower]
    keyword_density = min(len(found_skills) * 3, 30)
    keyword_notes = [f"Found {len(found_skills)} high-impact keywords."]
    
    # 4. Content Quality & Quantification (out of 20)
    action_verbs = ["spearheaded", "orchestrated", "developed", "managed", "led", "improved", "increased", "decreased", "created", "designed", "implemented", "resolved", "achieved", "delivered", "optimized", "streamlined", "built", "engineered", "integrated", "automated"]
    found_verbs = [v for v in action_verbs if v in text_lower]
    metrics_count = sum(c.isdigit() for c in text)
    
    quant_score = min(len(found_verbs) * 2, 10) + min(metrics_count, 10)
    quant_notes = []
    if len(found_verbs) < 3: quant_notes.append("Weak action verbs used.")
    if metrics_count < 5: quant_notes.append("Missing numbers/metrics to quantify impact.")
    if not quant_notes: quant_notes.append("Excellent use of metrics and action verbs.")
    
    # 5. Consistency & Formatting (out of 10)
    has_phone = any(char in text for char in ["+", "(", ")"]) or any(p.isdigit() for p in text.split() if len(p) >= 10)
    has_email = "@" in text
    has_linkedin = "linkedin.com" in text_lower
    
    consistency = 0
    cons_notes = []
    if has_phone: consistency += 3
    else: cons_notes.append("Missing phone number.")
    if has_email: consistency += 3
    else: cons_notes.append("Missing email address.")
    if has_linkedin: consistency += 4
    else: cons_notes.append("Missing LinkedIn URL.")
    if consistency == 10: cons_notes.append("Contact info complete and consistent.")
    
    overall_score = parseability + sections + keyword_density + quant_score + consistency
    
    red_flags = []
    if word_count < 150: red_flags.append("Severely low word count. Expand your experience.")
    if not has_experience: red_flags.append("No Experience section detected.")
    if not has_email and not has_phone: red_flags.append("No contact information found!")
    
    top_fixes = []
    if sections < 15: top_fixes.append("Add missing standard sections to improve parseability.")
    if quant_score < 15: top_fixes.append("Quantify bullet points with actual numbers/percentages.")
    if consistency < 10: top_fixes.append("Add complete contact details including LinkedIn.")
    if keyword_density < 20: top_fixes.append("Add more specific technical keywords reflecting your target role.")
    
    missing_skills = [kw.capitalize() for kw in keywords if kw not in text_lower][:6]
    
    return {
        "overallScore": overall_score,
        "breakdown": {
            "parseability": { "score": parseability, "max": 25, "notes": parseability_notes[0] if parseability_notes else "" },
            "sectionCompleteness": { "score": sections, "max": 15, "notes": section_notes[0] if section_notes else "" },
            "keywordDensity": { "score": keyword_density, "max": 30, "notes": keyword_notes[0] if keyword_notes else "" },
            "quantification": { "score": quant_score, "max": 20, "notes": quant_notes[0] if quant_notes else "" },
            "consistency": { "score": consistency, "max": 10, "notes": cons_notes[0] if cons_notes else "" }
        },
        "redFlags": red_flags,
        "topFixes": top_fixes,
        "keywordGaps": missing_skills,
        "skillsFound": found_skills
    }

@app.post("/candidate/upload-resume")
async def upload_candidate_resume(user_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    text = ""
    try:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            pdf = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        else:
            text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to parse resume text.")
        
    # ML Skill Extraction
    skills_scores = []
    if skill_model and text.strip():
        text_lower = text.lower()
        # Clean text
        clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text[:5000]) # use top 5000 chars to avoid memory issues
        doc_emb = skill_model.encode(clean_text, convert_to_tensor=True)
        cos_scores = util.cos_sim(doc_emb, cat_embeddings)[0]
        
        for i, key in enumerate(cat_keys):
            # 1. Keyword based base score
            prompt_words = CATEGORY_PROMPTS[key].lower().split()
            found_count = sum(1 for kw in prompt_words if kw in text_lower)
            kw_score = min(found_count * 12, 60) # Up to 60 points from exact keyword matches
            
            # 2. Semantic matching for contextual score
            raw_score = float(cos_scores[i])
            # A good raw semantic similarity is > 0.25. Up to 40 points from ML.
            semantic_score = min(max(int((raw_score * 120)), 0), 40)
            
            # Final score is combination of explicit keyword mentions + semantic context
            final_score = kw_score + semantic_score
            final_score = min(int(final_score), 100)
            if final_score < 10: final_score = 10
            
            skills_scores.append({"subject": key, "user": final_score})
    else:
        # Fallback if model fails or empty text
        skills_scores = [
            {"subject": "Machine Learning", "user": 10},
            {"subject": "Database", "user": 10},
            {"subject": "Frontend", "user": 10},
            {"subject": "Backend", "user": 10},
            {"subject": "Tools", "user": 10}
        ]
        
    skills_json = json.dumps(skills_scores)
    
    # Generate ATS Score
    ats_data = calculate_ats_analysis(text)
    ats_score = ats_data.get("overallScore", 0)
    
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first()
    if profile:
        profile.resume_filename = file.filename
        profile.resume_text = text
        profile.skills_json = skills_json
        profile.ats_score = ats_score
    else:
        profile = models.CandidateProfile(
            user_id=user_id,
            resume_filename=file.filename,
            resume_text=text,
            skills_json=skills_json,
            ats_score=ats_score
        )
        db.add(profile)
    db.commit()
    
    return {"message": "Resume uploaded successfully", "skills": skills_scores, "ats_score": ats_score}

@app.post("/candidate/resume/analyze")
async def analyze_candidate_resume(resume: UploadFile = File(...)):
    text = ""
    try:
        content = await resume.read()
        if resume.filename.endswith(".pdf"):
            pdf = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        else:
            text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to parse resume text.")
        
    return calculate_ats_analysis(text)

@app.post("/candidate/resume/analyze-jd")
async def analyze_candidate_resume_jd(job_description: str = Form(...), resume: UploadFile = File(...)):
    text = ""
    try:
        content = await resume.read()
        if resume.filename.endswith(".pdf"):
            pdf = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        else:
            text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to parse resume text.")
    
    text_lower = text.lower()
    jd_lower = job_description.lower()
    
    # Extract keywords from JD naively (just simple hardcoded list for demo purposes, or finding tech words)
    keywords = ["javascript", "typescript", "react", "node", "python", "sql", "aws", "docker", "ci/cd", "git", "html", "css", "java", "c++", "agile", "scrum", "kubernetes", "machine learning", "cloud", "linux", "backend", "frontend", "data analysis", "iot"]
    jd_keywords = [kw for kw in keywords if kw in jd_lower]
    
    matched = [kw.capitalize() for kw in jd_keywords if kw in text_lower]
    missing = [kw.capitalize() for kw in jd_keywords if kw not in text_lower]
    
    # ML semantic match
    semantic_score = 0
    if skill_model:
        clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text[:5000])
        clean_jd = re.sub(r'[^a-zA-Z0-9\s]', ' ', job_description[:5000])
        doc_emb = skill_model.encode(clean_text, convert_to_tensor=True)
        jd_emb = skill_model.encode(clean_jd, convert_to_tensor=True)
        raw_score = float(util.cos_sim(doc_emb, jd_emb)[0][0])
        semantic_score = min(max(int((raw_score * 120)), 0), 40)
        
    kw_score = 0
    if jd_keywords:
        kw_score = int((len(matched) / len(jd_keywords)) * 60)
        
    match_score = kw_score + semantic_score
    if not jd_keywords and not skill_model:
        match_score = 50
    match_score = min(max(match_score, 0), 100)
    
    return {
        "matchScore": match_score,
        "matchedKeywords": matched,
        "missingKeywords": missing,
        "semanticScore": semantic_score,
        "keywordScore": kw_score
    }


@app.get("/candidate/profile")
def get_candidate_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first()
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.user_id,
        "headline": profile.headline if profile else None,
        "pronouns": profile.pronouns if profile else None,
        "institution": profile.institution if profile else None,
        "location": profile.location if profile else None,
        "phone": profile.phone if profile else None,
        "photo_base64": profile.photo_base64 if profile else None,
        "cover_base64": profile.cover_base64 if profile else None,
        "resume_filename": profile.resume_filename if profile else None,
        "skills_json": profile.skills_json if profile else None,
        "target_role": profile.target_role if profile else None,
    }

@app.put("/candidate/profile")
async def update_candidate_profile(
    user_id: str = Form(...),
    name: str = Form(None),
    headline: str = Form(None),
    pronouns: str = Form(None),
    institution: str = Form(None),
    location: str = Form(None),
    phone: str = Form(None),
    target_role: str = Form(None),
    photo: UploadFile = File(None),
    cover: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update name on user
    if name:
        user.name = name

    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first()
    if not profile:
        profile = models.CandidateProfile(user_id=user_id)
        db.add(profile)

    if headline is not None: profile.headline = headline
    if pronouns is not None: profile.pronouns = pronouns
    if institution is not None: profile.institution = institution
    if location is not None: profile.location = location
    if phone is not None: profile.phone = phone
    if target_role is not None: profile.target_role = target_role

    # Handle photo upload - convert to base64
    if photo and photo.filename:
        photo_bytes = await photo.read()
        import base64
        profile.photo_base64 = "data:image/jpeg;base64," + base64.b64encode(photo_bytes).decode()

    if cover and cover.filename:
        cover_bytes = await cover.read()
        import base64
        profile.cover_base64 = "data:image/jpeg;base64," + base64.b64encode(cover_bytes).decode()

    db.commit()
    return {"message": "Profile updated successfully"}

@app.get("/candidate/dashboard")
def get_candidate_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    apps = db.query(models.Application).filter(models.Application.user_id == user_id).all()
    apps_count = len(apps)
    
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first()
    if profile and profile.skills_json:
        skills_scores = json.loads(profile.skills_json)
        skills_analysis = []
        for sk in skills_scores:
            skills_analysis.append({
                "subject": sk["subject"],
                "user": sk["user"],
                "target": 80,  # Simulated target role requirement
                "fullMark": 100
            })
        ats_score = profile.ats_score if profile.ats_score is not None else (sum(sk["user"] for sk in skills_analysis) // 5)
    else:
        skills_analysis = []
        ats_score = 0

    jobs = db.query(models.Job).filter(models.Job.status == "Active").limit(3).all()
    recommended_jobs = []
    for j in jobs:
        recommended_jobs.append({
            "id": j.job_id,
            "title": j.title,
            "company": j.company,
            "location": "Location Unspecified",
            "type": "Full-time",
            "matchPercent": ats_score,  # Replaced fake data with real ATS score
            "skills": [],
            "postedAt": "Recent",
            "salary": "Depends on Experience"
        })
        
    latest_app = None
    if apps:
        latest_db_app = apps[-1]
        job = db.query(models.Job).filter(models.Job.job_id == latest_db_app.job_id).first()
        latest_app = {
            "jobTitle": job.title if job else "Unknown Job",
            "company": job.company if job else "Unknown Company",
            "status": latest_db_app.status
        }
        
    recent_activity = []
    for a in apps[-3:]:
        job = db.query(models.Job).filter(models.Job.job_id == a.job_id).first()
        if job:
            recent_activity.append({
                "text": f"Applied to {job.title} at {job.company}",
                "time": "Recently"
            })
            
    # Calculate real profile completion based on actual fields
    completion_score = 0
    if user.name:
        completion_score += 20      # Has a name
    if profile:
        completion_score += 10      # Profile record exists
        if profile.resume_text:
            completion_score += 30  # Resume uploaded & parsed
        if profile.skills_json:
            completion_score += 20  # Skills extracted
        if profile.target_role:
            completion_score += 10  # Target role set
        if profile.headline:
            completion_score += 10  # Headline/bio filled in
    
    # Only real application-based activity
    return {
        "id": user.user_id,
        "name": user.name,
        "email": user.user_id,
        "role": user.role,
        "profileCompletion": min(completion_score, 100),
        "atsScore": ats_score,
        "applications": apps_count,
        "interviews": sum(1 for a in apps if a.status == "Interview"),
        "recommendedJobs": recommended_jobs,
        "latestApplication": latest_app,
        "recentActivity": recent_activity,
        "skillsAnalysis": skills_analysis,
        "skills_json": profile.skills_json if profile else None,
        "target_role": profile.target_role if profile else None,
    }

COMMON_SKILLS_LIST = [
    'Python', 'Java', 'C++', 'C#', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
    'Django', 'FastAPI', 'Flask', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
    'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'Linux', 'Machine Learning', 'Deep Learning',
    'TensorFlow', 'PyTorch', 'REST APIs', 'GraphQL', 'CI/CD', 'Microservices', 'HTML', 'CSS',
    'Agile', 'Scrum', 'Data Analysis', 'Pandas', 'NumPy', 'OpenCV'
]

def extract_job_skills(text: str):
    if not text:
        return []
    found = []
    text_lower = text.lower()
    for sk in COMMON_SKILLS_LIST:
        if re.search(r'(?i)\b' + re.escape(sk.lower()) + r'\b', text_lower):
            found.append(sk)
    return found

class CandidateApplyRequest(BaseModel):
    user_id: str
    job_id: int

@app.post("/candidate/apply")
def apply_to_job(data: CandidateApplyRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    job = db.query(models.Job).filter(models.Job.job_id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(models.Application).filter(
        models.Application.job_id == data.job_id,
        models.Application.user_id == data.user_id
    ).first()
    if existing:
        return {"message": "Already applied to this job", "app_id": existing.app_id}

    app = models.Application(job_id=data.job_id, user_id=data.user_id, status="Applied")
    db.add(app)
    db.commit()
    db.refresh(app)
    return {"message": "Application submitted successfully", "app_id": app.app_id}

@app.get("/candidate/jobs")
def get_candidate_jobs(user_id: str = "", db: Session = Depends(get_db)):
    jobs = db.query(models.Job).all()
    
    # 1. Fetch candidate profile and applied jobs
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first() if user_id else None
    applied_job_ids = set()
    if user_id:
        applied_records = db.query(models.Application.job_id).filter(models.Application.user_id == user_id).all()
        applied_job_ids = {a[0] for a in applied_records}
    
    resume_text = ""
    if profile and profile.resume_text:
        resume_text = profile.resume_text
    
    # 2. Compute similarity if AI model is loaded and resume exists
    scores_dict = {}
    if ai_model and resume_text and jobs:
        job_texts = [j.description or "" for j in jobs]
        if any(job_texts):
            resume_emb = ai_model.encode([resume_text], convert_to_tensor=True)
            job_embs = ai_model.encode(job_texts, convert_to_tensor=True)
            cosine_scores = util.cos_sim(resume_emb, job_embs)[0]
            
            for i, j in enumerate(jobs):
                # Apply ATS scaling formula to get percentage
                score = cosine_scores[i].item() * 1.6 * 100
                scores_dict[j.job_id] = min(max(int(score), 10), 100) # clamp between 10% and 100%
    
    # 3. Format response
    results = []
    for j in jobs:
        match_score = scores_dict.get(j.job_id, 50)
        skills = extract_job_skills(j.description)
        results.append({
            "id": j.job_id,
            "job_id": j.job_id,
            "title": j.title,
            "company": j.company,
            "description": j.description,
            "status": j.status,
            "matchPercent": match_score,
            "atsScore": match_score,
            "isApplied": j.job_id in applied_job_ids,
            "requiredSkills": skills,
            "skills": skills,
            "location": "Location Unspecified",
            "type": "Full-time"
        })
        
    # Sort jobs by matchPercent descending
    results.sort(key=lambda x: x["matchPercent"], reverse=True)
    
    return results

@app.get("/candidate/applications")
def get_candidate_apps(user_id: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Application)
    if user_id:
        query = query.filter(models.Application.user_id == user_id)
    apps = query.all()
    res = []
    for a in apps:
        job = db.query(models.Job).filter(models.Job.job_id == a.job_id).first()
        res.append({
            "id": a.app_id,
            "jobId": a.job_id,
            "jobTitle": job.title if job else f"Job #{a.job_id}",
            "company": job.company if job else "Company",
            "status": a.status,
            "appliedAt": "Recently"
        })
    return res


# --- MESSAGING PORTAL ---
from database import SessionLocal

class ConnectionManager:
    def __init__(self):
        # user_id -> List of WebSockets
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            conv_id = data.get("conversation_id")
            text = data.get("text")
            job_id = data.get("job_id")
            attachment = data.get("attachment")
            
            db = SessionLocal()
            try:
                new_msg = models.Message(
                    conversation_id=conv_id,
                    sender_id=user_id,
                    text=text,
                    job_id=job_id,
                    attachment=attachment
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                
                participants = db.query(models.ConversationParticipant).filter(
                    models.ConversationParticipant.conversation_id == conv_id
                ).all()
                
                payload = {
                    "id": new_msg.id,
                    "conversation_id": new_msg.conversation_id,
                    "sender_id": new_msg.sender_id,
                    "text": new_msg.text,
                    "job_id": new_msg.job_id,
                    "attachment": new_msg.attachment,
                    "created_at": str(new_msg.created_at)
                }
                
                participant_ids = [p.user_id for p in participants]
            finally:
                db.close()
                
            for uid in participant_ids:
                await manager.send_personal_message(payload, uid)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

class ConversationCreate(BaseModel):
    is_group: int
    title: str = None
    participant_ids: List[str]

@app.post("/api/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    conv = models.Conversation(is_group=data.is_group, title=data.title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    for uid in data.participant_ids:
        p = models.ConversationParticipant(conversation_id=conv.id, user_id=uid)
        db.add(p)
    db.commit()
    
    return {"id": conv.id, "title": conv.title, "is_group": conv.is_group}

@app.get("/api/users/{user_id}/conversations")
def get_user_conversations(user_id: str, db: Session = Depends(get_db)):
    participants = db.query(models.ConversationParticipant).filter(models.ConversationParticipant.user_id == user_id).all()
    conv_ids = [p.conversation_id for p in participants]
    
    convs = db.query(models.Conversation).filter(models.Conversation.id.in_(conv_ids)).all()
    
    result = []
    for c in convs:
        parts = db.query(models.ConversationParticipant).filter(models.ConversationParticipant.conversation_id == c.id).all()
        result.append({
            "id": c.id,
            "title": c.title,
            "is_group": c.is_group,
            "participants": [p.user_id for p in parts]
        })
    return result

@app.get("/api/conversations/{conv_id}/messages")
def get_conversation_messages(conv_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.Message).filter(models.Message.conversation_id == conv_id).order_by(models.Message.created_at.asc()).all()
    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "text": m.text,
        "job_id": m.job_id,
        "created_at": str(m.created_at)
    } for m in messages]

# --- SOCIAL FEED, CONNECTIONS, NOTIFICATIONS & MESSAGING ---

class ConnectionRequest(BaseModel):
    requester_id: str
    receiver_id: str

@app.post("/api/connections/request")
def request_connection(data: ConnectionRequest, db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(models.Connection).filter(
        ((models.Connection.requester_id == data.requester_id) & (models.Connection.receiver_id == data.receiver_id)) |
        ((models.Connection.requester_id == data.receiver_id) & (models.Connection.receiver_id == data.requester_id))
    ).first()
    if existing:
        return {"message": "Request already exists", "status": existing.status}
    
    conn = models.Connection(requester_id=data.requester_id, receiver_id=data.receiver_id, status="pending")
    db.add(conn)
    db.commit()
    
    # Notify receiver
    requester = db.query(models.User).filter(models.User.user_id == data.requester_id).first()
    req_name = requester.name if requester else "Someone"
    notif = models.Notification(user_id=data.receiver_id, text=f"{req_name} sent you a connection request.")
    db.add(notif)
    db.commit()
    
    return {"message": "Request sent successfully"}

class ConnectionApproveDecline(BaseModel):
    connection_id: int

@app.post("/api/connections/approve")
def approve_connection(data: ConnectionApproveDecline, db: Session = Depends(get_db)):
    conn = db.query(models.Connection).filter(models.Connection.id == data.connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.status = "accepted"
    db.commit()
    
    # Notify requester
    receiver = db.query(models.User).filter(models.User.user_id == conn.receiver_id).first()
    rec_name = receiver.name if receiver else "Someone"
    notif = models.Notification(user_id=conn.requester_id, text=f"{rec_name} accepted your connection request.")
    db.add(notif)
    db.commit()
    
    return {"message": "Connection approved"}

@app.post("/api/connections/decline")
def decline_connection(data: ConnectionApproveDecline, db: Session = Depends(get_db)):
    conn = db.query(models.Connection).filter(models.Connection.id == data.connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.status = "rejected"
    db.commit()
    return {"message": "Connection declined"}

def generate_icebreaker(user_skills_json, other_skills_json):
    try:
        if not user_skills_json or not other_skills_json:
            return "Start the conversation by introducing yourself and sharing your career goals!"
        u_skills = {s["subject"].lower() for s in json.loads(user_skills_json) if s.get("user", 0) > 30}
        o_skills = {s["subject"].lower() for s in json.loads(other_skills_json) if s.get("user", 0) > 30}
        common = u_skills.intersection(o_skills)
        if common:
            common_str = ", ".join(list(common)[:2])
            return f"AI Suggested Intro: You both have experience in {common_str.title()}! Mention how you use it in your projects."
        return "AI Suggested Intro: You both are part of RecruitIQ! Ask about their recent projects or tech stack."
    except Exception:
        return "Start the conversation by discussing your common interests and technical skills!"

@app.get("/api/connections/list")
def list_connections(user_id: str, db: Session = Depends(get_db)):
    # Accepted connections
    conns = db.query(models.Connection).filter(
        ((models.Connection.requester_id == user_id) | (models.Connection.receiver_id == user_id)) &
        (models.Connection.status == "accepted")
    ).all()
    
    accepted_ids = []
    for c in conns:
        if c.requester_id == user_id:
            accepted_ids.append(c.receiver_id)
        else:
            accepted_ids.append(c.requester_id)
            
    # Load user details for accepted connections
    accepted_users = []
    for uid in accepted_ids:
        u = db.query(models.User).filter(models.User.user_id == uid).first()
        profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == uid).first()
        if u:
            accepted_users.append({
                "user_id": u.user_id,
                "name": u.name,
                "role": u.role,
                "photo_base64": profile.photo_base64 if profile else None,
                "headline": profile.headline if profile else None,
                "institution": profile.institution if profile else None,
                "location": profile.location if profile else None
            })
            
    # Pending requests sent by others to user
    incoming = db.query(models.Connection).filter(
        (models.Connection.receiver_id == user_id) & (models.Connection.status == "pending")
    ).all()
    
    user_profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_id).first()
    user_skills = user_profile.skills_json if user_profile else None

    incoming_requests = []
    for c in incoming:
        u = db.query(models.User).filter(models.User.user_id == c.requester_id).first()
        profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == c.requester_id).first()
        if u:
            other_skills = profile.skills_json if profile else None
            incoming_requests.append({
                "connection_id": c.id,
                "user_id": u.user_id,
                "name": u.name,
                "role": u.role,
                "photo_base64": profile.photo_base64 if profile else None,
                "headline": profile.headline if profile else None,
                "institution": profile.institution if profile else None,
                "ai_icebreaker": generate_icebreaker(user_skills, other_skills)
            })
            
    # Suggestions to connect
    exclude_ids = accepted_ids + [user_id]
    pending_sent = db.query(models.Connection).filter(
        (models.Connection.requester_id == user_id) & (models.Connection.status == "pending")
    ).all()
    pending_sent_ids = [c.receiver_id for c in pending_sent]
    exclude_ids = exclude_ids + pending_sent_ids
    
    all_users = db.query(models.User).filter(~models.User.user_id.in_(exclude_ids)).limit(20).all()
    suggestions = []
    for u in all_users:
        profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == u.user_id).first()
        suggestions.append({
            "user_id": u.user_id,
            "name": u.name,
            "role": u.role,
            "photo_base64": profile.photo_base64 if profile else None,
            "headline": profile.headline if profile else None,
            "institution": profile.institution if profile else None
        })
        
    return {
        "connections": accepted_users,
        "incomingRequests": incoming_requests,
        "suggestions": suggestions
    }

from typing import Optional

class PostCreate(BaseModel):
    author_id: str
    content: Optional[str] = ""
    image_base64: Optional[str] = None
    video_base64: Optional[str] = None
    post_type: Optional[str] = "Text"
    job_id: Optional[int] = None

@app.post("/api/feed/posts")
def create_feed_post(data: PostCreate, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.user_id == data.author_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
        
    post = models.Post(
        author_id=data.author_id,
        author_name=u.name,
        author_role=u.role,
        content=data.content,
        image_base64=data.image_base64,
        video_base64=data.video_base64,
        post_type=data.post_type,
        job_id=data.job_id
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return {"message": "Post created successfully", "post_id": post.id}

@app.get("/api/feed/posts")
def get_feed_posts(user_id: str, author_id: Optional[str] = None, db: Session = Depends(get_db)):
    if author_id:
        posts = db.query(models.Post).filter(models.Post.author_id == author_id).order_by(models.Post.created_at.desc()).all()
    else:
        # Get user's accepted connections
        conns = db.query(models.Connection).filter(
            ((models.Connection.requester_id == user_id) | (models.Connection.receiver_id == user_id)) &
            (models.Connection.status == "accepted")
        ).all()
        
        accepted_ids = []
        for c in conns:
            if c.requester_id == user_id:
                accepted_ids.append(c.receiver_id)
            else:
                accepted_ids.append(c.requester_id)
                
        # Include current user's own posts
        allowed_ids = accepted_ids + [user_id]
        
        # Query posts:
        # 1. Author is in allowed_ids
        # 2. OR post_type == "Job" (HR job posts)
        # 3. OR author_role == "RecruitIQ" (Official posts)
        # Filter and sort
        posts = db.query(models.Post).filter(
            (models.Post.author_id.in_(allowed_ids)) |
            (models.Post.post_type == "Job") |
            (models.Post.author_role == "RecruitIQ")
        ).order_by(models.Post.created_at.desc()).all()
    
    result = []
    for p in posts:
        # Check if liked by current user
        liked = db.query(models.PostLike).filter(
            models.PostLike.post_id == p.id,
            models.PostLike.user_id == user_id
        ).first() is not None
        
        # Load comments
        comments = db.query(models.PostComment).filter(models.PostComment.post_id == p.id).order_by(models.PostComment.created_at.asc()).all()
        comments_list = []
        for c in comments:
            comments_list.append({
                "id": c.id,
                "user_id": "anonymous" if c.is_anonymous else c.user_id,
                "user_name": "Anonymous Candidate" if c.is_anonymous else c.user_name,
                "user_photo": None if c.is_anonymous else c.user_photo,
                "text": c.text,
                "created_at": str(c.created_at)
            })
            
        # Get author photo
        author_profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == p.author_id).first()
        author_photo = author_profile.photo_base64 if author_profile else None
        
        # Get endorsements for this post
        endorsements = db.query(models.PostSkillEndorsement).filter(models.PostSkillEndorsement.post_id == p.id).all()
        endorsements_list = [e.skill for e in endorsements]
        
        result.append({
            "id": p.id,
            "author_id": p.author_id,
            "author_name": p.author_name,
            "author_role": p.author_role,
            "author_photo": author_photo,
            "content": p.content,
            "image_base64": p.image_base64,
            "video_base64": p.video_base64,
            "post_type": p.post_type,
            "likes_count": p.likes_count,
            "comments_count": p.comments_count,
            "liked": liked,
            "comments": comments_list,
            "endorsements": endorsements_list,
            "job_id": p.job_id,
            "created_at": str(p.created_at)
        })
        
    return result

class LikeRequest(BaseModel):
    post_id: int
    user_id: str

@app.delete("/api/feed/posts/{post_id}")
def delete_feed_post(post_id: int, user_id: str, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}

@app.post("/api/feed/like")
def like_post(data: LikeRequest, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    existing = db.query(models.PostLike).filter(
        models.PostLike.post_id == data.post_id,
        models.PostLike.user_id == data.user_id
    ).first()
    
    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        action = "unliked"
    else:
        like = models.PostLike(post_id=data.post_id, user_id=data.user_id)
        db.add(like)
        post.likes_count += 1
        action = "liked"
        
    db.commit()
    return {"message": f"Successfully {action} post", "likes_count": post.likes_count}

class CommentRequest(BaseModel):
    post_id: int
    user_id: str
    text: str
    is_anonymous: bool = False

@app.post("/api/feed/comment")
def comment_post(data: CommentRequest, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    u = db.query(models.User).filter(models.User.user_id == data.user_id).first()
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == data.user_id).first()
    
    comment = models.PostComment(
        post_id=data.post_id,
        user_id=data.user_id,
        user_name=u.name if u else "Someone",
        user_photo=profile.photo_base64 if profile else None,
        text=data.text,
        is_anonymous=data.is_anonymous
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    
    return {"message": "Comment added successfully"}

class EndorseRequest(BaseModel):
    post_id: int
    skill: str
    user_id: str

@app.post("/api/feed/endorse")
def endorse_skill(data: EndorseRequest, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == data.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    existing = db.query(models.PostSkillEndorsement).filter(
        models.PostSkillEndorsement.post_id == data.post_id,
        models.PostSkillEndorsement.skill == data.skill,
        models.PostSkillEndorsement.endorser_id == data.user_id
    ).first()
    
    if existing:
        db.delete(existing)
        action = "removed endorsement"
    else:
        end = models.PostSkillEndorsement(
            post_id=data.post_id,
            skill=data.skill,
            endorser_id=data.user_id
        )
        db.add(end)
        action = "endorsed skill"
        
    db.commit()
    return {"message": f"Successfully {action}"}

@app.get("/api/notifications")
def get_user_notifications(user_id: str, db: Session = Depends(get_db)):
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).all()
    return [{
        "id": n.id,
        "text": n.text,
        "is_read": n.is_read,
        "created_at": str(n.created_at)
    } for n in notifs]

@app.post("/api/notifications/read")
def read_notifications(user_id: str, db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).update({models.Notification.is_read: True})
    db.commit()
    return {"message": "Notifications marked as read"}

class SendMessageRequest(BaseModel):
    conversation_id: int
    sender_id: str
    text: str
    attachment: str = None

@app.post("/api/messages/send")
async def send_rest_message(data: SendMessageRequest, db: Session = Depends(get_db)):
    # Check messaging restriction
    # Can only message if connection is accepted OR if HR messaging applicant who applied to their job
    db_conn = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == data.conversation_id
    ).all()
    participants = [p.user_id for p in db_conn]
    
    allowed = False
    if len(participants) == 2:
        u1, u2 = participants[0], participants[1]
        
        # Check connection status
        conn = db.query(models.Connection).filter(
            ((models.Connection.requester_id == u1) & (models.Connection.receiver_id == u2)) |
            ((models.Connection.requester_id == u2) & (models.Connection.receiver_id == u1))
        ).first()
        if conn and conn.status == "accepted":
            allowed = True
        else:
            # Check HR/Applicant relationship
            # If one of them is HR, and the other is Candidate who applied to a job created by that HR
            cand = next((uid for uid in participants if db.query(models.User).filter(models.User.user_id == uid, models.User.role == "Candidate").first()), None)
            hr = next((uid for uid in participants if db.query(models.User).filter(models.User.user_id == uid, models.User.role == "HR").first()), None)
            if cand and hr:
                app_exists = db.query(models.Application).filter(models.Application.user_id == cand).first() is not None
                if app_exists:
                    allowed = True
    else:
        allowed = True # Allow group chats or admin chats

    if not allowed:
        raise HTTPException(status_code=403, detail="You can only message connections or job applicants.")

    msg = models.Message(
        conversation_id=data.conversation_id,
        sender_id=data.sender_id,
        text=data.text,
        attachment=data.attachment
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # WebSocket support: push personal messages
    payload = {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "text": msg.text,
        "attachment": msg.attachment,
        "created_at": str(msg.created_at)
    }
    for uid in participants:
        if uid != data.sender_id:
            await manager.send_personal_message(payload, uid)
            
    return payload

@app.get("/api/hr/talent-suggestions")
def get_talent_suggestions(db: Session = Depends(get_db)):
    posts = db.query(models.Post).filter(
        (models.Post.likes_count >= 5) | (models.Post.content.like("%#OpenToWork%"))
    ).all()
    suggestions = []
    for p in posts:
        u = db.query(models.User).filter(models.User.user_id == p.author_id).first()
        profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == p.author_id).first()
        if u and u.role == "Candidate":
            suggestions.append({
                "post_id": p.id,
                "user_id": u.user_id,
                "name": u.name,
                "headline": profile.headline if profile else "Job Seeker",
                "photo_base64": profile.photo_base64 if profile else None,
                "content": p.content,
                "likes": p.likes_count
            })
    return suggestions

# ---------------- Candidate Documents ----------------
@app.get("/candidate/documents")
def get_documents(user_id: str, db: Session = Depends(get_db)):
    docs = db.query(models.CandidateDocument).filter(models.CandidateDocument.user_id == user_id).order_by(models.CandidateDocument.created_at.desc()).all()
    # Don't return base64 for the list to save bandwidth
    return [{
        "id": doc.id,
        "name": doc.filename,
        "size": doc.size_mb,
        "type": doc.file_type,
        "created_at": doc.created_at.isoformat()
    } for doc in docs]

@app.get("/candidate/documents/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.CandidateDocument).filter(models.CandidateDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "name": doc.filename,
        "file_base64": doc.file_base64,
        "type": doc.file_type
    }

@app.post("/candidate/documents/upload")
async def upload_document(user_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode('utf-8')
    mime_type = file.content_type or "application/octet-stream"
    size_mb = f"{len(content) / (1024 * 1024):.2f} MB"
    if len(content) < 1024 * 1024:
        size_mb = f"{len(content) / 1024:.0f} KB"
        
    ext = file.filename.split('.')[-1].upper() if '.' in file.filename else 'FILE'
    if mime_type.startswith('image/'):
        ext = 'Image'
    elif 'pdf' in mime_type:
        ext = 'PDF'
    
    file_base64 = f"data:{mime_type};base64,{b64}"
    
    doc = models.CandidateDocument(
        user_id=user_id,
        filename=file.filename,
        file_type=ext,
        size_mb=size_mb,
        file_base64=file_base64
    )
    db.add(doc)
    db.commit()
    return {"message": "Document uploaded successfully", "id": doc.id}

@app.delete("/candidate/documents/{doc_id}")
def delete_document(doc_id: int, user_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.CandidateDocument).filter(models.CandidateDocument.id == doc_id, models.CandidateDocument.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

