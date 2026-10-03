"""Pydantic shapes shared by the pipeline and the API."""
from datetime import datetime

from pydantic import BaseModel, Field


class Segment(BaseModel):
    start: float  # seconds
    end: float
    text: str


class ActionItem(BaseModel):
    task: str
    owner: str | None = None
    due: str | None = None


class Summary(BaseModel):
    title: str = "Untitled meeting"
    tldr: str = ""
    key_points: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class MeetingListItem(BaseModel):
    id: str
    filename: str
    title: str | None
    status: str
    duration_seconds: float | None
    created_at: datetime


class MeetingDetail(MeetingListItem):
    error: str | None
    segments: list[Segment] | None
    summary: Summary | None


class MeetingCreated(BaseModel):
    id: str
    status: str
