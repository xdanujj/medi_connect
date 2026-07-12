import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException, status

from app.core.config import settings
from app.schemas.response_schema import APIResponseSchema, PrescriptionSchema
from app.schemas.request_schema import DoctorMetadata, PatientMetadata
from app.services.speech_to_text import stt_service
from app.services.prescription_generator import prescription_generator
from app.services.pdf_generator import pdf_generator
from app.utils.file_handler import save_upload_file, ensure_directory_exists
from app.utils.validators import validate_audio_file

logger = logging.getLogger("prescription_service.api")

router = APIRouter(prefix="/prescription", tags=["Prescription"])

@router.post(
    "/generate",
    response_model=APIResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a structured prescription from doctor's audio speech consultation"
)
async def generate_prescription(
    request: Request,
    file: UploadFile = File(..., description="Audio recording of the doctor consultation (.wav, .mp3, etc.)"),
    
    # Optional Doctor Metadata (Form fields)
    doctor_name: Optional[str] = Form("Dr. Jane Doe", description="Name of the doctor"),
    doctor_specialty: Optional[str] = Form("General Physician", description="Doctor's specialty"),
    doctor_license: Optional[str] = Form("REG-12345", description="Doctor's registration/license number"),
    doctor_clinic: Optional[str] = Form("MediConnect Clinic", description="Name of the clinic"),
    doctor_contact: Optional[str] = Form("+91 98765 43210", description="Clinic contact information"),
    
    # Optional Patient Metadata (Form fields)
    patient_name: Optional[str] = Form("John Doe", description="Patient's name"),
    patient_age: Optional[str] = Form("30", description="Patient's age"),
    patient_gender: Optional[str] = Form("Male", description="Patient's gender"),
    patient_date: Optional[str] = Form(None, description="Prescription date (YYYY-MM-DD)")
):
    """
    Complete pipeline to generate a medical prescription:
    1. **Upload**: Accepts doctor audio consultation recording.
    2. **Speech-to-Text**: Transcribes audio using faster-whisper.
    3. **LLM structuring**: Analyzes transcript using Gemini/OpenAI to generate structured prescription JSON.
    4. **PDF compilation**: Renders the JSON into a premium, styled ReportLab PDF.
    5. **Response**: Returns transcript, parsed prescription details, and download link for the PDF.
    """
    logger.info(f"Received prescription generation request. File: {file.filename}")
    
    # 1. Validate File Size
    # In FastAPI, we can read size from file.headers or read it directly.
    # To avoid loading everything in memory twice, we can read the file size or get it from content-length if present.
    # We will read a small chunk or use a safer approach: seek to end to check size, then seek back.
    try:
        file.file.seek(0, 2)  # Seek to end of file
        file_size = file.file.tell()
        file.file.seek(0)      # Seek back to beginning
    except Exception as e:
        logger.warning(f"Could not determine file size via seek: {e}. Defaulting file_size check to 0.")
        file_size = 0

    # Validate audio extensions and size limit
    validate_audio_file(file.filename or "audio.wav", file_size)

    # Ensure upload directory exists
    ensure_directory_exists(settings.UPLOAD_DIR)
    
    saved_audio_path = None
    try:
        # 2. Save Uploaded Audio File
        saved_audio_path = await save_upload_file(file, settings.UPLOAD_DIR)
        logger.info(f"Saved audio upload at: {saved_audio_path}")
        
        # 3. Step 1: Transcribe Speech to Text
        transcript = stt_service.transcribe(saved_audio_path)
        if not transcript.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No voice detected in audio. Please provide a clear verbal medical instruction."
            )
        logger.info("Speech-to-text transcription succeeded.")
        
        # 4. Step 2: Use LLM to convert transcript to structured JSON
        structured_prescription = prescription_generator.generate_prescription_json(transcript)
        logger.info("LLM structured JSON generation succeeded.")
        
        # 5. Populate metadata models for PDF rendering
        doctor_meta = DoctorMetadata(
            name=doctor_name,
            specialty=doctor_specialty,
            license_number=doctor_license,
            clinic_name=doctor_clinic,
            contact=doctor_contact
        )
        
        # Date default handling
        date_str = patient_date or datetime.now().strftime("%Y-%m-%d")
        patient_meta = PatientMetadata(
            name=patient_name,
            age=patient_age,
            gender=patient_gender,
            date=date_str
        )
        
        # 6. Step 3: Generate prescription PDF file
        ensure_directory_exists(settings.PDF_DIR)
        pdf_filename = f"{Path(saved_audio_path).stem}.pdf"
        output_pdf_path = settings.PDF_DIR / pdf_filename
        
        pdf_generator.generate_pdf(
            prescription=structured_prescription,
            output_path=output_pdf_path,
            doctor=doctor_meta,
            patient=patient_meta
        )
        
        # 7. Formulate download URL path
        # Using request.base_url to form a fully qualified download URL
        base_url = str(request.base_url).rstrip("/")
        pdf_url = f"{base_url}/generated_pdfs/{pdf_filename}"
        
        logger.info("Entire prescription generation pipeline completed successfully.")
        
        return APIResponseSchema(
            transcript=transcript,
            prescription=structured_prescription,
            pdf_url=pdf_url
        )
        
    except Exception as e:
        logger.error(f"Error in prescription generation pipeline: {e}", exc_info=True)
        # Handle HTTPExceptions raised by services
        if isinstance(e, HTTPException):
            raise e
        # Generic server errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during prescription generation: {str(e)}"
        )
        
    finally:
        # Cleanup uploaded audio file to save disk space
        if saved_audio_path and saved_audio_path.exists():
            try:
                os.remove(saved_audio_path)
                logger.info(f"Cleaned up temporary audio file: {saved_audio_path}")
            except Exception as cleanup_err:
                logger.warning(f"Failed to delete temporary audio file {saved_audio_path}: {cleanup_err}")
