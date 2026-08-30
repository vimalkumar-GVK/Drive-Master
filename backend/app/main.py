from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.ats import router as ats_router
from app.api.auth import router as auth_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router
from app.api.students import router as students_router
from app.api.team import router as team_router
from app.api.jobs import router as jobs_router
from app.api.companies import router as companies_router
from app.api.history import router as history_router
import os
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ats_router, prefix="/api/ats", tags=["ATS"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(students_router, prefix="/api/v1/students", tags=["Students"])
app.include_router(team_router, prefix="/api/v1/team", tags=["Team"])
app.include_router(jobs_router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(companies_router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(history_router, prefix="/api/v1/history", tags=["History"])

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "Welcome to Placement AI API"}

@app.get("/api/health")
async def health_check():
    from app.db.mongodb import db
    db_status = "disconnected"
    try:
        if db.client:
            await db.client.admin.command('ping')
            db_status = "connected"
    except Exception:
        pass
    
    return {
        "status": "healthy",
        "database": db_status
    }
