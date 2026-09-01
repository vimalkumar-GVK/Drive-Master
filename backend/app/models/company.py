from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional
from enum import Enum
from datetime import datetime

class CompanyStatusEnum(str, Enum):
    COLD = "Cold" # Not yet connected
    WARM = "Warm" # Contacted
    HOT = "Hot" # JD received
    DRIVE_COMPLETED = "Drive Completed" # Placement drive finished

class CompanyBase(BaseModel):
    name: str
    location: str
    website_url: Optional[str] = None
    contact_person: str
    contact_phone: str
    contact_email: EmailStr
    company_size: str # E.g. "50-200"
    status: CompanyStatusEnum = CompanyStatusEnum.COLD
    
    # Track who added/manages this company
    managed_by: str

    # Verification and Drive Data
    verification_status: Optional[str] = None # Legacy? We'll keep for backward compat or drop? User said to add `approval_status`.
    approval_status: Optional[str] = None
    isActive: bool = False
    isGloballyApproved: bool = False
    isVerified: bool = False
    jd_url: Optional[str] = None
    ctc_lpa: Optional[float] = None
    registeredStudentsFile: Optional[str] = None
    attendedCount: Optional[int] = 0
    placedCount: Optional[int] = 0
    registeredStudents: Optional[list[str]] = []
    attendedStudents: Optional[list[str]] = []
    placedStudents: Optional[list[str]] = []

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: str # Map to MongoDB _id
    created_at: datetime
    updated_at: datetime

# Schema for tracking placed students
class PlacementRecord(BaseModel):
    student_roll_no: str
    company_id: str
    ctc_lpa: float
    created_at: datetime
