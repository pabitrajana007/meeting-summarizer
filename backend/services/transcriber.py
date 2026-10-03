"""Speech-to-text. Swap providers with TRANSCRIBER in .env; every provider returns list[Segment]."""
from functools import lru_cache
from pathlib import Path

from config import get_settings
from schemas import Segment

settings = get_settings()


def transcribe(wav_path: Path) -> list[Segment]:
    provider = settings.transcriber.lower()
    if provider == "local":
        return _transcribe_local(wav_path)
    if provider == "openai":
        return _transcribe_openai(wav_path)
    if provider == "mock":
        return _transcribe_mock(wav_path)
    raise ValueError(f"Unknown TRANSCRIBER '{settings.transcriber}' (use local | openai | mock)")


# ---------- local: faster-whisper ----------

@lru_cache
def _whisper_model():
    from faster_whisper import WhisperModel  # imported lazily: heavy

    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


def _transcribe_local(wav_path: Path) -> list[Segment]:
    segments, _info = _whisper_model().transcribe(
        str(wav_path),
        vad_filter=True,  # skip silences: faster and fewer hallucinations
        beam_size=5,
    )
    return [Segment(start=s.start, end=s.end, text=s.text.strip()) for s in segments if s.text.strip()]


# ---------- openai-compatible API (OpenAI, Groq, ...) ----------

def _transcribe_openai(wav_path: Path) -> list[Segment]:
    from openai import OpenAI

    client = OpenAI(api_key=settings.stt_api_key, base_url=settings.stt_base_url or None)
    # Note: most hosted Whisper APIs cap uploads at ~25 MB. A 16kHz mono WAV is ~1.9 MB/min,
    # so for long meetings convert to mp3 or split the file first.
    with open(wav_path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model=settings.stt_model,
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    raw = getattr(resp, "segments", None) or []
    if not raw:  # some providers only return text
        return [Segment(start=0, end=0, text=resp.text.strip())]
    out = []
    for s in raw:
        get = s.get if isinstance(s, dict) else lambda k: getattr(s, k)
        out.append(Segment(start=get("start"), end=get("end"), text=get("text").strip()))
    return out


# ---------- mock: for testing the app without models or keys ----------

_MOCK_LINES = [
    "Okay, let's get started. Today we need to finalize the launch plan for the mobile app.",
    "Priya, can you give us the status on the backend?",
    "Sure. The API is done, but the payment integration still needs testing. I need two more days.",
    "That works. Let's move the launch to next Friday then, the 17th.",
    "Agreed. Rahul, can you update the marketing calendar to match?",
    "Yes, I'll update it by Monday and let the social team know.",
    "One open question: do we support UPI autopay at launch or in version two?",
    "Let's decide that after we see the testing results. Anything else?",
    "I'll send out the meeting notes today. Thanks everyone.",
]


def _transcribe_mock(wav_path: Path) -> list[Segment]:
    return [Segment(start=i * 8.0, end=i * 8.0 + 7.5, text=t) for i, t in enumerate(_MOCK_LINES)]
