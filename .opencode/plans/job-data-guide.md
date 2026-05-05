# Database Guide — Aurat.AI Jobs

## Connection

This app uses **Neon PostgreSQL** via Drizzle ORM. Set the `DATABASE_URL` env var:

```
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

You can use this same connection string with any Postgres client (psql, pg, Prisma, etc.).

---

## Schema: `jobs`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `url` | `text` | **PK** | Original ATS job posting URL (unique identifier) |
| `title` | `text` | No | Job title |
| `company` | `text` | No | Company name |
| `location` | `text` | Yes | Job location (e.g. "Remote", "San Francisco, CA") |
| `ats_id` | `text` | Yes | Internal ATS job ID |
| `ats_type` | `text` | Yes | ATS platform name (e.g. "greenhouse", "lever", "workday", "icims") |
| `salary_currency` | `text` | Yes | Currency code (e.g. "USD") |
| `salary_period` | `text` | Yes | Salary period (e.g. "year", "hour") |
| `salary_summary` | `text` | Yes | Human-readable salary string (e.g. "$120k - $180k") |
| `experience` | `text` | Yes | Experience level (e.g. "Senior", "3-5 years") |
| `lat` | `double precision` | Yes | Latitude geocoding |
| `lon` | `double precision` | Yes | Longitude geocoding |
| `posted_at` | `timestamptz` | Yes | When the job was originally posted |
| `date` | `timestamptz` | Yes | Date field from ATS (may differ from posted_at) |
| `description` | `text` | Yes | Full HTML job description (lazy-fetched on demand) |
| `description_fetched_at` | `timestamptz` | Yes | When the description was last scraped |
| `created_at` | `timestamptz` | No | Row creation timestamp (auto) |
| `updated_at` | `timestamptz` | No | Row update timestamp (auto) |

### Indexes

| Index | Columns | Type |
|---|---|---|
| `idx_jobs_company` | `company` | B-tree |
| `idx_jobs_location` | `location` | B-tree |
| `idx_jobs_title_trgm` | `title` | GIN trigram |
| `idx_jobs_company_trgm` | `company` | GIN trigram |
| `idx_jobs_location_trgm` | `location` | GIN trigram |
| `idx_jobs_posted_at` | `posted_at` | B-tree |
| `idx_jobs_ats_type` | `ats_type` | B-tree |

> Trigram indexes require the `pg_trgm` extension. If unavailable, queries fall back to `ILIKE` + full-text search.

---

## Using the DB Directly

### With psql

```bash
psql "$DATABASE_URL"

# Count total jobs
SELECT count(*) FROM jobs;

# Recent jobs
SELECT title, company, location, salary_summary, posted_at
FROM jobs
ORDER BY posted_at DESC NULLS LAST
LIMIT 20;

# Jobs by company
SELECT company, count(*) AS cnt
FROM jobs
GROUP BY company
ORDER BY cnt DESC
LIMIT 20;

# Jobs by ATS type
SELECT ats_type, count(*) AS cnt
FROM jobs
WHERE ats_type IS NOT NULL
GROUP BY ats_type
ORDER BY cnt DESC;

# Jobs by location
SELECT location, count(*) AS cnt
FROM jobs
WHERE location IS NOT NULL
GROUP BY location
ORDER BY cnt DESC
LIMIT 20;

# Fuzzy search (requires pg_trgm)
SELECT title, company, location
FROM jobs
WHERE title % 'engineer'
ORDER BY similarity(title, 'engineer') DESC
LIMIT 20;

# Full-text search
SELECT title, company, location
FROM jobs
WHERE to_tsvector('english', title) @@ plainto_tsquery('english', 'remote developer')
LIMIT 20;

# Jobs posted in last 7 days
SELECT title, company, location, posted_at
FROM jobs
WHERE posted_at >= now() - interval '7 days'
ORDER BY posted_at DESC;

# Jobs with salary info
SELECT title, company, salary_summary, salary_currency, salary_period
FROM jobs
WHERE salary_summary IS NOT NULL
ORDER BY posted_at DESC
LIMIT 20;
```

### With any Postgres client (Node.js example)

```js
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query(
  "SELECT title, company, location, posted_at FROM jobs ORDER BY posted_at DESC NULLS LAST LIMIT 50"
);
```

### With Drizzle ORM

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { jobs } from "./schema";
import { desc, sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Query recent jobs
const recentJobs = await db
  .select({
    title: jobs.title,
    company: jobs.company,
    location: jobs.location,
    postedAt: jobs.postedAt,
  })
  .from(jobs)
  .orderBy(sql`posted_at DESC NULLS LAST, created_at DESC`)
  .limit(50);
```

---

## API Endpoints

These are also available as REST APIs if you prefer HTTP access.

### `GET /api/jobs`

Paginated job listings with filters.

| Param | Type | Example | Description |
|---|---|---|---|
| `search` | string | `engineer` | Fuzzy search across title, company, location |
| `page` | number | `1` | Page number (default: 1) |
| `pageSize` | number | `50` | Results per page (1-100, default: 50) |
| `company` | string (repeatable) | `Google` | Filter by company |
| `atsType` | string (repeatable) | `greenhouse` | Filter by ATS type |
| `location` | string (repeatable) | `Remote` | Filter by location |
| `postedWithin` | string | `24h`, `7d`, `30d` | Filter by recency |
| `sortBy` | string | `postedAt`, `title`, `company`, `location`, `salarySummary` | Sort field |
| `sortDir` | string | `asc`, `desc` | Sort direction |

Response:
```json
{
  "jobs": [...],
  "total": 12345,
  "page": 1,
  "pageSize": 50,
  "totalPages": 247
}
```

### `GET /api/jobs/:id`

Get a single job by URL-encoded `url` (primary key). Returns full job including `description` (fetched on demand if missing).

### `GET /api/jobs/filters`

Get available filter options (unique companies, ATS types, locations).

Response:
```json
{
  "companies": ["Google", "Meta", ...],
  "atsTypes": ["greenhouse", "lever", ...],
  "locations": ["Remote", "San Francisco, CA", ...]
}
```

### `GET /data.json`

Public, rate-limited (30 req/min per IP) endpoint. Returns up to 50 recent jobs. Supports same filter params as `/api/jobs` except pagination/sort.

Response:
```json
[
  { "url": "...", "company": "...", "location": "...", "postedAt": "..." }
]
```

---

## Important Notes

- **Primary key**: `url` column (the original ATS posting URL)
- **Description fetching**: Descriptions are lazy-loaded — they're scraped on demand when a user clicks a job, then cached in `description` + `description_fetched_at`
- **Trigram search**: The `pg_trgm` extension provides fuzzy matching via `%` operator. If unavailable, the app falls back to `ILIKE` + full-text search
- **Geocoding**: `lat`/`lon` columns exist for location geocoding but may not be populated for all rows
- **ATS types**: Common values include `greenhouse`, `lever`, `workday`, `icims`, `jobvite`, `successfactors`