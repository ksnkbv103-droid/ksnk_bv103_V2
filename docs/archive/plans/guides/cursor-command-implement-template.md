# Cursor Command Template: Implement

**Preferred:** type `/implement` in Cursor (see `.cursor/commands/implement.md`).

Use this prompt after the intake is approved.

```text
[IMPLEMENT]
Implement the approved plan.
Rules:
- Minimal diff only
- No refactor outside scope
- No API contract changes unless explicitly requested

Output format:
1) Files changed
2) Why each change was made
3) Verify commands to run
4) Residual risks
```

