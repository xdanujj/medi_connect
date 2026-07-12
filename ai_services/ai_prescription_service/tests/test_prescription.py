import os
import shutil
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.schemas.response_schema import PrescriptionSchema, MedicationSchema
from app.services.pdf_generator import pdf_generator
from app.utils.validators import validate_audio_file
from app.schemas.request_schema import DoctorMetadata, PatientMetadata

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_directories():
    """Ensure upload and pdf dirs are created and cleaned up after test run."""
    old_upload_dir = settings.UPLOAD_DIR
    old_pdf_dir = settings.PDF_DIR
    
    test_base = Path(__file__).resolve().parent / "test_run_data"
    test_upload = test_base / "uploads"
    test_pdf = test_base / "generated_pdfs"
    
    # Temporarily override settings paths for testing
    settings.UPLOAD_DIR = test_upload
    settings.PDF_DIR = test_pdf
    
    test_upload.mkdir(parents=True, exist_ok=True)
    test_pdf.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Cleanup test files
    if test_base.exists():
        shutil.rmtree(test_base)
        
    settings.UPLOAD_DIR = old_upload_dir
    settings.PDF_DIR = old_pdf_dir

def test_health_check():
    """Verify health check returns status 200."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "prescription-generation-microservice"}

def test_root_redirect():
    """Verify root path redirects to docs."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"

def test_audio_validator():
    """Verify that file validations work properly."""
    # Test valid extension and size
    validate_audio_file("recording.wav", 5 * 1024 * 1024)
    validate_audio_file("recording.mp3", 1024)
    
    # Test invalid extension
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file("document.pdf", 1024)
    assert exc_info.value.status_code == 400
    assert "Unsupported file format" in exc_info.value.detail
    
    # Test size limit exceeded
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file("recording.wav", 30 * 1024 * 1024) # 30 MB
    assert exc_info.value.status_code == 413
    assert "File too large" in exc_info.value.detail

def test_pdf_generation_flow():
    """Verify PDF generator successfully compiles a PDF file from schemas."""
    mock_prescription = PrescriptionSchema(
        symptoms=["fever", "body aches"],
        diagnosis="mild viral infection",
        medications=[
            MedicationSchema(
                medicine_name="Paracetamol",
                dosage="650 mg",
                frequency="Three times daily",
                duration="3 days",
                instructions="After meals"
            ),
            MedicationSchema(
                medicine_name="Vitamin C",
                dosage="500 mg",
                frequency="Once daily",
                duration="10 days",
                instructions="Before lunch"
            )
        ],
        advice=["Drink plenty of fluids", "Rest for 3 days"]
    )
    
    test_pdf_path = settings.PDF_DIR / "test_output.pdf"
    if test_pdf_path.exists():
        os.remove(test_pdf_path)
        
    doc_meta = DoctorMetadata(
        name="Dr. Tester",
        specialty="Quality Assurance",
        license_number="LIC-TEST",
        clinic_name="Lab Clinic",
        contact="12345"
    )
    
    patient_meta = PatientMetadata(
        name="Patient Tester",
        age="25",
        gender="Other",
        date="2026-06-16"
    )

    pdf_generator.generate_pdf(
        prescription=mock_prescription,
        output_path=test_pdf_path,
        doctor=doc_meta,
        patient=patient_meta
    )
    
    assert test_pdf_path.exists()
    assert test_pdf_path.stat().st_size > 0

@patch("app.api.prescription.stt_service.transcribe")
@patch("app.api.prescription.prescription_generator.generate_prescription_json")
def test_prescription_pipeline_endpoint(mock_gen_json, mock_transcribe):
    """Verify complete API pipeline endpoint with mock services."""
    # Setup mocks
    mock_transcribe.return_value = "Patient has headache. Prescribe Ibuprofen 400 mg twice daily for 2 days."
    mock_gen_json.return_value = PrescriptionSchema(
        symptoms=["headache"],
        diagnosis="migraine",
        medications=[
            MedicationSchema(
                medicine_name="Ibuprofen",
                dosage="400 mg",
                frequency="Twice daily",
                duration="2 days",
                instructions="After food"
            )
        ],
        advice=["Avoid bright light"]
    )
    
    # Create a dummy audio file payload
    file_content = b"fake audio content"
    files = {"file": ("test_consult.wav", file_content, "audio/wav")}
    
    form_data = {
        "doctor_name": "Dr. Test Mock",
        "doctor_specialty": "Pediatrics",
        "patient_name": "Bobby Mock",
        "patient_age": "5",
        "patient_gender": "Male"
    }
    
    response = client.post("/prescription/generate", files=files, data=form_data)
    
    assert response.status_code == 201
    json_res = response.json()
    assert "transcript" in json_res
    assert json_res["transcript"] == "Patient has headache. Prescribe Ibuprofen 400 mg twice daily for 2 days."
    assert json_res["prescription"]["diagnosis"] == "migraine"
    assert len(json_res["prescription"]["medications"]) == 1
    assert json_res["prescription"]["medications"][0]["medicine_name"] == "Ibuprofen"
    assert "pdf_url" in json_res
    
    # Verify PDF file was actually generated on the filesystem
    pdf_filename = Path(json_res["pdf_url"]).name
    generated_pdf_path = settings.PDF_DIR / pdf_filename
    assert generated_pdf_path.exists()
    assert generated_pdf_path.stat().st_size > 0
