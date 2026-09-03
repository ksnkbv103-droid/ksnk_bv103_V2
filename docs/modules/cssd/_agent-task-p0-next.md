# Task cho Cursor Agent IDE (local only) — CSSD P0 tiếp theo

> Dán task này vào Cursor Agent trong IDE. Chỉ sửa local. Không commit/push/PR. Không supabase migrate / demo:reset / restore-to-prod.

## Ngữ cảnh đã có
- SSOT: docs/modules/cssd/domain-overview.md (2026-08-22 PCI)
- SSOT ngắn: docs/core/domain-specification.md §2.2
- Đã làm (đừng làm lại): HOLD_QC labels, CHO_BI từ tk_qc_json, dual-code notice, station Kiểm bộ

## Chọn 1 lát

### Lát A — Pack Plasma cấm cellulose (ưu tiên)
- File: src/lib/domain/cssd-packaging-rules.ts (+ spec)
- Rule: PP=PLASMA + pack cellulose → chặn theo domain-overview
- Không đổi schema DB

### Lát B — Stamp quarantine khi implant
- Persist tk_qc_json quarantine/CHO_BI khi implant chờ BI
- Không migration enum; không auto-hold máy prod nếu chưa an toàn

## Done khi
- test:cssd (hoặc vitest file đụng) pass
- Diff đúng scope
- Grok Bot git diff review sau

## Cấm
- Cloud Agent / PR GitHub; đụng .env; HLD nội soi
