# Governance pipeline — schema & ship

> Tóm tắt vận hành; chi tiết: [`operations-sop.md`](operations-sop.md).

## Migration mới

1. Tên file: `YYYYMMDD_<mo_ta_ngan>.sql` (không rename file đã apply).
2. FK mới → index (`82-architecture-quality.mdc`).
3. Local: `npm run mdm:migrate:local` → `npm run verify:mdm:local`.
4. Remote pilot: theo SOP — không SQL nóng tùy tiện.
5. Cập nhật [`implementation-mapping.md`](implementation-mapping.md) changelog nếu đổi SSOT bảng/cột.

## App ↔ Database sync

| Bước | Lệnh / việc |
|------|-------------|
| Push schema | `npm run mdm:migrate` |
| Gate MDM | `npm run verify:mdm` |
| Gate app contract | `npm run verify:engineering` |
| Ship pilot | `npm run pilot:ship` |

## PR / CI

- CI hard (`verify`): `lint` + `lint:cssd-architecture` + `test:coverage` (report-only, **không** gate % toàn repo) + `verify:engineering` + `build`
- CI soft (không chặn merge): `npm-audit-advisory` (Step Summary ghi ADVISORY khi còn CVE), `dead-code:scan` warn-only, E2E SKIP nếu thiếu secrets
- Local khuyến nghị: `npm run verify` (= `verify:full`)
- Honesty: không đặt tên bước CI kiểu «Coverage ≥80%» khi `vitest` không có `thresholds` (ENG-CI-01)

## Doc governance

- `npm run docs:links:check` — link trong rules + `docs/`
- SSOT narrative: [`docs/README.md`](../README.md)
