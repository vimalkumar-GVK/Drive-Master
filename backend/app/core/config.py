from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Force load .env from backend folder
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "Placement AI Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # MongoDB Config
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "placement_ai"
    
    # AI Config
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Mail Config
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str = "RGU Drive Master <noreply@rgudrivemaster.com>"
    ENV: str = "development"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()

# Add debug log on startup
print(f"MAIL_USERNAME loaded: {settings.MAIL_USERNAME}")
print(f"MAIL_PASSWORD loaded: {'YES' if settings.MAIL_PASSWORD else 'NO MISSING'}")
