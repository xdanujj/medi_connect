import os
import uuid
from pathlib import Path
from fastapi import UploadFile

def ensure_directory_exists(directory_path: Path) -> None:
    """Creates a directory if it does not exist."""
    directory_path.mkdir(parents=True, exist_ok=True)

def get_unique_filename(original_filename: str) -> str:
    """Generates a unique filename using UUID to prevent collisions."""
    ext = Path(original_filename).suffix
    # Default extension fallback if empty
    if not ext:
        ext = ".wav"
    return f"{uuid.uuid4()}{ext}"

async def save_upload_file(upload_file: UploadFile, destination_dir: Path) -> Path:
    """Saves a FastAPI UploadFile to the destination directory under a unique name."""
    ensure_directory_exists(destination_dir)
    unique_name = get_unique_filename(upload_file.filename or "audio")
    destination_path = destination_dir / unique_name
    
    with open(destination_path, "wb") as buffer:
        while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
            buffer.write(chunk)
            
    return destination_path
