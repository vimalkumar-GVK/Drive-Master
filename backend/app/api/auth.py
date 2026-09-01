from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import create_access_token, verify_password, get_password_hash
from app.db.mongodb import get_database
from app.models.user import UserCreate, User, UserInDB
from datetime import datetime

router = APIRouter()

@router.post("/signup", response_model=User)
async def signup(user_in: UserCreate):
    db = get_database()
    
    # Check if user exists
    existing_user = await db["users"].find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
        
    user_dict = user_in.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["_id"] = user_in.email # Using email as ID for simplicity, or we could use UUID
    user_dict["created_at"] = datetime.utcnow()
    
    await db["users"].insert_one(user_dict)
    
    return User(**user_dict)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token = create_access_token(subject=user["email"])
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import BaseModel, EmailStr
import random
import secrets
from datetime import timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

import os

def send_email_sync(to_email: str, otp: str):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os
    from datetime import datetime, timedelta

    try:
        MAIL_USERNAME = os.getenv("MAIL_USERNAME")
        MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
        MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)

        msg = MIMEMultipart()
        msg['From'] = MAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = f"RGU Drive Master OTP - {otp} (5 min valid)"

        html = f"""
        <div style="font-family:Arial;padding:20px">
          <h2>RGU Drive Master</h2>
          <p>Your OTP: <b style="font-size:28px;letter-spacing:5px">{otp}</b></p>
          <p style="color:red">Valid for 5 minutes only. Expires at {(datetime.utcnow() + timedelta(minutes=5)).strftime('%H:%M:%S UTC')}</p>
        </div>
        """
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"EMAIL FAILED: {e}")

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = request.email.lower().strip()
    db = get_database()
    user = await db["users"].find_one({"email": email})
    if not user:
        return {"message": "If that email exists, an OTP has been sent."}
    
    # Rate limit: max 3 requests per hour
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    recent_requests = await db["otps"].count_documents({"email": email, "created_at": {"$gt": one_hour_ago}})
    if recent_requests >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")
        
    otp = str(random.randint(100000, 999999))
    
    # Delete old OTPs
    await db["otps"].delete_many({"email": email})
    
    # Store new OTP
    await db["otps"].insert_one({
        "email": email,
        "otp": otp,
        "created_at": now,
        "expires_at": now + timedelta(minutes=5),
        "verified": False,
        "attempts": 0
    })
    
    # Send email IN BACKGROUND - return response immediately
    background_tasks.add_task(send_email_sync, email, otp)
    
    return {
        "message": "OTP sent to Gmail if credentials configured. Valid 5 minutes.",
        "email": email,
        "expires_in": 300
    }

@router.post("/verify-otp")
async def verify_otp(request: VerifyOtpRequest):
    db = get_database()
    now = datetime.utcnow()
    
    otp_record = await db["otps"].find_one({"email": request.email})
    if not otp_record or otp_record.get("expires_at") < now:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    if otp_record.get("attempts", 0) >= 3:
        raise HTTPException(status_code=403, detail="Too many failed attempts. Please request a new OTP.")
        
    if otp_record.get("otp") != request.otp:
        await db["otps"].update_one({"_id": otp_record["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Verified! Generate reset token
    reset_token = secrets.token_urlsafe(32)
    await db["otps"].update_one(
        {"_id": otp_record["_id"]},
        {"$set": {
            "verified": True, 
            "reset_token": reset_token,
            "reset_token_expires": now + timedelta(minutes=10)
        }}
    )
    
    return {"message": "OTP verified successfully", "reset_token": reset_token}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    db = get_database()
    now = datetime.utcnow()
    
    otp_record = await db["otps"].find_one({"email": request.email, "reset_token": request.token, "verified": True})
    if not otp_record or otp_record.get("reset_token_expires", now) < now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    # Validation
    if len(request.new_password) < 8 or not any(c.isupper() for c in request.new_password) or not any(c.isdigit() for c in request.new_password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters, contain 1 uppercase letter and 1 number.")
        
    hashed_password = get_password_hash(request.new_password)
    
    await db["users"].update_one({"email": request.email}, {"$set": {"hashed_password": hashed_password}})
    await db["otps"].delete_many({"email": request.email})
    
    return {"message": "Password reset successful"}
