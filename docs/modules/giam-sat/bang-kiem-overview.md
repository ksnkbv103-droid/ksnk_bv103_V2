# Bảng kiểm GSC/VST — tóm tắt

> Chi tiết đầy đủ (machine source): [`../../data/bang-kiem/canonical-36.md`](../../data/bang-kiem/canonical-36.md)

## Canonical 36 mẫu

- Cutover 2026-05-29: 51 → **36** mẫu `gstt_dm_bang_kiem` seed từ `canonical-36.md`
- Generator: `scripts/generate-canonical-36-cutover.mjs`
- Mã ACT tiêu chí: enrich qua `scripts/enrich-bang-kiem-act-codes.mjs`

## Cách tính điểm (`cach_tinh_diem`)

| Giá trị | Ý nghĩa | Engine |
|---------|---------|--------|
| `TY_LE` | % đạt trên tổng có trọng số | `giam-sat-scoring.ts` |
| `TRON_GOI` | Care bundle — all-or-none tiêu chí then chốt | `giam-sat-scoring.ts` |
| `DAT_KHONG_DAT` | Pass/fail theo ngưỡng critical | `giam-sat-scoring.ts` |
| `NHAT_KY` | Nhật ký / Hawthorne — không % tuân thủ | `giam-sat-scoring.ts` |
| *(NULL)* | Bảng cũ chưa backfill | `calculateGscComplianceScore` (legacy) |

SSOT audit 36 mẫu (code): `src/lib/domain/gsc-canonical-36-scoring.ts` · CLI: `node scripts/audit-gsc-canonical-36-scoring.mjs`

Lộ trình gỡ legacy: [`../../wiki/concepts.md`](../../wiki/concepts.md#gsc-scoring).

## Data files (không mở tay)

| File | Vai trò |
|------|---------|
| `data/bang-kiem/canonical-36.md` | SSOT 36 mẫu 4 phần |
| `data/bang-kiem/raw-forms-full.md` | Nguồn trích xuất gốc |
| `data/bang-kiem/master-bangkiem.md` | Master template list |
| `data/bang-kiem/master-tieuchi.md` | Master tiêu chí |

## Quy tắc phiên

- VST: tối đa **3 đối tượng** quan sát / phiên (trừ yêu cầu mới)
- GSC: kết quả inline `results_jsonb` — không EAV kết quả
