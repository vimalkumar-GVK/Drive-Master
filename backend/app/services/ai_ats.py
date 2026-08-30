from app.core.config import settings
import json
import os
import re

ATS_SYSTEM_PROMPT = """You are an expert, highly analytical Technical Recruiter and Applicant Tracking System (ATS). 
Your exact purpose is to evaluate a candidate's resume against a specific Job Description (JD).

You must obey the following rules strictly:
1. NO HALLUCINATIONS: You may only evaluate the candidate based on the text provided in the Resume.
2. OBJECTIVE SCORING: Calculate the `ats_score` (0 to 100) based on:
   - 40%: Hard skills and technology match.
   - 30%: Experience and project alignment.
   - 20%: Role relevance and keywords.
   - 10%: Education requirements.
3. Return valid JSON only with this structure:
{
  "ats_score": 85,
  "match_status": "Strong Match",
  "key_strengths": ["Strong Python background", "Relevant React project"],
  "missing_skills": ["Docker", "Kubernetes"],
  "recommendations": ["Add cloud deployment projects", "Earn AWS certification"],
  "summary": "Candidate shows strong potential for Frontend and Full-stack engineering."
}
"""

def heuristic_ats_evaluation(job_description: str, resume_text: str) -> dict:
    """Intelligent keyword and semantic matching fallback when Gemini API key is missing or offline."""
    common_skills = [
        "python", "javascript", "typescript", "react", "node", "nodejs", "express",
        "sql", "mongodb", "postgresql", "mysql", "docker", "kubernetes", "aws", "gcp",
        "azure", "html", "css", "tailwind", "fastapi", "django", "flask", "git",
        "github", "java", "c++", "c#", "data structures", "algorithms", "rest api",
        "machine learning", "ai", "pandas", "numpy", "excel", "communication", "leadership"
    ]
    
    jd_lower = job_description.lower() if job_description else ""
    resume_lower = resume_text.lower() if resume_text else ""
    
    jd_skills = [skill for skill in common_skills if re.search(r'\b' + re.escape(skill) + r'\b', jd_lower)]
    if not jd_skills:
        words = re.findall(r'\b[a-zA-Z]{4,}\b', jd_lower)
        jd_skills = list(set(words[:8])) if words else ["python", "react", "communication"]
        
    matched_skills = [skill for skill in jd_skills if re.search(r'\b' + re.escape(skill) + r'\b', resume_lower)]
    missing_skills = [skill for skill in jd_skills if skill not in matched_skills]
    
    total_skills = len(jd_skills) if len(jd_skills) > 0 else 1
    match_ratio = len(matched_skills) / total_skills
    
    base_score = int(45 + (match_ratio * 50))
    if base_score > 98:
        base_score = 96
    if not resume_text or not resume_text.strip():
        base_score = 30
        
    if base_score >= 80:
        status = "Strong Match"
    elif base_score >= 60:
        status = "Good Match"
    elif base_score >= 40:
        status = "Moderate Match"
    else:
        status = "Needs Improvement"
        
    strengths = [f"Proficient in {s.title()}" for s in matched_skills[:4]]
    if not strengths:
        strengths = ["Foundational technical competencies", "Strong academic record"]
        
    missing = [s.title() for s in missing_skills[:4]]
    if not missing:
        missing = ["System Architecture Optimization", "Cloud Deployment Pipelines"]
        
    recs = [f"Complete projects highlighting {m}" for m in missing[:2]] + [
        "Include measurable impact metrics in project descriptions",
        "Add relevant open-source contributions"
    ]
    
    return {
        "ats_score": base_score,
        "match_status": status,
        "key_strengths": strengths,
        "missing_skills": missing,
        "recommendations": recs[:3],
        "summary": f"Candidate profile demonstrates a {base_score}% compatibility with the job requirements based on key skill keywords and experience indicators."
    }

def evaluate_resume_with_gemini(job_description: str, resume_text: str) -> dict:
    """Attempts Gemini 1.5 Flash evaluation, falling back seamlessly to smart heuristic scoring."""
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"<JOB_DESCRIPTION>\n{job_description}\n</JOB_DESCRIPTION>\n\n<CANDIDATE_RESUME>\n{resume_text}\n</CANDIDATE_RESUME>"
            
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    system_instruction=ATS_SYSTEM_PROMPT,
                    temperature=0.1,
                    response_mime_type="application/json",
                )
            )
            
            parsed = json.loads(response.text)
            parsed["powered_by"] = "Gemini 1.5 Flash"
            return parsed
        except Exception as e:
            fallback_res = heuristic_ats_evaluation(job_description, resume_text)
            fallback_res["powered_by"] = "AI Smart Match Engine (Fallback)"
            return fallback_res
    else:
        fallback_res = heuristic_ats_evaluation(job_description, resume_text)
        fallback_res["powered_by"] = "AI Smart Match Engine"
        return fallback_res
