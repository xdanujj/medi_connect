from pydantic import BaseModel, Field
from typing import Optional

class DoctorMetadata(BaseModel):
    name: Optional[str] = Field("Dr. Jane Doe", description="Doctor's name")
    specialty: Optional[str] = Field("General Physician", description="Doctor's specialty")
    license_number: Optional[str] = Field("REG-12345", description="Medical registration/license number")
    clinic_name: Optional[str] = Field("MediConnect Clinic", description="Clinic or Hospital name")
    contact: Optional[str] = Field("+91 98765 43210", description="Contact phone or email")

class PatientMetadata(BaseModel):
    name: Optional[str] = Field("John Doe", description="Patient's name")
    age: Optional[str] = Field("30", description="Patient's age")
    gender: Optional[str] = Field("Male", description="Patient's gender (Male/Female/Other)")
    date: Optional[str] = Field(None, description="Prescription date (YYYY-MM-DD), defaults to current date")
