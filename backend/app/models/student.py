from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime

class ResumeQuality(BaseModel):
    grammar_score: int
    structure_score: int
    overall_score: int
    issues: List[str]
    suggestions: List[str]

class StudentBase(BaseModel):
    roll_no: str
    name: str
    department: str
    gender: str
    is_hosteller: bool
    
    # Academics
    sslc_percentage: float
    sslc_year: int
    hsc_percentage: float
    hsc_year: int
    ug_percentage: float
    ug_year: int
    pg_percentage: Optional[float] = None
    pg_year: Optional[int] = None
    year_of_graduation: int
    
    # Links & Portfolio
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None
    intro_video_url: Optional[str] = None
    photo_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    
    # Contact
    email: EmailStr
    phone: str
    
    # AI Quality Score
    resume_quality: Optional[ResumeQuality] = None

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: str # Map to MongoDB _id (can be roll_no)
    created_at: datetime
    updated_at: datetime
