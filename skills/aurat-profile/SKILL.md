---
name: aurat-profile
description: >
  Build and enrich the Aurat user profile from job applications. Extract facts
  from Q&A answers, identify knowledge gaps, ask targeted clarifying questions,
  and merge enrichments back into the master profile. Use when: starting a new
  job application session, after answering custom questions, or when the user
  asks to improve their profile.
---

# Aurat Profile Builder Skill

## Purpose

Every job application teaches us more about the user. This skill:
1. Extracts atomic facts from Q&A answers
2. Saves them to memory with confidence scores
3. Identifies gaps in the profile
4. Generates natural questions to fill those gaps
5. Merges high-confidence facts back into the master profile

## Fact Categories

| Category | Examples |
|---|---|
| `skill` | "Proficient in Python", "Experience with Kubernetes", "Speaks Spanish" |
| `experience` | "5 years backend development", "Led team of 8", "Built payment systems" |
| `preference` | "Prefers remote work", "Open to relocation", "Wants equity compensation" |
| `personal` | "Based in San Francisco", "Available in 2 weeks", "Has work authorization" |
| `contact` | "GitHub: github.com/user", "LinkedIn: /in/user", "Portfolio: user.dev" |

## Confidence Scoring

| Score | Meaning | Action |
|---|---|---|
| 90-100 | Directly stated by user | Auto-merge into profile |
| 70-89 | Clearly implied | Merge with note |
| 50-69 | Inferred from context | Save to memory only |
| < 50 | Uncertain | Discard |

## Common Profile Gaps to Check

Before starting an application, check for these critical fields:
- `personal_info.phone` — required by most ATS
- `personal_info.location` / `personal_info.city` — for role filtering
- `work_experience` — recency and relevance
- `linkedin_url`, `github_url` — commonly asked
- `work_authorization` — yes/no for US jobs
- `salary_expectation` — increasingly common
- `start_date` / `availability` — many Lever/Ashby forms ask this
- `remote_preference` — very common post-2020

## API Endpoints

### Get current facts
```bash
curl -s "http://localhost:8000/memory/facts?min_confidence=60"
```

### Find gaps for a specific job
```bash
curl -s "http://localhost:8000/memory/gaps?job_context=Senior+Backend+Engineer+at+Stripe"
```

### Trigger enrichment after an apply session
```bash
curl -s -X POST http://localhost:8000/memory/enrich
```

### Check full profile
```bash
curl -s http://localhost:8000/db/profile
```

## Asking the User for Missing Information

When a gap is found, ask ONE question at a time in natural language:

**Good:**
> "Quick question — what's your current location (city/country)? This helps pre-fill location fields on applications."

**Bad:**
> "Please provide: location, phone, start_date, salary_expectation, work_authorization, linkedin_url"

Save the user's answer via the Q&A memory endpoint immediately:
```bash
curl -s -X POST http://localhost:8000/db/qna \
  -H "Content-Type: application/json" \
  -d '{"questionHash": "<hash>", "question": "What is your current location?", "answer": "San Francisco, CA"}'
```

## Memory-First Rule

Before asking the user ANY question, ALWAYS check memory first:
```bash
curl -s "http://localhost:8000/memory/search?q=<question>&collection=qna_memory"
```

Only ask if no result has `score >= 0.4`.
