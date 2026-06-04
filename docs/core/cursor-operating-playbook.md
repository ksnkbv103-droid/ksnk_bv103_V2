# Cursor Operating Playbook (General Software)

This playbook is a practical operating system for using Cursor with high accuracy, low rework, and controlled token/quota usage.

## 1) One-task protocol

Use one chat per task.

- New feature -> new chat
- New bug root cause -> new chat
- New refactor scope -> new chat

Do not mix unrelated tasks in one conversation.

## 2) Intake before implementation

Start every non-trivial task with:

- Goal
- In scope
- Out of scope
- Acceptance criteria
- Verify plan
- Risk

Only proceed to code after this intake is approved.

## 3) Spec freeze

Freeze these items after approval:

- KPI definitions
- Formula logic
- Permission model
- API contract assumptions

If any frozen item changes, issue a short "spec change" note and re-plan.

## 4) Minimal context strategy

- Prefer specific files and symbols over broad folder-level context.
- Keep open context focused on active files.
- Avoid broad "scan everything" requests for narrow tasks.

## 5) Execution loop

Use this loop for reliable delivery:

1. Plan 3-5 steps
2. Implement small diff
3. Verify immediately
4. Review risk
5. Continue next small diff

## 6) Verification policy (BV103)

| Change type | Command |
|-------------|---------|
| Default / PR | `npm run verify` |
| UI-only, no Server Action | `npm run verify:quick` |
| Server Action / `fact_*` | `npm run verify:engineering` |
| CSSD module | + `npm run verify:cssd` |
| Migration | `npm run mdm:migrate:local` then `npm run verify:mdm` + engineering |
| Ship pilot DB | `npm run pilot:ship` |

Manual checks: ≥1 luồng UI chính cho slice vừa sửa (Pilot DoD).

## 6b) Cursor modes

- **Plan / Ask**: requirement unclear, architecture, compare options — no code yet.
- **Agent**: intake approved — implement in small diffs.
- **New chat** when switching task or after ~15–20 turns (context hygiene).

## 7) Destructive change policy

For drop/delete/removal tasks, always require:

- Impact map
- Data loss statement
- Rollback plan
- Explicit confirmation

Never execute destructive work implicitly.

## 8) Token and quota hygiene

- Use short, constrained prompts.
- Ask for delta-only responses when iterating.
- Request code-only output when explanations are not needed.
- Reset conversation when context starts drifting.

## 9) Suggested KPI tracking (weekly)

- Tokens per task
- Average turns per task
- First-pass verify rate
- Regression count after merge

If KPI worsens for two weeks, simplify rules and tighten intake.

## 10) Slash commands (preferred)

In Cursor chat, type:

- `/intake` — lock scope before coding
- `/implement` — after approved intake
- `/review` — before commit/merge

Source: `.cursor/commands/*.md`. Copy-paste templates (if needed): `docs/reference/guides/cursor-command-*.md`.

