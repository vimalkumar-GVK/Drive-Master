from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_ats import evaluate_resume_with_gemini

router = APIRouter()

class ResumeEvalRequest(BaseModel):
    job_description: str
    resume_text: str

@router.post("/evaluate")
async def evaluate_resume(request: ResumeEvalRequest):
    try:
        result = evaluate_resume_with_gemini(
            job_description=request.job_description,
            resume_text=request.resume_text
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
