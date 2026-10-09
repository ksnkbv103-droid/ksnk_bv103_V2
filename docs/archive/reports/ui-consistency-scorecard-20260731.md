# UI Consistency Scorecard — 2026-07-31 (A2) · B+3 + B+4 Done 2026-08-03

> Evidence-based. Global width SSOT: `KsnkPageShell` → `max-w-7xl` (`ClientLayoutWrapper`).  
> Tokens: `bv103-design-tokens` · chrome: `bv103-layout-chrome` · dialect: [`design-dialect-matrix-20260731.md`](../architecture/design-dialect-matrix-20260731.md).  
> **B+3:** [`../architecture/ui-consistency-program-20260802.md`](../architecture/ui-consistency-program-20260802.md).  
> **B+4:** [`../architecture/ui-consistency-program-20260803.md`](../architecture/ui-consistency-program-20260803.md).

## Scoreboard (1–5) — sau B+4 (2026-08-03)

| # | Dialect | Rhythm | Header | Panel | Tabs | Banners | Density | Avg | Mục tiêu |
|---|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Ops giám sát | 4 | **4*** | 4 | 5 | 4 | 4 | **~4.2** | ≥ 4.0 · *Header 08-05 essentials |
| 2 | Analytics / BCTH | 4 | 4 | 4 | **4*** | 4 | **4*** | **~4.0** | ≥ 4.0 · *Tabs/density 08-05 |
| 3 | Admin/MDM | 4 | 3 | 4 | 3 | 4 | 4 | **~3.8** | ≥ 3.8 (S2 Done) |
| 4 | CSSD shell+body | 4 | 4 | 4 | 4 | 4 | 4 | **~4.0** | giữ |
| 5 | CC card stacks | 4 | — | 4 | — | 4 | 4 | **~4.0** | giữ |
| 6 | DaoTaoChrome | 4 | 4 | 4 | 3 | — | 4 | **~4.0** | giữ (form max-w cố ý) |
| 7 | Context banners | — | — | — | — | 4 | 4 | **~4.0** | giữ |
| — | QLCV Ops | — | — | 4 | — | — | 4 | **~4.0** | giữ |
| — | Auth / tài khoản | — | — | 4 | — | — | 4 | **~4.0** | shell width Done |
| — | **NKBV Ops** | 4 | 3 | 4 | 3 | 4 | 4 | **~4.0** | ≥ 4.0 (S1 Done) |

## Chương trình B+4 (S0–S3) — Done

| Sóng | ID | Việc | Status |
|------|-----|------|--------|
| S0 | — | Khóa scorecard + backlog + program doc | **Done 2026-08-03** |
| S1 | `UI-NKBV-01` | NKBV thin Ops token | **Done 2026-08-03** |
| S2 | `UI-ADMIN-01` | Admin/MDM dialect | **Done 2026-08-03** |
| S3 | `UI-POLISH-01` | Gate + notice + sync doc | **Done 2026-08-03** |

## Case kiểm tay B+4

1. Mở dashboard / portal NKBV — không poster `rounded-[36px]` / bóng dày.
2. Mở 1 modal danh mục + BangKiem — bóng mềm, width ≤ shell.
3. Kho hóa chất sắp hết hạn + tab DM thiếu quyền — `KsnkContextBanner`.

## Residual ngoài UI (không nợ B+4)

- UAT khoa ký · OPS-DB-01 (Docker) · Wave 4 HIS / NKBV P1.
- Chip trạng thái bảng (uppercase nhỏ) — giữ.
- Touch Đạt/Không CSSD — giữ.

## Wave UX R4–R5 (2026-08-05)

| ID | Việc | Status |
|----|------|--------|
| UX-GS-HEADER-01 | Dải Khoa/Khu/Vị trí luôn hiện; «Chi tiết phiên» mở cách thức + NV/BN | **Done** |
| UX-ANALYTICS-01 | `ReportSectionNav` 7 mục chính + «Thêm»; `space-y-5` + title mỏng | **Done** |
