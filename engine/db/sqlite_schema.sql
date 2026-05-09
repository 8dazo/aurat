CREATE TABLE IF NOT EXISTS master_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_url TEXT NOT NULL,
    snapshot_url TEXT NOT NULL DEFAULT '',
    ats_platform TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    match_score REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    steps_log TEXT NOT NULL DEFAULT '[]',
    custom_questions TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_qna_memory (
    question_hash TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    application_id INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QMD-style hybrid memory: BM25 + vector embeddings stored in SQLite
CREATE TABLE IF NOT EXISTS memory_documents (
    id TEXT PRIMARY KEY,
    collection TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    embedding BLOB,  -- serialized numpy float32 array (struct-packed)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_memory_collection
    ON memory_documents(collection);

-- Extracted profile facts with LLM-assigned confidence scores
CREATE TABLE IF NOT EXISTS profile_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT NOT NULL,
    category TEXT NOT NULL,  -- skill|experience|preference|personal|contact
    confidence INTEGER NOT NULL DEFAULT 0,
    source_job_url TEXT DEFAULT '',
    source_question TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);