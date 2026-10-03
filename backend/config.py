from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Transcription
    transcriber: str = "local"  # local | openai | mock
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    stt_api_key: str = ""
    stt_base_url: str = ""
    stt_model: str = "whisper-1"

    # Summarization
    llm_provider: str = "anthropic"  # anthropic | openai | mock
    llm_model: str = "claude-sonnet-5-5"
    llm_api_key: str = ""
    llm_base_url: str = ""

    # App
    chunk_words: int = 1500
    frontend_origin: str = "http://localhost:3000"
    database_url: str = "sqlite:///./data/meetings.db"
    upload_dir: Path = Path("./data/uploads")
    max_upload_mb: int = 500


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.upload_dir.mkdir(parents=True, exist_ok=True)
    return s
