import aiosqlite
import json
import os

DB_PATH = os.environ.get(
    "AURAT_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "aurat.db")
)


async def _get_db():
    return await aiosqlite.connect(DB_PATH)


async def init_db():
    db = await _get_db()
    schema_path = os.path.join(os.path.dirname(__file__), "sqlite_schema.sql")
    with open(schema_path, "r") as f:
        await db.executescript(f.read())
    await db.commit()
    await db.close()


async def get_profile():
    db = await _get_db()
    try:
        async with db.execute("SELECT data FROM master_profile WHERE id = 1") as cursor:
            row = await cursor.fetchone()
            if row:
                return json.loads(row[0])
            return None
    finally:
        await db.close()


async def save_profile(data: dict):
    db = await _get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO master_profile (id, data) VALUES (1, ?)",
            [json.dumps(data)],
        )
        await db.commit()
        return data
    finally:
        await db.close()


async def get_history(filters: dict | None = None):
    db = await _get_db()
    try:
        query = "SELECT * FROM application_history ORDER BY created_at DESC"
        async with db.execute(query) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    finally:
        await db.close()


async def save_history(entry: dict):
    db = await _get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO application_history
            (job_url, snapshot_url, ats_platform, job_title, company, match_score, status, steps_log, custom_questions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                entry.get("job_url", ""),
                entry.get("snapshot_url", entry.get("job_url", "")),
                entry.get("ats_platform", ""),
                entry.get("job_title", ""),
                entry.get("company", ""),
                entry.get("match_score"),
                entry.get("status", "pending"),
                json.dumps(entry.get("steps_log", [])),
                json.dumps(entry.get("custom_questions", [])),
            ],
        )
        await db.commit()
        row_id = cursor.lastrowid
        return {**entry, "id": row_id}
    finally:
        await db.close()


async def get_qna_memory(question_hash: str):
    db = await _get_db()
    try:
        async with db.execute(
            "SELECT question, answer FROM custom_qna_memory WHERE question_hash = ?",
            [question_hash],
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return {"question": row[0], "answer": row[1]}
            return None
    finally:
        await db.close()


async def save_qna_memory(
    question_hash: str, question: str, answer: str, app_id: int = 0
):
    db = await _get_db()
    try:
        await db.execute(
            """INSERT OR REPLACE INTO custom_qna_memory
            (question_hash, question, answer, application_id) VALUES (?, ?, ?, ?)""",
            [question_hash, question, answer, app_id],
        )
        await db.commit()
        return {"question_hash": question_hash, "question": question, "answer": answer}
    finally:
        await db.close()


async def get_history_by_id(entry_id: int):
    db = await _get_db()
    try:
        async with db.execute(
            "SELECT * FROM application_history WHERE id = ?", [entry_id]
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return None
    finally:
        await db.close()


async def update_history_status(entry_id: int, status: str, steps_log: list | None = None):
    db = await _get_db()
    try:
        if steps_log is not None:
            await db.execute(
                "UPDATE application_history SET status = ?, steps_log = ?, "
                "updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [status, json.dumps(steps_log), entry_id],
            )
        else:
            await db.execute(
                "UPDATE application_history SET status = ?, updated_at = CURRENT_TIMESTAMP "
                "WHERE id = ?",
                [status, entry_id],
            )
        await db.commit()
    finally:
        await db.close()


async def save_resume_path(path: str):
    """Persist resume file path inside the master_profile JSON blob."""
    db = await _get_db()
    try:
        async with db.execute("SELECT data FROM master_profile WHERE id = 1") as cursor:
            row = await cursor.fetchone()
            data = json.loads(row[0]) if row else {}
        data["resume_path"] = path
        await db.execute(
            "INSERT OR REPLACE INTO master_profile (id, data) VALUES (1, ?)",
            [json.dumps(data)],
        )
        await db.commit()
        return data
    finally:
        await db.close()
