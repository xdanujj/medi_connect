import os
import tempfile
import json
import logging
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_prescription_service")

load_dotenv()

app = FastAPI(
    title="AI Prescription Service",
    description="Microservice for transcribing, translating, and extracting structured medical data from consultations",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    translatedTranscript: str

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not configured in environment variables.")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai_prescription_service"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    sarvam_key = os.getenv("SARVAM_API_KEY")
    if not sarvam_key or sarvam_key == "your_sarvam_api_key_here":
        raise HTTPException(status_code=503, detail="Sarvam API key is not configured")

    # Save incoming upload to temporary file
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 1. Speech-to-Text via Sarvam
        logger.info(f"Sending audio file {file.filename} to Sarvam STT...")
        stt_url = "https://api.sarvam.ai/speech-to-text"
        headers = {"api-subscription-key": sarvam_key}
        
        with open(temp_file_path, "rb") as audio_file:
            files = {
                "file": (file.filename, audio_file, file.content_type or "audio/webm")
            }
            data = {
                "model": "saarika:v2",
                "with_timestamps": "false",
                "with_disfluencies": "false"
            }
            
            stt_res = requests.post(stt_url, headers=headers, files=files, data=data)

        if stt_res.status_code != 200:
            logger.error(f"Sarvam STT failed: {stt_res.text}")
            raise HTTPException(status_code=502, detail=f"Sarvam STT failed: {stt_res.text}")

        stt_data = stt_res.json()
        transcript = stt_data.get("transcript", "")
        detected_lang = stt_data.get("language_code", "hi-IN")
        logger.info(f"Successfully transcribed audio. Detected language: {detected_lang}")

        # 2. Translation to English if not English
        translated_transcript = transcript
        if not detected_lang.startswith("en"):
            logger.info("Transcript is not in English. Requesting translation...")
            translate_url = "https://api.sarvam.ai/translate"
            translate_payload = {
                "input": transcript,
                "source_language_code": detected_lang,
                "target_language_code": "en-IN",
                "mode": "formal",
                "model": "mayura:v1"
            }
            translate_headers = {
                "api-subscription-key": sarvam_key,
                "Content-Type": "application/json"
            }
            
            translate_res = requests.post(translate_url, headers=translate_headers, json=translate_payload)
            if translate_res.status_code != 200:
                logger.error(f"Sarvam translation failed: {translate_res.text}")
                raise HTTPException(status_code=502, detail=f"Sarvam translation failed: {translate_res.text}")
                
            translate_data = translate_res.json()
            translated_transcript = translate_data.get("translated_text", transcript)
            logger.info("Translation to English complete.")

        return {
            "transcript": transcript,
            "translatedTranscript": translated_transcript
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error during transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
        
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/extract")
async def extract_medical_data(req: ExtractRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        raise HTTPException(status_code=503, detail="Gemini API key is not configured")

    try:
        # Re-configure if not already configured
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""You are a medical data extraction assistant. Extract structured medical information from the following doctor-patient consultation transcript.

Return ONLY a valid JSON object with exactly these fields (use empty string "" if not mentioned):

{{
  "patientName": "",
  "age": "",
  "gender": "",
  "chiefComplaint": "",
  "diagnosis": "",
  "medicalHistory": "",
  "medicines": [
    {{
      "name": "",
      "dosage": "",
      "frequency": "",
      "duration": ""
    }}
  ],
  "tests": "",
  "advice": "",
  "followUpDate": "",
  "actions": "",
  "additionalNotes": ""
}}

Transcript:
\"\"\"
{req.translatedTranscript}
\"\"\"

Return ONLY the JSON. No markdown code fences (like ```json), no explanation."""

        logger.info("Invoking Gemini for medical data extraction...")
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        
        # Clean up possible markdown fences
        json_text = raw_text
        if json_text.startswith("```"):
            lines = json_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            json_text = "\n".join(lines).strip()

        extracted_data = json.loads(json_text)
        logger.info("Successfully extracted structured medical data.")
        return extracted_data

    except json.JSONDecodeError as je:
        logger.error(f"Failed to parse JSON response from Gemini: {je}. Raw output was: {raw_text}")
        raise HTTPException(status_code=502, detail="AI service returned invalid structure. Please try again.")
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI extraction error: {str(e)}")
