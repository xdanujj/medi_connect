import json
import logging
import re
from typing import Dict, Any

from app.core.config import settings
from app.core.prompts import PRESCRIPTION_SYSTEM_PROMPT, PRESCRIPTION_USER_PROMPT_TEMPLATE
from app.schemas.response_schema import PrescriptionSchema

logger = logging.getLogger("prescription_service.generator")

class PrescriptionGeneratorService:
    def __init__(self):
        self.provider = None
        self._init_client()

    def _init_client(self):
        # Determine LLM Provider
        if settings.GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.provider = "gemini"
            logger.info(f"Initialized Gemini client using model: {settings.MODEL_NAME}")
        elif settings.OPENAI_API_KEY:
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.provider = "openai"
            logger.info(f"Initialized OpenAI client using model: {settings.MODEL_NAME}")
        else:
            logger.warning("No API key configured for Gemini or OpenAI. Running in Mock/Offline mode.")
            self.provider = "mock"

    def _clean_json_response(self, text: str) -> str:
        """
        Cleans the model response to isolate the JSON string.
        Strips markdown code blocks, whitespaces, etc.
        """
        text = text.strip()
        # Find JSON object pattern if wrapped in markdown code blocks
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text

    def generate_prescription_json(self, transcript: str) -> PrescriptionSchema:
        """
        Sends the transcript to the LLM and retrieves the structured JSON.
        Validates the output using Pydantic.
        """
        if not transcript:
            raise ValueError("Transcript cannot be empty.")

        user_prompt = PRESCRIPTION_USER_PROMPT_TEMPLATE.format(transcript=transcript)

        if self.provider == "gemini":
            import google.generativeai as genai
            model = genai.GenerativeModel(
                model_name=settings.MODEL_NAME,
                system_instruction=PRESCRIPTION_SYSTEM_PROMPT
            )
            # Request JSON response format
            response = model.generate_content(
                user_prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text
            
        elif self.provider == "openai":
            response = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[
                    {"role": "system", "content": PRESCRIPTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content
            
        else:  # Mock / fallback offline mode
            logger.info("Executing mock structuring due to missing API keys.")
            raw_text = self._generate_mock_json(transcript)

        logger.debug(f"LLM Raw Output: {raw_text}")
        
        cleaned_json = self._clean_json_response(raw_text)
        
        try:
            data = json.loads(cleaned_json)
            # Validate against Pydantic schema
            prescription = PrescriptionSchema(**data)
            return prescription
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode LLM response as JSON. Cleaned response: {cleaned_json}")
            raise ValueError(f"LLM response is not a valid JSON: {cleaned_json}") from e
        except Exception as e:
            logger.error(f"Validation against Pydantic schema failed: {e}")
            raise ValueError(f"Structured prescription validation error: {e}") from e

    def _generate_mock_json(self, transcript: str) -> str:
        """
        Generate a simple mock JSON structure for local testing without APIs.
        """
        # Lowercase for basic search matching
        t = transcript.lower()
        
        # Default mock template
        symptoms = []
        if "fever" in t:
            symptoms.append("fever")
        if "cough" in t:
            symptoms.append("cough")
        if "headache" in t:
            symptoms.append("headache")
        if not symptoms:
            symptoms.append("general malaise")

        diagnosis = "viral infection" if "fever" in t or "cough" in t else "general checkup"
        
        medications = []
        if "paracetamol" in t:
            medications.append({
                "medicine_name": "Paracetamol",
                "dosage": "650 mg",
                "frequency": "Twice daily",
                "duration": "5 days",
                "instructions": "After meals"
            })
        elif "fever" in t:
            medications.append({
                "medicine_name": "Paracetamol",
                "dosage": "500 mg",
                "frequency": "Three times daily",
                "duration": "3 days",
                "instructions": "After meals"
            })
            
        if "cough" in t:
            medications.append({
                "medicine_name": "Cough Syrup",
                "dosage": "10 ml",
                "frequency": "At bedtime",
                "duration": "5 days",
                "instructions": "With warm water"
            })
            
        if not medications:
            medications.append({
                "medicine_name": "Multivitamin",
                "dosage": "1 tablet",
                "frequency": "Once daily",
                "duration": "30 days",
                "instructions": "After breakfast"
            })
            
        advice = []
        if "water" in t or "liquid" in t:
            advice.append("Drink plenty of warm water and stay hydrated.")
        else:
            advice.append("Get adequate rest and take warm fluids.")
            
        return json.dumps({
            "symptoms": symptoms,
            "diagnosis": diagnosis,
            "medications": medications,
            "advice": advice
        })

prescription_generator = PrescriptionGeneratorService()
