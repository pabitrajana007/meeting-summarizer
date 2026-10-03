"""Map-reduce summarization.

map:    each ~CHUNK_WORDS slice of the transcript -> partial notes (JSON)
reduce: all partial notes -> one final Summary (JSON)

Short meetings (one chunk) skip straight to the final summary.
"""
import json
import re

from pydantic import ValidationError

from config import get_settings
from schemas import Segment, Summary

settings = get_settings()

SCHEMA_HINT = """{
  "title": "short descriptive meeting title",
  "tldr": "2-3 sentence summary",
  "key_points": ["..."],
  "decisions": ["..."],
  "action_items": [{"task": "...", "owner": "name or null", "due": "date/deadline or null"}],
  "open_questions": ["..."]
}"""

SYSTEM = (
    "You are an expert meeting note-taker. You turn raw meeting transcripts into accurate, "
    "concise notes. Only include facts stated in the transcript; never invent owners or dates "
    "(use null when unknown). Transcripts may mix English and Hindi; always write notes in English. "
    "Respond with ONLY a JSON object, no markdown fences, no commentary."
)

MAP_PROMPT = """Below is part {i} of {n} of a meeting transcript, with [mm:ss] timestamps.
Extract notes for THIS PART ONLY as JSON matching this shape:
{schema}

Transcript part:
{text}"""

REDUCE_PROMPT = """These are notes extracted from consecutive parts of one meeting.
Merge them into a single final set of notes. Remove duplicates, keep the most specific
version of each item, and make the title and tldr describe the whole meeting.
Return JSON matching this shape:
{schema}

Partial notes:
{notes}"""

SINGLE_PROMPT = """Here is a full meeting transcript with [mm:ss] timestamps.
Write meeting notes as JSON matching this shape:
{schema}

Transcript:
{text}"""


# ---------- public ----------

def summarize(segments: list[Segment]) -> Summary:
    chunks = chunk_transcript(segments, settings.chunk_words)
    if not chunks:
        return Summary(title="Empty recording", tldr="No speech was detected in this recording.")

    if len(chunks) == 1:
        return _ask_for_summary(SINGLE_PROMPT.format(schema=SCHEMA_HINT, text=chunks[0]))

    partials = [
        _ask_for_summary(MAP_PROMPT.format(i=i + 1, n=len(chunks), schema=SCHEMA_HINT, text=c))
        for i, c in enumerate(chunks)
    ]
    notes = "\n\n".join(f"Part {i + 1}:\n{p.model_dump_json(indent=1)}" for i, p in enumerate(partials))
    return _ask_for_summary(REDUCE_PROMPT.format(schema=SCHEMA_HINT, notes=notes))


def chunk_transcript(segments: list[Segment], max_words: int) -> list[str]:
    """Group segments into chunks of ~max_words, never splitting a segment."""
    chunks, current, count = [], [], 0
    for s in segments:
        line = f"[{fmt_ts(s.start)}] {s.text}"
        words = len(s.text.split())
        if current and count + words > max_words:
            chunks.append("\n".join(current))
            current, count = [], 0
        current.append(line)
        count += words
    if current:
        chunks.append("\n".join(current))
    return chunks


def fmt_ts(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


# ---------- LLM plumbing ----------

def _ask_for_summary(prompt: str, retries: int = 1) -> Summary:
    last_err = None
    for _ in range(retries + 1):
        raw = _complete(SYSTEM, prompt)
        try:
            return Summary.model_validate(_extract_json(raw))
        except (ValueError, ValidationError) as e:
            last_err = e
            prompt += "\n\nYour previous reply was not valid JSON for the shape above. Reply with ONLY the JSON object."
    raise RuntimeError(f"LLM did not return valid JSON: {last_err}")


def _extract_json(text: str) -> dict:
    """Parse JSON even if the model wrapped it in ```json fences or added prose."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found")
    return json.loads(text[start : end + 1])


def _complete(system: str, user: str) -> str:
    provider = settings.llm_provider.lower()

    if provider == "anthropic":
        import anthropic

        client = anthropic.Anthropic(api_key=settings.llm_api_key or None)
        msg = client.messages.create(
            model=settings.llm_model,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in msg.content if b.type == "text")

    if provider == "openai":  # OpenAI, Groq, Ollama, any OpenAI-compatible endpoint
        from openai import OpenAI

        client = OpenAI(api_key=settings.llm_api_key or "not-needed", base_url=settings.llm_base_url or None)
        resp = client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        return resp.choices[0].message.content or ""

    if provider == "mock":
        return json.dumps(_MOCK_SUMMARY)

    raise ValueError(f"Unknown LLM_PROVIDER '{settings.llm_provider}' (use anthropic | openai | mock)")


_MOCK_SUMMARY = {
    "title": "Mobile app launch planning",
    "tldr": "The team reviewed launch readiness. Payment testing needs two more days, so the launch moves to Friday the 17th, and marketing will update its calendar to match.",
    "key_points": [
        "Backend API is complete; payment integration still needs testing.",
        "Launch date moved to next Friday, the 17th.",
        "Marketing calendar must be realigned with the new date.",
    ],
    "decisions": ["Move the launch to Friday the 17th."],
    "action_items": [
        {"task": "Finish payment integration testing", "owner": "Priya", "due": "In 2 days"},
        {"task": "Update marketing calendar and inform the social team", "owner": "Rahul", "due": "Monday"},
        {"task": "Send out meeting notes", "owner": None, "due": "Today"},
    ],
    "open_questions": ["Should UPI autopay be supported at launch or in version two?"],
}
