import os
from fastapi import HTTPException, status
from pathlib import Path

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".aac", ".flac"}
MAX_FILE_SIZE_MB = 25

def validate_audio_file(filename: str, file_size: int) -> None:
    """
    Validates that the uploaded file is an audio file and complies with size restrictions.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )
        
    size_mb = file_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({size_mb:.1f}MB). Max size is {MAX_FILE_SIZE_MB}MB."
        )
