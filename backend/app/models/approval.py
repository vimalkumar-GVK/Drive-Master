from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum
from datetime import datetime

class ApprovalStatus(str, Enum):
    PENDING_MANAGER = "PENDING_MANAGER"
    PENDING_ADMIN = "PENDING_ADMIN"
    APPROVED_GLOBALLY = "APPROVED_GLOBALLY"
    REJECTED_BY_MANAGER = "REJECTED_BY_MANAGER"
    REJECTED_BY_ADMIN = "REJECTED_BY_ADMIN"

class RequestTypeEnum(str, Enum):
    COMPANY_CREATION = "COMPANY_CREATION"
    HOT_VERIFICATION = "HOT_VERIFICATION"
    REGISTERED_VERIFICATION = "REGISTERED_VERIFICATION"
    DRIVE_COMPLETED_VERIFICATION = "DRIVE_COMPLETED_VERIFICATION"

class ApprovalAction(BaseModel):
    by: str # User ID or name
    at: datetime = Field(default_factory=datetime.utcnow)
    remarks: Optional[str] = None

class ApprovalRequestBase(BaseModel):
    type: RequestTypeEnum
    companyId: str
    companyData: dict = {}

class ApprovalRequestCreate(ApprovalRequestBase):
    pass

class ApprovalRequest(ApprovalRequestBase):
    id: str = Field(alias="_id")
    requestedBy: str
    status: ApprovalStatus = ApprovalStatus.PENDING_MANAGER
    managerAction: Optional[ApprovalAction] = None
    adminAction: Optional[ApprovalAction] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
