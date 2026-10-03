"""FastAPI app: thin routes only. All real work lives in services/."""
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from sqlmodel import Session, select

from config import get_settings
from db import get_session, init_db
from models import Meeting, Status
from schemas import MeetingCreated, MeetingDetail, MeetingListItem, Segment, Summary
from services.pipeline import process_meeting
from services.summarizer import fmt_ts

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
settings = get_settings()

ALLOWED_EXT = {".mp3", ".wav", ".m4a", ".mp4", ".webm", ".ogg", ".flac", ".aac", ".mov", ".mkv"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Meeting Summarizer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.frontend_origin.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------

def _get_or_404(session: Session, meeting_id: str) -> Meeting:
    m = session.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    return m


def _to_detail(m: Meeting) -> MeetingDetail:
    return MeetingDetail(
        id=m.id,
        filename=m.filename,
        title=m.title,
        status=m.status,
        duration_seconds=m.duration_seconds,
        created_at=m.created_at,
        error=m.error,
        segments=[Segment(**s) for s in json.loads(m.segments_json)] if m.segments_json else None,
        summary=Summary.model_validate_json(m.summary_json) if m.summary_json else None,
    )


# ---------- routes ----------

@app.get("/health")
def health():
    return {"ok": True, "transcriber": settings.transcriber, "llm": settings.llm_provider}


@app.post("/meetings", response_model=MeetingCreated, status_code=202)
def create_meeting(
    file: UploadFile,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}")

    meeting = Meeting(filename=file.filename, audio_path="")
    dest = settings.upload_dir / f"{meeting.id}{ext}"

    # Stream to disk in chunks so large recordings don't sit in memory
    max_bytes = settings.max_upload_mb * 1024 * 1024
    written = 0
    with dest.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB")
            out.write(chunk)

    meeting.audio_path = str(dest)
    session.add(meeting)
    session.commit()

    background.add_task(process_meeting, meeting.id)
    return MeetingCreated(id=meeting.id, status=meeting.status)


@app.get("/meetings", response_model=list[MeetingListItem])
def list_meetings(session: Session = Depends(get_session)):
    rows = session.exec(select(Meeting).order_by(Meeting.created_at.desc()).limit(50)).all()
    return [
        MeetingListItem(
            id=m.id, filename=m.filename, title=m.title, status=m.status,
            duration_seconds=m.duration_seconds, created_at=m.created_at,
        )
        for m in rows
    ]


@app.get("/meetings/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: str, session: Session = Depends(get_session)):
    return _to_detail(_get_or_404(session, meeting_id))


@app.get("/meetings/{meeting_id}/audio")
def get_audio(meeting_id: str, session: Session = Depends(get_session)):
    m = _get_or_404(session, meeting_id)
    if not Path(m.audio_path).exists():
        raise HTTPException(404, "Audio file missing")
    return FileResponse(m.audio_path)


@app.get("/meetings/{meeting_id}/export", response_class=PlainTextResponse)
def export_markdown(meeting_id: str, session: Session = Depends(get_session)):
    d = _to_detail(_get_or_404(session, meeting_id))
    if d.status != Status.done or not d.summary:
        raise HTTPException(409, "Meeting is not processed yet")
    s = d.summary

    def bullets(items):
        return "\n".join(f"- {i}" for i in items) or "_None_"

    actions = "\n".join(
        f"- [ ] {a.task}" + (f" — **{a.owner}**" if a.owner else "") + (f" (due: {a.due})" if a.due else "")
        for a in s.action_items
    ) or "_None_"
    transcript = "\n".join(f"**[{fmt_ts(seg.start)}]** {seg.text}  " for seg in d.segments or [])

    md = f"""# {s.title}

_Source: {d.filename} · {d.created_at:%d %b %Y}_

## TL;DR
{s.tldr}

## Key points
{bullets(s.key_points)}

## Decisions
{bullets(s.decisions)}

## Action items
{actions}

## Open questions
{bullets(s.open_questions)}

---

## Transcript
{transcript}
"""
    safe = "".join(c if c.isalnum() else "-" for c in s.title.lower()).strip("-")[:60] or "meeting"
    return PlainTextResponse(md, headers={"Content-Disposition": f'attachment; filename="{safe}.md"'})


@app.delete("/meetings/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: str, session: Session = Depends(get_session)):
    m = _get_or_404(session, meeting_id)
    Path(m.audio_path).unlink(missing_ok=True)
    session.delete(m)
    session.commit()


@app.post("/meetings/{meeting_id}/retry", response_model=MeetingCreated, status_code=202)
def retry_meeting(meeting_id: str, background: BackgroundTasks, session: Session = Depends(get_session)):
    m = _get_or_404(session, meeting_id)
    if m.status != Status.failed:
        raise HTTPException(409, "Only failed meetings can be retried")
    m.status, m.error = Status.queued, None
    session.add(m)
    session.commit()
    background.add_task(process_meeting, m.id)
    return MeetingCreated(id=m.id, status=m.status)
