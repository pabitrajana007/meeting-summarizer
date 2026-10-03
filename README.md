# Minutes — AI meeting summarizer

Upload a meeting recording and get a timestamped transcript, a TL;DR, key points, decisions,
action items with owners, and open questions. Export everything as Markdown.

**Stack:** Next.js 16 + Tailwind + TanStack Query (frontend) · FastAPI + SQLite (backend) ·
ffmpeg · faster-whisper or any Whisper API · Claude or any OpenAI-compatible LLM.

```
Browser ──upload──▶ FastAPI ──▶ ffmpeg ──▶ Whisper ──▶ LLM (map-reduce) ──▶ SQLite
   ▲                                                                          │
   └────────────── polls GET /meetings/{id} every 3s until "done" ◀───────────┘
```

---

## 1. Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **ffmpeg** on your PATH
  - Windows: `winget install Gyan.FFmpeg` (then restart the terminal)
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`

## 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
```

**Try it first with no keys and no models.** In `.env` set:

```
TRANSCRIBER=mock
LLM_PROVIDER=mock
```

Then run:

```bash
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs to see and test every endpoint.

## 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000 and drop any audio file. With mock mode you'll see a sample summary
within seconds, which proves the whole pipeline is wired up.

## 4. Switch to real AI

Edit `backend/.env` and restart uvicorn.

| Goal | Settings |
|---|---|
| **Free, local transcription** | `TRANSCRIBER=local`, `WHISPER_MODEL=small` (first run downloads the model, ~500 MB) |
| **Fast cloud transcription (Groq)** | `TRANSCRIBER=openai`, `STT_BASE_URL=https://api.groq.com/openai/v1`, `STT_MODEL=whisper-large-v3-turbo`, `STT_API_KEY=...` |
| **OpenAI Whisper API** | `TRANSCRIBER=openai`, `STT_MODEL=whisper-1`, `STT_API_KEY=...` |
| **Claude for summaries** | `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-5-5`, `LLM_API_KEY=...` |
| **Any OpenAI-compatible LLM** | `LLM_PROVIDER=openai`, `LLM_MODEL=...`, `LLM_API_KEY=...`, `LLM_BASE_URL=...` |
| **Fully offline with Ollama** | `LLM_PROVIDER=openai`, `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_MODEL=llama3.1` |

Tips:
- On CPU, `small` is the sweet spot. Use `base` if it's too slow, `medium` for better Hinglish.
- With an NVIDIA GPU: `WHISPER_DEVICE=cuda`, `WHISPER_COMPUTE_TYPE=float16`.
- Hosted Whisper APIs usually cap uploads around 25 MB; for long meetings use local mode or
  split the audio.

## 5. Project structure

```
backend/
  main.py                 routes only: upload, list, detail, audio, export, retry, delete
  config.py               all settings, read from .env
  db.py / models.py       SQLite engine + Meeting table
  schemas.py              Pydantic shapes (Segment, Summary, ActionItem...)
  services/
    audio.py              ffmpeg → 16 kHz mono WAV, duration
    transcriber.py        local | openai | mock  → list[Segment]
    summarizer.py         chunk transcript → map → reduce → Summary JSON
    pipeline.py           runs the steps, updates status, records errors

frontend/
  app/page.tsx            upload + recent meetings
  app/meetings/[id]/      status stepper → summary / action items / transcript tabs
  components/             dropzone, list, stepper, summary, action items, transcript
  hooks/                  useMeeting (polling), useUpload (progress)
  lib/api.ts              typed API client
```

## 6. API

| Method | Path | What it does |
|---|---|---|
| `POST` | `/meetings` | Upload a file (multipart `file`), returns `{id}` and starts processing |
| `GET` | `/meetings` | Latest 50 meetings |
| `GET` | `/meetings/{id}` | Status + transcript + summary |
| `GET` | `/meetings/{id}/audio` | The original recording (for the player) |
| `GET` | `/meetings/{id}/export` | Markdown download |
| `POST` | `/meetings/{id}/retry` | Re-run a failed meeting |
| `DELETE` | `/meetings/{id}` | Delete meeting + audio |
