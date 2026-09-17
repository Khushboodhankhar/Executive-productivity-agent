import json
from pathlib import Path

WEEKDAY_MAP = {
    "monday": "2026-09-21",
    "tuesday": "2026-09-22",
    "wednesday": "2026-09-23",
    "thursday": "2026-09-24",
    "friday": "2026-09-25",
}

DONE_KEYWORDS = ["confirmed", "attached", "acknowledged receipt", "sent as promised", "got it"]
SKIP_PHRASES = ["checking if", "still good", "still on", "any update", "please confirm who", "unowned"]
TIME_WORDS = ["morning", "evening", "afternoon", "eod", "end of day"]


def is_done(last_text: str) -> bool:
    text = last_text.lower()
    return any(kw in text for kw in DONE_KEYWORDS)


def find_deadline(messages: list[dict]) -> tuple[str | None, str | None]:
    """
    Walk messages backward, skip check-in/follow-up questions,
    return (date, precision) from the first real commitment statement found.
    """
    for msg in reversed(messages):
        text = msg["text"].lower()
        if any(p in text for p in SKIP_PHRASES):
            continue

        for day, date in WEEKDAY_MAP.items():
            if day in text:
                precision = next((t for t in TIME_WORDS if t in text), "exact")
                return date, precision

    return None, None


def resolve_threads(emails_path: Path) -> dict:
    with open(emails_path, "r", encoding="utf-8") as f:
        threads = json.load(f)

    resolved = {}
    for thread in threads:
        messages = thread["messages"]
        last_msg = messages[-1]
        deadline, precision = find_deadline(messages)

        resolved[thread["thread_id"]] = {
            "status": "done" if is_done(last_msg["text"]) else "open",
            "deadline": deadline,
            "deadline_precision": precision,
        }

    return resolved


def apply_resolution(commitments: list[dict], resolved: dict) -> list[dict]:
    """
    Overwrite each commitment's status/deadline using the resolver's
    output, matched via source_ids -> thread_id.
    """
    for c in commitments:
        for src_id in c.get("source_ids", []):
            if src_id in resolved:
                fix = resolved[src_id]
                if fix["status"] == "done":
                    c["status"] = "done"
                if fix["deadline"]:
                    c["deadline"] = fix["deadline"]
                    c["deadline_precision"] = fix["deadline_precision"]
    return commitments


if __name__ == "__main__":
    BASE_DIR = Path(__file__).resolve().parents[2]
    resolved = resolve_threads(BASE_DIR / "data" / "emails.json")
    print(json.dumps(resolved, indent=2))