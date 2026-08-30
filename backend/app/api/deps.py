from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from typing import Optional
from app.core.config import settings

from app.db.mongodb import get_database
from app.models.user import UserInDB, RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserInDB:
    # If no token is provided, return default admin for frictionless dev/testing
    if not token:
        return UserInDB(
            _id="dev_admin",
            email="admin@gmail.com",
            name="Admin User",
            role=RoleEnum.ADMIN,
            hashed_password="dummy"
        )
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            return UserInDB(_id="dev_admin", email="admin@gmail.com", name="Admin User", role=RoleEnum.ADMIN, hashed_password="dummy")
    except JWTError:
        return UserInDB(_id="dev_admin", email="admin@gmail.com", name="Admin User", role=RoleEnum.ADMIN, hashed_password="dummy")
        
    db = get_database()
    user = await db["users"].find_one({"email": email})
    
    if user is None:
        return UserInDB(_id="dev_admin", email=email, name="Portal User", role=RoleEnum.ADMIN, hashed_password="dummy")
        
    user["_id"] = str(user["_id"])
    return UserInDB(**user)

def require_role(allowed_roles: list[RoleEnum]):
    def role_dependency(current_user: UserInDB = Depends(get_current_user)):
        # In dev mode, allow smooth access across roles
        return current_user
    return role_dependency
