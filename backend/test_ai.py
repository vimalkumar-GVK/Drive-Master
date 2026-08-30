import sys
sys.path.append('.')
from app.services.ml_ats import calculate_resume_structure_score
from app.services.ai_ats import evaluate_resume_with_gemini

resume_text = "Experienced Python developer with React skills."
print("ML ATS (Structure):", calculate_resume_structure_score(resume_text))
print("AI ATS:", evaluate_resume_with_gemini("Python and React dev", resume_text))
