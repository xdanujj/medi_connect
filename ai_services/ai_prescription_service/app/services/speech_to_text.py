import logging
from pathlib import Path
from typing import Tuple
from faster_whisper import WhisperModel
from app.core.config import settings

logger = logging.getLogger("prescription_service.stt")

class SpeechToTextService:
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SpeechToTextService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            model_size = settings.WHISPER_MODEL_NAME
            logger.info(f"Loading Whisper model '{model_size}'...")
            
            # Check for CUDA availability
            try:
                import torch
                cuda_available = torch.cuda.is_available()
            except ImportError:
                cuda_available = False

            if cuda_available:
                logger.info("CUDA GPU detected. Attempting to load Whisper model on CUDA with float16...")
                try:
                    self._model = WhisperModel(model_size, device="cuda", compute_type="float16")
                    logger.info("Successfully loaded Whisper model on CUDA.")
                except Exception as e:
                    logger.warning(f"Failed to load Whisper on CUDA: {e}. Falling back to CPU with int8...")
                    self._model = WhisperModel(model_size, device="cpu", compute_type="int8")
            else:
                logger.info("CUDA GPU not detected or PyTorch not installed. Loading Whisper model on CPU with int8...")
                self._model = WhisperModel(model_size, device="cpu", compute_type="int8")
                logger.info("Successfully loaded Whisper model on CPU.")
                
        return self._model

    def transcribe(self, audio_path: Path) -> str:
        """
        Transcribes the given audio file using faster-whisper.
        Returns the plain text transcription.
        """
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found at: {audio_path}")

        logger.info(f"Transcribing audio file: {audio_path}")
        model = self._get_model()
        
        # Transcribe audio. beam_size=5 is standard for a good trade-off.
        # vad_filter=True filters out silent portions to improve speed and transcription quality.
        segments, info = model.transcribe(
            str(audio_path),
            beam_size=5,
            vad_filter=True,
            language="en"  # Defaults to English, can be auto-detected or omitted if multilingual transcriptions are desired
        )
        
        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text)
            
        full_transcript = " ".join(transcript_parts).strip()
        logger.info("Transcription completed.")
        return full_transcript

stt_service = SpeechToTextService()
