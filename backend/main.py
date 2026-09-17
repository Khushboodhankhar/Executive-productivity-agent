import json
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "agents"))

from extraction_agent import extract_commitments, DATA_DIR
from thread_resolver import resolve_threads, apply_resolution
from brief_generator import build_brief
from query_agent import ask as ask_query_agent


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
        brief.get("my_actions", [])
        + brief.get("waiting_on_others", [])
        + brief.get("unclear_ownership", [])
        + brief.get("completed", [])
    )


def refresh_brief():
    """Run AI extraction and generate a fresh executive brief."""

    commitments = extract_commitments()

    resolved = resolve_threads(DATA_DIR / "emails.json")

    commitments = apply_resolution(
        commitments,
        resolved
    )

    brief = build_brief(commitments)

    brief_path = DATA_DIR / "latest_brief.json"

    with open(
        brief_path,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            brief,
            f,
            indent=2
        )

    return brief


@app.get("/brief")
def get_brief():
    """
    Fast dashboard endpoint.

    If a cached brief already exists,
    return it immediately.

    AI processing only happens when
    no cached brief exists.
    """

    brief_path = DATA_DIR / "latest_brief.json"

    if brief_path.exists():

        with open(
            brief_path,
            "r",
            encoding="utf-8"
        ) as f:
            return json.load(f)

    return refresh_brief()


@app.post("/brief/refresh")
def post_refresh_brief():
    """
    Explicitly refresh the brief using AI.
    """

    return refresh_brief()


@app.post("/ask")
def post_ask(q: Question):

    brief_path = DATA_DIR / "latest_brief.json"

    if not brief_path.exists():

        return {
            "error": "No brief generated yet. Call /brief first."
        }

    with open(
        brief_path,
        "r",
        encoding="utf-8"
    ) as f:
        brief = json.load(f)

    all_tasks = _get_all_tasks_from_brief(brief)

    answer = ask_query_agent(
        q.question,
        all_tasks
    )

    return {
        "question": q.question,
        "answer": answer
    }


@app.get("/")
def root():

    return {
        "status": "ok",
        "endpoints": [
            "/brief",
            "/brief/refresh",
            "/ask"
        ]
    }