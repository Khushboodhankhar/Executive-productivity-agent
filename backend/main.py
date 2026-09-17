import json
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "agents"))

from extraction_agent import extract_commitments, DATA_DIR  # noqa: E402
from thread_resolver import resolve_threads, apply_resolution  # noqa: E402
from brief_generator import build_brief  # noqa: E402
from query_agent import ask as ask_query_agent  # noqa: E402

app = FastAPI(title="Executive Productivity Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Question(BaseModel):
    question: str


def _get_all_tasks_from_brief(brief: dict) -> list[dict]:
    return (
        brief["my_actions"]
        + brief["waiting_on_others"]
        + brief["unclear_ownership"]
        + brief["completed"]
    )


@app.get("/brief")
def get_brief():
    """
    Runs the full pipeline (extraction -> resolver -> brief) and
    returns the categorized daily brief.
    """
    commitments = extract_commitments()
    resolved = resolve_threads(DATA_DIR / "emails.json")
    commitments = apply_resolution(commitments, resolved)
    brief = build_brief(commitments)

    # cache for /ask to reuse without re-running extraction each time
    with open(DATA_DIR / "latest_brief.json", "w", encoding="utf-8") as f:
        json.dump(brief, f, indent=2)

    return brief


@app.post("/ask")
def post_ask(q: Question):
    """
    Answers a natural-language question using the most recently
    generated brief. Call /brief at least once first.
    """
    brief_path = DATA_DIR / "latest_brief.json"
    if not brief_path.exists():
        return {"error": "No brief generated yet. Call /brief first."}

    with open(brief_path, "r", encoding="utf-8") as f:
        brief = json.load(f)

    all_tasks = _get_all_tasks_from_brief(brief)
    answer = ask_query_agent(q.question, all_tasks)
    return {"question": q.question, "answer": answer}


@app.get("/")
def root():
    return {"status": "ok", "endpoints": ["/brief", "/ask (POST)"]}