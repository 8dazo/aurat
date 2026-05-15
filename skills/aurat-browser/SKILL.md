---
name: aurat-browser
description: >
  Interact with job application pages using agent-browser CLI (agent-browser.dev)
  as an accessibility-tree fallback when Playwright CSS selectors find 0 fields.
  Use when: page detection returns 0 fields, page is heavily JS-rendered, or
  Playwright cannot locate form inputs.
allowed-tools: Bash(agent-browser:*)
---

# Aurat Browser Skill (agent-browser Fallback)

## When to Use

Use this skill when `/apply/detect` returns `visible_field_count: 0` AND the page
clearly has a form (you can see it visually). This happens on:
- React/Vue SPAs that render forms asynchronously
- Shadow DOM components
- iFrame-embedded forms
- Pages that block Playwright's CSS queries

## Workflow

### Step 1 — Get CDP port
```bash
curl -s http://localhost:18733/cdp-info
# Returns: {"cdp_port": 9222}
```

### Step 2 — Snapshot the page
```bash
agent-browser --cdp <CDP_PORT> snapshot -i
# Output:
#   @e1 [heading] "Software Engineer Application"
#   @e3 [textbox] "First Name" (required)
#   @e4 [textbox] "Last Name" (required)
#   @e5 [textbox] "Email" (required)
#   @e12 [button] "Submit Application"
```

### Step 3 — Fill fields using refs
```bash
agent-browser --cdp <CDP_PORT> fill @e3 "John"
agent-browser --cdp <CDP_PORT> fill @e4 "Smith"
agent-browser --cdp <CDP_PORT> fill @e5 "john@example.com"
```

### Step 4 — Wait then re-snapshot
```bash
agent-browser --cdp <CDP_PORT> wait --load networkidle
agent-browser --cdp <CDP_PORT> snapshot -i
```

### Step 5 — Submit
```bash
agent-browser --cdp <CDP_PORT> click @e12
```

## Field Type Mapping

| Accessibility Role | Form Type | Fill Strategy |
|---|---|---|
| `textbox`, `searchbox` | Text input | `fill @ref "value"` |
| `combobox` | Select/dropdown | `click @ref` then `click @option-ref` |
| `checkbox` | Checkbox | `click @ref` to toggle |
| `radio` | Radio button | `click @ref` for the desired option |
| `button` with "Apply" in name | Submit | `click @ref` |

## Rules

- **Always prefer Playwright** for file uploads (`set_files` has no agent-browser equivalent)
- Use agent-browser **only** as a detection fallback, not as the primary driver
- Re-snapshot after every interaction that might change the DOM
- If a field has no ref, fall back to Playwright CSS selector
