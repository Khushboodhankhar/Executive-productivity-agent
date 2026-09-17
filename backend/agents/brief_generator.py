import json
from datetime import date, datetime
from pathlib import Path

# Simulated "today" for this assignment's scenario week
TODAY = date(2026, 9, 25)  # Friday


def parse_deadline(deadline_str: str | None) -> date | None:
    if not deadline_str:
        return None
    try:
        # handles both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM"
        return datetime.fromisoformat(deadline_str).date()
    except ValueError:
        return None


def build_brief(commitments: list[dict]) -> dict:
    my_actions = []
    waiting_on = []
    unclear_ownership = []
    overdue = []
    completed = []

    for c in commitments:
        deadline = parse_deadline(c.get("deadline"))
        is_overdue = (
            deadline is not None
            and deadline < TODAY
            and c.get("status") != "done"
        )

        if c.get("status") == "done":
            completed.append(c)
            continue

        if is_overdue:
            overdue.append(c)

        if c.get("ownership_unclear"):
            unclear_ownership.append(c)
        elif c.get("classification") == "MY_ACTION":
            my_actions.append(c)
        elif c.get("classification") == "WAITING_ON_OTHER":
            waiting_on.append(c)

    return {
        "as_of": TODAY.isoformat(),
        "my_actions": my_actions,
        "waiting_on_others": waiting_on,
        "unclear_ownership": unclear_ownership,
        "overdue": overdue,
        "completed": completed,
    }


def print_brief(brief: dict) -> None:
    print(f"\n=== Daily Brief — as of {brief['as_of']} ===\n")

    def section(title: str, items: list[dict]):
        print(f"--- {title} ({len(items)}) ---")
        if not items:
            print("  (none)")
        for c in items:
            deadline = c.get("deadline") or "no deadline"
            precision = c.get("deadline_precision")
            deadline_str = f"{deadline} ({precision})" if precision else deadline
            print(f"  [{c['task_id']}] {c['title']}")
            print(f"      counterparty: {c.get('counterparty')} | deadline: {deadline_str}")
        print()

    section("OVERDUE", brief["overdue"])
    section("MY ACTIONS", brief["my_actions"])
    section("WAITING ON OTHERS", brief["waiting_on_others"])
    section("UNCLEAR OWNERSHIP", brief["unclear_ownership"])
    section("COMPLETED", brief["completed"])


if __name__ == "__main__":
    from extraction_agent import extract_commitments, DATA_DIR
    from thread_resolver import resolve_threads, apply_resolution

    commitments = extract_commitments()
    resolved = resolve_threads(DATA_DIR / "emails.json")
    commitments = apply_resolution(commitments, resolved)

    brief = build_brief(commitments)
    print_brief(brief)

    # also save as JSON for the API layer to reuse later
    out_path = DATA_DIR / "latest_brief.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(brief, f, indent=2)
    print(f"Saved brief to {out_path}")