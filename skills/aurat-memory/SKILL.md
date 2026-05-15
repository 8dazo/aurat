---
name: aurat-memory
description: >
  Save and retrieve memory for Aurat job applications using the QMD-style
  hybrid search engine (BM25 + vector + LLM reranking). Use when:
  - Answering custom job application questions (check memory first)
  - Saving a user's answer for future reuse
  - Building or enriching the user profile from past interactions
  - Finding profile gaps to ask the user about
allowed-tools: Bash(curl:*)
---

# Aurat Memory Skill

## Status

!`curl -s http://localhost:8000/memory/status 2>/dev/null || echo "Engine not running"`

## When to Use This Skill

### Before answering a custom question
Always check memory before asking the user:
```bash
curl -s "http://localhost:8000/memory/search?q=<QUESTION>&collection=qna_memory&top_k=3"
```
If a result with `score >= 0.4` is returned, use that `metadata.answer` directly.

### After the user answers a custom question
Save it for future jobs (the engine does this automatically — but you can also trigger manually):
```bash
curl -s -X POST http://localhost:8000/db/qna \
  -H "Content-Type: application/json" \
  -d '{"questionHash": "<hash>", "question": "<Q>", "answer": "<A>", "appId": 0}'
```

### To check extracted profile facts
```bash
curl -s "http://localhost:8000/memory/facts?min_confidence=70"
```

### To find profile gaps (missing info that would help applications)
```bash
curl -s "http://localhost:8000/memory/gaps?job_context=<COMPANY+ROLE>"
```

### To manually trigger profile enrichment
```bash
curl -s -X POST http://localhost:8000/memory/enrich
```

## Memory Collections

| Collection | What it stores | Min score for match |
|---|---|---|
| `qna_memory` | Custom Q&A pairs from past applications | 0.4 |
| `profile_facts` | Extracted skills, experience, preferences | 0.5 |
| `job_interactions` | Jobs applied, companies, outcomes | 0.3 |

## Hybrid Search Pipeline (QMD Pattern)

The memory engine uses:
1. **BM25** — fast keyword matching (exact terms, names, codes)
2. **Vector** — semantic similarity via `all-MiniLM-L6-v2` embeddings
3. **RRF Fusion** — Reciprocal Rank Fusion (k=60, original query ×2 weight)
4. **LLM Reranking** — Ollama cross-encoder (position-aware blend)

This means "Do you have remote work experience?" will match past answers about
"working from home", "distributed teams", "async collaboration", etc.

## Score Interpretation

| Score | Meaning |
|---|---|
| ≥ 0.6 | High confidence — use answer directly |
| 0.4–0.6 | Moderate — use but mention it's from memory |
| < 0.4 | Low — ask the user |
