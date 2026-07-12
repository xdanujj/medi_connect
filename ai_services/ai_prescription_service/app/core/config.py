import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    def __init__(self):
        self.PORT: int = int(os.getenv("PORT", 8001))
        self.HOST: str = os.getenv("HOST", "127.0.0.1")
        
        # LLM Keys
        self.GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
        self.OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
        
        # Selected Model Name
        self.MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-1.5-flash")
        
        # Whisper Model Configuration
        self.WHISPER_MODEL_NAME: str = os.getenv("WHISPER_MODEL_NAME", "small")
        
        # Upload and PDF Directories (ensures absolute path calculation)
        self.BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
        
        upload_dir = os.getenv("UPLOAD_DIR", "uploads")
        self.UPLOAD_DIR: Path = Path(upload_dir) if Path(upload_dir).is_absolute() else self.BASE_DIR / upload_dir
        
        pdf_dir = os.getenv("PDF_DIR", "generated_pdfs")
        self.PDF_DIR: Path = Path(pdf_dir) if Path(pdf_dir).is_absolute() else self.BASE_DIR / pdf_dir

settings = Settings()
