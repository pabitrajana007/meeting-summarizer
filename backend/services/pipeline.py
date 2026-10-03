"""Runs one meeting through: ffmpeg -> transcribe -> summarize, updating status as it goes."""
import json
import logging
import traceback
from pathlib import Path

from sqlmodel import Session

from db import engine
from models import Meeting, Status
from services import audio, summarizer, transcriber

log = logging.getLogger("pipeline")


def _update(meeting_id: str, **fields) -> None:
    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        for k, v in fields.items():
            setattr(m, k, v)
        session.add(m)
        session.commit()


def process_meeting(meeting_id: str) -> None:
    """Called as a FastAPI BackgroundTask. Never raises: failures are stored on the row."""
    with Session(engine) as session:
        meeting = session.get(Meeting, meeting_id)
        src = Path(meeting.audio_path)

    try:
        _update(meeting_id, status=Status.transcribing, duration_seconds=audio.duration_seconds(src))
        wav = audio.to_wav(src)
        segments = transcriber.transcribe(wav)
        wav.unlink(missing_ok=True)
        _update(
            meeting_id,
            status=Status.summarizing,
            segments_json=json.dumps([s.model_dump() for s in segments]),
        )
        log.info("meeting %s: %d segments transcribed", meeting_id, len(segments))

        summary = summarizer.summarize(segments)
        _update(
            meeting_id,
            status=Status.done,
            title=summary.title,
            summary_json=summary.model_dump_json(),
        )
        log.info("meeting %s: done", meeting_id)

    except Exception as e:
        log.error("meeting %s failed:\n%s", meeting_id, traceback.format_exc())
        _update(meeting_id, status=Status.failed, error=str(e)[:500])
