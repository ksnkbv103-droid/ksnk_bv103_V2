# Cursor Command Template: Review

**Preferred:** type `/review` in Cursor (see `.cursor/commands/review.md`).

Use this prompt for final review before commit/merge.

```text
[REVIEW]
Review this diff in order:
1) correctness bugs
2) security/permission risks
3) performance regressions
4) maintainability concerns

Return findings first, sorted by severity.
If uncertain, state uncertainty explicitly and provide a validation step.
Then provide:
- suggested tests
- go/no-go recommendation
```

