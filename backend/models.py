import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


class Status(str, Enum):
    queued = "queued"
    transcribing = "transcribing"
    summarizing = "summarizing"
    done = "done"
    failed = "failed"


class Meeting(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12], primary_key=True)
    filename: str
    audio_path: str
    status: Status = Status.queued
    error: str | None = None
    duration_seconds: float | None = None
    title: str | None = None
    # Stored as JSON strings to keep the schema to one simple table
    segments_json: str | None = None
    summary_json: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
