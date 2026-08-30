from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    PLACEMENT_LEAD = "PLACEMENT_LEAD"
    STUDENT = "STUDENT"
    RECRUITER = "RECRUITER"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: RoleEnum

class UserCreate(UserBase):
    password: str
    
class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class User(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
