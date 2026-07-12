# AI-Powered Prescription Generation Microservice

This is an AI-powered FastAPI microservice that processes spoken doctor consultation recordings, transcribes them using Whisper AI, formats them into structured JSON schemas using Gemini/OpenAI, and renders them into downloadable, print-ready PDFs.

## Architecture

```text
Doctor Speech (Audio Upload)
            ↓
Speech-to-Text (faster-whisper)
            ↓
Plain Text Transcript
            ↓
LLM Parser (Gemini or OpenAI API)
            ↓
Structured Prescription JSON
            ↓
PDF Generator (ReportLab Layout)
            ↓
Downloadable URL link (.pdf)
```

## Setup Instructions

### 1. Prerequisites
Ensure you have **Python 3.10+** (Python 3.12.9 is verified) installed.

### 2. Environment Configurations
Rename `.env.example` to `.env` inside this folder and configure the variables:
```env
# Choose your preferred LLM provider.
# If both keys are set, Gemini will be prioritized.
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Model Choice:
# For Gemini: gemini-1.5-flash
# For OpenAI: gpt-4o-mini
MODEL_NAME=gemini-1.5-flash

# Whisper Model (tiny, base, small, medium, large-v3)
WHISPER_MODEL_NAME=small
```

### 3. Installation
Install dependencies globally or inside a virtual environment:
```bash
pip install -r requirements.txt
```

---

## Running the Service

Start the FastAPI server:
```bash
python run.py
```

* **Interactive Swagger UI**: Check and test endpoints directly at `http://127.0.0.1:8001/docs`
* **Health Check**: `http://127.0.0.1:8001/health`

---

## API Documentation

### **POST** `/prescription/generate`
Generates structured JSON data and PDF file URL from an uploaded audio file.

* **Request Format**: `multipart/form-data`
  * `file`: Binary audio file (supports `.wav`, `.mp3`, `.m4a`, etc. - Max 25MB).
  * **Doctor Metadata (Optional)**:
    * `doctor_name`: (string, default: "Dr. Jane Doe")
    * `doctor_specialty`: (string, default: "General Physician")
    * `doctor_license`: (string, default: "REG-12345")
    * `doctor_clinic`: (string, default: "MediConnect Clinic")
    * `doctor_contact`: (string, default: "+91 98765 43210")
  * **Patient Metadata (Optional)**:
    * `patient_name`: (string, default: "John Doe")
    * `patient_age`: (string, default: "30")
    * `patient_gender`: (string, default: "Male")
    * `patient_date`: (string YYYY-MM-DD, default: current date)

* **Response Format**: `application/json`
```json
{
  "transcript": "Patient has high fever for three days. Suggest Paracetamol 650 mg twice daily after food for five days. Get plenty of rest and drink warm water.",
  "prescription": {
    "symptoms": ["high fever for three days"],
    "diagnosis": "viral fever",
    "medications": [
      {
        "medicine_name": "Paracetamol",
        "dosage": "650 mg",
        "frequency": "Twice daily",
        "duration": "5 days",
        "instructions": "After food"
      }
    ],
    "advice": [
      "Get plenty of rest",
      "drink warm water"
    ]
  },
  "pdf_url": "http://127.0.0.1:8001/generated_pdfs/<unique_id>.pdf"
}
```

---

## Running Tests

Run pytest to test core services, LLM parser, PDF creation, and end-to-end routing.
```bash
pytest tests/test_prescription.py -v
```
