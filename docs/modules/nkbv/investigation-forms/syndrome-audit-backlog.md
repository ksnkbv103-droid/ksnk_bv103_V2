# Khung audit hội chứng tiếp

> **2026-08-10** · Mở chat implement chỉ sau khi PO ký quyết định trên audit tương ứng  
> (PNEU §6 · UTI §6).

## Trạng thái

| Hội chứng | Audit | Trạng thái |
|-----------|-------|------------|
| PNEU / VAP / Non-VAP | [`pneu-standard-vs-runtime-audit-20260810.md`](pneu-standard-vs-runtime-audit-20260810.md) | **Done** — PO chọn A; A1–A5 ship 2026-08-18 |
| UTI / CAUTI / SUTI / ABUTI | [`uti-standard-vs-runtime-audit-20260810.md`](uti-standard-vs-runtime-audit-20260810.md) | **Done** — chờ PO xác nhận lệch + thứ tự A1→… |
| BSI / CLABSI / LCBI / MBI | `bsi-standard-vs-runtime-audit-YYYYMMDD.md` | Chưa mở |
| SSI | `ssi-standard-vs-runtime-audit-YYYYMMDD.md` | Chưa mở |
| SBSI (shared) | Mục trong từng audit + spine | Chưa mở riêng |
| LOA / Transfer Rule | Mục Shared + gap ALL-P1-1 | Chưa mở riêng (UTI/PNEU B3) |

## Mẫu mục bắt buộc (copy khi mở audit mới)

1. Luồng phân tích chuẩn (mermaid + bước nghiệp vụ)
2. Điều kiện chẩn đoán / loại trừ / bổ sung XN·LS
3. Runtime map (file/hàm)
4. Bảng lệch ID (`{SYNDROME}-AUDIT-A*` / `B*`)
5. Checklist case thật cho PO
6. Quyết định A (sửa thuật toán) / B (khung nhập tay) — không tự tick

## Trọng tâm gợi ý

| Hội chứng | Domain neo | Runtime neo (điểm vào) |
|-----------|------------|------------------------|
| BSI | SSOT LCBI/CLABSI/MBI · CVC Day3 · Secondary-before-CLABSI | `nkbv-bsi-timeline-verdict` · `evaluateBsiClabsi` · `nkbv-secondary-bsi-gate` |
| UTI | CFU ≥10⁵ · ≤2 · nấm cấm · Foley · voiding | `nkbv-uti-timeline-verdict` · `evaluateUtiCauti` |
| SSI | SP 30/90 · depth · PATOS · SBAP 17d | `NkbvSyndromeSsiPanel` · SSI verdict |
| SBSI | Scenario 1/2 · ban Candida/CoNS/Enterococcus theo site | `nkbv-secondary-bsi-gate` · `nkbv-shared-secondary-bsi` |
| LOA | Transfer Rule · CDC Location | `nkbv-timeline-math` `calculateCdcMetrics` · cột Khoa BA |

## Quy tắc mở chat

1. Một chat = một hội chứng (hoặc một quyết định A/B PNEU).
2. Không sửa engine trước khi PO ký § quyết định của audit đó.
3. Cập nhật [`gap-lean-vs-runtime.md`](gap-lean-vs-runtime.md) khi phát hiện P0 mới.
