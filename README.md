# Executive Productivity Agent

An AI agent that converts messy executive inputs (emails, meeting notes, voice
notes) into a structured daily action brief for **Arjun Malhotra (VP Sales)**.

It identifies commitments, separates "my actions" from "waiting on others",
detects deadlines/overdue items, flags unclear ownership instead of
inventing it, and answers natural-language questions like *"What did I
promise Raghav?"*.

---

## Architecture

```
data/*.json (meetings, emails, voice notes)
        |
        v
extraction_agent.py  --(local LLM via Ollama)-->  raw commitments (JSON)
        |
        v
thread_resolver.py   --(deterministic rules)-->   corrected status/deadline
        |
        v
brief_generator.py   --(categorization)-->        Daily Brief
        |
        v
main.py (FastAPI)  -->  GET /brief   -->  full categorized brief
                    -->  POST /ask   -->  natural-language Q&A over the brief
```

**Why a two-stage pipeline (LLM + deterministic resolver)?**
The local 3B model is good at semantic extraction (identifying that a
commitment exists, who's involved, roughly what's being asked) but
unreliable at multi-step temporal reasoning across a thread (e.g. figuring
out that a later message supersedes an earlier one, or that a thread was
already resolved). Rather than fight this purely with prompt engineering,
`thread_resolver.py` deterministically re-derives `status` and `deadline`
by scanning the raw thread messages directly, using the model's original
extraction for classification and free-text reasoning. This is documented
as a design decision, not a workaround.

## AI tools used

- **Ollama + qwen2.5:3b** (local, on-device LLM) — used for commitment
  extraction from unstructured text. Originally built against the OpenAI
  API (`gpt-4o-mini`), switched to a local model after hitting API quota
  limits; kept it local afterward since it removes any dependency on
  external credits/rate limits for grading/demo purposes.

## Inputs & sources

- `data/meetings.json` — leadership sync transcript
- `data/emails.json` — 5 email threads (vendor list, campaign deck,
  Meridian call reschedule, expense report, Mumbai lease renewal)
- `data/voice_notes.json` — 2 personal voice memos from Arjun (treated as
  his own commitments/reminders, not third-party instructions)

## Assumptions

- The scenario week is Monday 21 Sep – Friday 25 Sep 2026 (fixed, given by
  the assignment data pack).
- The daily brief is generated with `TODAY = 2026-09-25` (Friday) as the
  simulated "current day", so overdue detection has something meaningful
  to flag against.
- Ownership is only assigned when explicitly confirmed in the source text;
  otherwise the task is flagged `ownership_unclear: true` rather than
  defaulting to Arjun.

## Known limitations

- The local 3B model occasionally misattributes ownership on "ask vs.
  deliver" threads (e.g. sometimes labels a report *Arjun requested* as
  his own action rather than the sender's). The `thread_resolver.py`
  module fixes status/deadline deterministically but does not currently
  correct this specific ownership pattern — flagged here rather than
  silently accepted.
- Output can vary slightly across runs even at `temperature=0`, which is a
  known characteristic of local Ollama serving.

## How to run

**Prerequisites:** Python 3.13, [Ollama](https://ollama.com) installed
locally.

```bash
# 1. Pull the local model (one-time)
ollama pull qwen2.5:3b

# 2. Set up the Python environment
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# 3. Start the API server
uvicorn backend.main:app --reload

# 4. Open the interactive API docs
# http://127.0.0.1:8000/docs
```

From `/docs`:
- `GET /brief` — runs the full pipeline and returns the categorized daily
  brief (My Actions / Waiting on Others / Unclear Ownership / Overdue /
  Completed).
- `POST /ask` — ask a question, e.g. `{"question": "What did I promise
  Raghav?"}`. Uses the most recently generated brief as context.

## Project structure

```
backend/
  main.py                 # FastAPI app: /brief, /ask endpoints
  models/
    commitment.py          # Pydantic schema for a commitment/task
  agents/
    extraction_agent.py     # LLM-based extraction from raw sources
    thread_resolver.py      # Deterministic status/deadline correction
    brief_generator.py      # Categorizes commitments into a daily brief
    query_agent.py           # Natural-language Q&A over the brief
data/
  meetings.json, emails.json, voice_notes.json, calendar.json
  latest_brief.json         # Cached output of the last /brief call
```