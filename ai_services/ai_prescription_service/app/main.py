import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.api.prescription import router as prescription_router
from app.utils.file_handler import ensure_directory_exists

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("prescription_service")

# Initialize Directories
ensure_directory_exists(settings.UPLOAD_DIR)
ensure_directory_exists(settings.PDF_DIR)

app = FastAPI(
    title="AI-Powered Prescription Generation Microservice",
    description=" FastAPI microservice that records doctor speech, converts it to text, structures it into JSON using LLMs, and generates downloadable prescription PDFs.",
    version="1.0.0"
)

# CORS Configuration
# Allow all origins for the MVP to allow easy local integration later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount generated PDFs folder as static files
# This makes PDF downloads accessible via http://localhost:8001/generated_pdfs/<filename>.pdf
app.mount("/generated_pdfs", StaticFiles(directory=str(settings.PDF_DIR)), name="generated_pdfs")

# Include Routers
app.include_router(prescription_router)

@app.get("/", include_in_schema=False)
async def root():
    """Redirects the root URL to Swagger API documentation."""
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple service health check endpoint."""
    return {"status": "healthy", "service": "prescription-generation-microservice"}
