import re
import io
import requests
import PyPDF2

try:
    from sentence_transformers import SentenceTransformer, util
    print("Loading Sentence Transformer globally...")
    ai_model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Failed to load AI model: {e}")
    ai_model = None

import os
import json

def extract_text_from_url(url: str) -> str:
    """
    Attempts to download and extract text from a PDF url or Google Docs link.
    """
    if not url: return ""
    if not url.startswith('http'):
        url = 'https://' + url
    try:
        # Handle Google Docs links directly
        if "docs.google.com/document/d/" in url:
            match = re.search(r'/document/d/([a-zA-Z0-9_-]+)', url)
            if match:
                doc_id = match.group(1)
                txt_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                response = requests.get(txt_url, headers=headers, timeout=10)
                response.raise_for_status()
                return response.text.strip()

        # Handle Google Drive export link
        if "drive.google.com" in url:
            match = re.search(r'(?:/file/d/|id=)([a-zA-Z0-9_-]+)', url)
            if match:
                url = f"https://drive.google.com/uc?export=download&id={match.group(1)}"
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        pdf_file = io.BytesIO(response.content)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to extract PDF text from {url}: {e}")
        return ""

def calculate_resume_structure_score(resume_text: str) -> dict:
    if not resume_text or not resume_text.strip():
        return {
            "grammar_score": 0,
            "structure_score": 0,
            "overall_score": 0,
            "issues": ["No resume text found or failed to extract."],
            "suggestions": ["Ensure the resume is a valid PDF and publicly accessible."]
        }
    
    try:
        from google import genai
        from google.genai import types
        from app.core.config import settings
        
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set in .env file.")
            
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""You are a resume quality auditor. Analyze ONLY sentence formation and structure. Ignore skills or JD relevance.
Score each category out of 100:
- Grammar & Sentence Formation (100 marks): Check grammar errors, passive vs active voice, incomplete sentences, repetitive words, spelling mistakes, professional tone. Deduct marks per major error.
- Structure & Formatting (100 marks): Check if resume has Header with name/contact, Professional Summary, Education, Skills, Projects/Experience, Achievements. Check bullet points, consistent formatting, proper headings, length 1-2 pages.

overall_score must be (grammar_score + structure_score) / 2

Return JSON only with EXACTLY these keys:
{{
  "grammar_score": number (0-100),
  "structure_score": number (0-100),
  "overall_score": number (0-100),
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"]
}}

Here is the resume text:
{resume_text[:4000]}
"""

        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        result = json.loads(response.text)
        return {
            "grammar_score": int(result.get("grammar_score", 0)),
            "structure_score": int(result.get("structure_score", 0)),
            "overall_score": int(result.get("overall_score", 0)),
            "issues": result.get("issues", []),
            "suggestions": result.get("suggestions", [])
        }
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {
            "grammar_score": 0,
            "structure_score": 0,
            "overall_score": 0,
            "issues": [f"Error analyzing resume: {str(e)}"],
            "suggestions": []
        }

def calculate_ats_score(job_description: str, resume_text: str) -> int:
    """
    Calculates ATS score using SentenceTransformer for deep semantic matching.
    """
    if not job_description or not job_description.strip():
        return 0
    if not resume_text or not resume_text.strip():
        return 0
        
    if not ai_model:
        print("AI Model not loaded, returning fallback score 45")
        return 45
        
    try:
        jd_embedding = ai_model.encode(job_description, convert_to_tensor=True)
        resume_embedding = ai_model.encode(resume_text, convert_to_tensor=True)
        
        # Calculate cosine similarity
        score = util.cos_sim(jd_embedding, resume_embedding)[0].item()
        
        # Scale score for realistic ATS range (similar to backend/Model logic)
        scaled_score = min(100, int(round(score * 1.6 * 100, 1)))
        
        # Ensure it's at least a small number if there's any text
        return max(15, scaled_score)
    except Exception as e:
        print(f"Error calculating AI ATS score: {e}")
        return 45

def calculate_ats_scores_batch(job_description: str, resume_texts: list[str]) -> list[int]:
    if not job_description or not job_description.strip():
        return [0] * len(resume_texts)
    
    if not ai_model:
        return [45] * len(resume_texts)
        
    try:
        jd_embedding = ai_model.encode(job_description, convert_to_tensor=True)
        # Handle empty resumes
        safe_resumes = [r if r and r.strip() else "empty" for r in resume_texts]
        
        resume_embeddings = ai_model.encode(safe_resumes, convert_to_tensor=True)
        
        # Calculate cosine similarities (returns a matrix)
        scores = util.cos_sim(jd_embedding, resume_embeddings)[0]
        
        final_scores = []
        for i, score_tensor in enumerate(scores):
            if safe_resumes[i] == "empty":
                final_scores.append(0)
            else:
                score = score_tensor.item()
                scaled_score = min(100, int(round(score * 1.6 * 100, 1)))
                final_scores.append(max(15, scaled_score))
                
        return final_scores
    except Exception as e:
        print(f"Error calculating AI ATS score batch: {e}")
        return [45] * len(resume_texts)

def get_match_status(score: int) -> str:
    if score >= 85: return "Excellent Match"
    if score >= 70: return "Strong Match"
    if score >= 50: return "Good Match"
    return "Needs Improvement"
