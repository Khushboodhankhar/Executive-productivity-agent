import json
from pathlib import Path
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

SYSTEM_PROMPT = """
You are an assistant answering questions about Arjun Malhotra's commitments.

You will be given a JSON list of commitments (tasks) and a question.
Answer ONLY using the information in the provided tasks. Do not invent
facts. If the tasks don't contain enough information to answer, say so
clearly.

Keep answers short (1-3 sentences) and reference the relevant task_id
when useful.
"""


def load_commitments(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def ask(question: str, commitments: list[dict]) -> str:
    user_prompt = f"""
Tasks:
{json.dumps(commitments, indent=2)}

Question: {question}
"""

    response = client.chat.completions.create(
        model="qwen2.5:3b",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    return response.choices[0].message.content.strip()


if __name__ == "__main__":
    BASE_DIR = Path(__file__).resolve().parents[2]
    brief_path = BASE_DIR / "data" / "latest_brief.json"

    with open(brief_path, "r", encoding="utf-8") as f:
        brief = json.load(f)

    # flatten all sections back into one list of tasks to search over
    all_tasks = (
        brief["my_actions"]
        + brief["waiting_on_others"]
        + brief["unclear_ownership"]
        + brief["completed"]
    )

    print("Query agent ready. Type a question (or 'exit' to quit).\n")
    while True:
        q = input("> ")
        if q.strip().lower() in ("exit", "quit"):
            break
        answer = ask(q, all_tasks)
        print(f"\n{answer}\n")