"""ffmpeg helpers: normalize any audio/video file to 16 kHz mono WAV for Whisper."""
import json
import subprocess
from pathlib import Path


class AudioError(RuntimeError):
    pass


def to_wav(src: Path) -> Path:
    """Convert any input (mp3, m4a, mp4, webm...) to 16kHz mono WAV next to the source."""
    dst = src.with_suffix(".16k.wav")
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(src),
        "-vn",            # drop video track (Zoom/Meet exports are often mp4)
        "-ac", "1",       # mono
        "-ar", "16000",   # 16 kHz
        str(dst),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError as e:
        raise AudioError("ffmpeg is not installed or not on PATH") from e
    except subprocess.CalledProcessError as e:
        raise AudioError(f"ffmpeg failed: {e.stderr.strip()[:300]}") from e
    return dst


def duration_seconds(path: Path) -> float | None:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
        return round(float(json.loads(out)["format"]["duration"]), 1)
    except Exception:
        return None
