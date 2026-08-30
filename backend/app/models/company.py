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
