from pydantic import BaseModel, Field
from typing import List, Optional

class MedicationSchema(BaseModel):
    medicine_name: str = Field(..., description="Name of the medicine")
    dosage: str = Field(..., description="Dosage (e.g., 650 mg, 1 tab)")
    frequency: str = Field(..., description="Frequency (e.g., Twice daily, 1-0-1)")
    duration: str = Field(..., description="Duration (e.g., 5 days)")
    instructions: Optional[str] = Field("", description="Special instructions (e.g., after food)")

class PrescriptionSchema(BaseModel):
    symptoms: List[str] = Field(default_factory=list, description="List of symptoms")
    diagnosis: str = Field(..., description="Diagnosis detail")
    medications: List[MedicationSchema] = Field(default_factory=list, description="List of medications")
    advice: List[str] = Field(default_factory=list, description="General advice or directions")

class APIResponseSchema(BaseModel):
    transcript: str = Field(..., description="Transcribed text from whisper")
    prescription: PrescriptionSchema = Field(..., description="Parsed and validated prescription details")
    pdf_url: str = Field(..., description="URL path to download the generated PDF")
