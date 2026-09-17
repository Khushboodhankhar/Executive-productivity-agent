import json
import logging
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

from thread_resolver import resolve_threads, apply_resolution

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # dummy value, Ollama ignore karega
)

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"

SYSTEM_PROMPT = """
You are an Executive Productivity Agent.

Your job is to extract commitments and actionable tasks from executive
meeting notes, emails, and voice notes.

Reference dates for this week (use these exactly, never guess a date):
Monday = 2026-09-21
Tuesday = 2026-09-22
Wednesday = 2026-09-23
Thursday = 2026-09-24
Friday = 2026-09-25

Rules:
1. Never invent an owner. If no person is explicitly and clearly confirmed
   as responsible in the text, set owner=null, classification="UNCLEAR_OWNER",
   and ownership_unclear=true. Do NOT default the owner to Arjun Malhotra
   just because he is the executive this agent serves.
2. Never invent a deadline. Only use dates/times explicitly stated or
   directly derivable from the reference dates above.
3. Distinguish:
   - MY_ACTION: Arjun Malhotra himself must send/do/deliver something.
   - WAITING_ON_OTHER: another named person owes Arjun a deliverable.
   - UNCLEAR_OWNER: responsibility is not established in the text.
4. Each subject/thread may contain multiple messages over time. ALWAYS use
   the LATEST message in a thread as the source of truth for deadline and
   status — earlier messages may be superseded or changed later.
5. If the latest message in a thread confirms something was sent, received,
   delivered, or confirmed, set status="done", not "open".
6. Combine information about the same task across sources when possible,
   but do not merge unrelated tasks.
7. Use only information provided in the input. Do not use outside knowledge.
8. Return valid JSON only, no explanation, no markdown fences.

Return a JSON object with a single key "tasks", whose value is an array
using this structure:

{
  "tasks": [
    {
      "task_id": "TASK-001",
      "title": "short action title",
      "owner": "person or null",
      "counterparty": "person or null",
      "status": "open or done",
      "deadline": "YYYY-MM-DD or YYYY-MM-DD HH:MM or null",
      "deadline_precision": "exact/morning/evening/EOD/week/null",
      "classification": "MY_ACTION/WAITING_ON_OTHER/UNCLEAR_OWNER",
      "source_ids": [],
      "confidence": 0.0,
      "ownership_unclear": false
    }
  ]
}
"""


def load_sources() -> list[dict]:
    """
    Load meeting, email, and voice note sources from the data directory.
    """
    sources = []
    files = [
        ("meetings", DATA_DIR / "meetings.json"),
        ("emails", DATA_DIR / "emails.json"),
        ("voice_notes", DATA_DIR / "voice_notes.json"),
    ]

    for source_type, file_path in files:
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                sources.append({"source_type": source_type, "data": data})
                logging.info("Loaded source: %s", file_path.name)
            except json.JSONDecodeError as e:
                logging.error("Invalid JSON in %s: %s", file_path, e)

    return sources


def extract_commitments() -> list[dict]:
    """
    Extract actionable commitments using the local Ollama model.
    """
    sources = load_sources()

    user_prompt = f"""
Extract all actionable commitments from the following Data Pack sources.

Executive:
Arjun Malhotra

Sources:
{json.dumps(sources, indent=2)}

Return JSON only, in the exact structure described in the system prompt.
"""

    response = client.chat.completions.create(
        model="qwen2.5:3b",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Defensive cleanup in case the model wraps output in markdown fences
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        logging.error("Failed to parse response: %s", e)
        logging.error("Raw response was: %s", raw)
        return []

    # The model returns {"tasks": [...]} because json_object mode requires
    # a top-level object, not a bare array. Unwrap it here.
    if isinstance(parsed, dict) and "tasks" in parsed:
        tasks = parsed["tasks"]
    elif isinstance(parsed, list):
        tasks = parsed
    else:
        logging.error("Unexpected response shape: %s", type(parsed))
        return []

    logging.info("Successfully extracted %d commitments", len(tasks))
    return tasks


if __name__ == "__main__":
    commitments = extract_commitments()
    resolved = resolve_threads(DATA_DIR / "emails.json")
    commitments = apply_resolution(commitments, resolved)
    print(json.dumps(commitments, indent=2))