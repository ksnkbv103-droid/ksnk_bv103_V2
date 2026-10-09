---
paths:
  - "src/modules/giam-sat-vst/**"
  - "src/modules/giam-sat-chung/**"
  - "src/app/giam-sat/**"
  - "src/app/giam-sat-vst/**"
  - "src/app/giam-sat-chung/**"
  - "src/modules/quan-tri-he-thong/bang-kiem/**"
---

# Giám sát — ngữ cảnh spec

> **Khóa PO 2026-10-09** (`CLAUDE.md` §Khóa PO, `/domain-slice` «Đã chốt») thắng mọi dòng dưới đây — đặc biệt VST ≤2 thời điểm WHO phân biệt, không bắt đủ 5 mốc.

Trước khi sửa form, phiên quan sát, điểm số, import/export:

1. [`domain-specification.md`](../../docs/core/domain-specification.md)
2. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md)
3. [`read-minimum.md`](../../docs/core/read-minimum.md)
4. [`engineering-guidelines.md`](../../docs/core/engineering-guidelines.md) § UI mobile khi đụng form hiện trường

**Nhắc domain:** VST tối đa **3 đối tượng** một phiên (trừ khi có yêu cầu mới). Fact: ưu tiên đính chính + soft-delete khi phù hợp.

## Giám sát pilot (VST + GSC)

## Invariant nghiệp vụ

- **VST:** WHO 5 moments; tối đa **3 đối tượng** một phiên (trừ spec mới).
- **GSC:** Kết quả inline `results_jsonb` — **không** EAV `fact_giam_sat_chung_results`.
- **Scoring:** Khớp `cach_tinh_diem` trên template `gstt_dm_bang_kiem`; không đoán công thức.
- **Fact:** Ưu tiên đính chính + soft-delete khi phù hợp; không import VST legacy đã gỡ.
- **RLS/khoa:** Header khoa/khu vực từ MDM; scope đọc theo quyền.

## Đọc bắt buộc

1. [`read-minimum.md`](../../docs/core/read-minimum.md) — dòng Giám sát VST/GSC
2. [`domain-specification.md`](../../docs/core/domain-specification.md) — § VST, § GSC

## Rule & verify

- `npm run verify:engineering` sau action/`gstt_*`
- Checklist tay: ≥3 kịch bản qua `/uat-cases`

## Bảng kiểm — ngữ cảnh spec

- [`docs/core/implementation-mapping.md`](../../docs/core/implementation-mapping.md)
- [`read-minimum.md`](../../docs/core/read-minimum.md) khi đổi import/export hoặc action lưu
- `src/lib/permission-registry.ts` — quyền module `BANG_KIEM` (ví dụ `import`)
