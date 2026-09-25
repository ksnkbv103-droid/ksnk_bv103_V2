# BV103 UX principles — medical professional minimalism

SSOT for **interaction & IA** rules. Visual tokens / type / chrome classes stay in
[`docs/reference/guides/bv103-visual-language.md`](../reference/guides/bv103-visual-language.md)
and `src/lib/bv103-*-chrome.ts`.

Audit that produced this list: [`_audit-ia-ux-2026-09-25.md`](./_audit-ia-ux-2026-09-25.md).

Locks that override local taste: GSC H2 (Báo cáo chính thức one door; no Việc hôm nay;
Công việc separate) · CSSD 6 stations + scan gates + packaging scan-only + separate
Sự cố/kho doors · QLCV Domain file 19 (4 tabs; person/work/progress/responsibility).

---

## Principles

1. **One door, one job**  
   Each sidebar leaf has one primary intent. Do not add a second entry for the same write path.

2. **Name the page once**  
   App Header (`getKsnkAppHeaderBreadcrumb`) is SSOT for the visible page name. In-page chrome adds tabs, actions, and filters — not a second H1 for the same label. If Header is coarse, fix Header; don’t also hide the in-page title (`showTitle` must be intentional).

3. **Primary action ≤ 2 clicks**  
   From module entry to scan / tạo việc / nhập giám sát / mở mẻ: at most two intentional clicks (hub choose → form counts as one hop).

4. **Status is ambient**  
   Counts and status chips refresh on mutate. Prefer a one-row strip over poster KPI grids on ops screens.

5. **Person · work · progress · responsibility**  
   List/board rows answer who does what, how far, and who owns outcome — without opening detail. Standing QLCV rule; apply the spirit to CSSD station queues where possible.

6. **Scan over type where domain mandates**  
   CSSD station advances and packaging gates are scan-led. Never offer free-type shortcuts that bypass scan gates.

7. **Tabs ≤ 4 primary**  
   A fifth “equal” tab is a smell. Overflow goes to deep link, quiet link, or “Thêm”.

8. **One detail pattern per dialect**  
   Ops: prefer page or sheet for primary detail; stacked modals only for confirm/destroy. Analytics: frames + sections. Admin: hub + focused form route when forms are heavy.

9. **Empty = one sentence + one CTA**  
   Use `Bv103EmptyState`. No essay empty states on ops canvases.

10. **Calm clinical chrome**  
    No flashy shadows, no ALL-CAPS outside nav/touch choice labels, no destructive-colored CTA for routine actions.

11. **Same control height**  
    Prefer `bv103-control-h` / touch ≥ 2.75rem. No random poster buttons on list toolbars.

12. **Layer sync**  
    UX that changes doors, status meanings, or counts must plan FE + BE + domain + DB in one beat — or explicitly defer with an owner. This beat is IA/UX-first; implementers still respect layer sync.

---

## Tab dialect (until unified)

| Dialect | Use |
|---------|-----|
| `SupervisionModeNav` | VST / GSC (Nhập · Lịch sử · Thống kê) |
| Module tab list (`KsnkSupervisionTabList` / CSSD horiz) | CSSD / QLCV in-module modes |
| Analytics frame tabs | `/thong-ke/*`, BCTH section nav |

Do **not** invent a fourth tab primitive without a short ADR under `docs/ux/`.

---

## Non-goals (standing)

- Soft SXHD / “Việc hôm nay” return  
- Word / Văn bản lane redesign in UX program  
- Merging CSSD Sự cố into Quy trình or Dụng cụ  
- Merging Công việc into Giám sát or Báo cáo  
