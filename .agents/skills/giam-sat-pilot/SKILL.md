---
name: giam-sat-pilot
description: Invariant VST/GSC pilot BV103 — phiên, scoring, import. Invoke manual @giam-sat-pilot khi sửa giám sát.
---

# Giám sát pilot (VST + GSC)

## Invariant nghiệp vụ

- **VST:** WHO 5 moments; tối đa **3 đối tượng** một phiên (trừ spec mới).
- **GSC:** Kết quả inline `results_jsonb` — **không** EAV `fact_giam_sat_chung_results`.
- **Scoring:** Khớp `cach_tinh_diem` trên template `gstt_dm_bang_kiem`; không đoán công thức.
- **Fact:** Ưu tiên đính chính + soft-delete khi phù hợp; không import VST legacy đã gỡ.
- **RLS/khoa:** Header khoa/khu vực từ MDM; scope đọc theo quyền.

## Đọc bắt buộc

1. [`read-minimum.md`](../../../docs/core/read-minimum.md) — dòng Giám sát VST/GSC
2. [`domain-specification.md`](../../../docs/core/domain-specification.md) — § VST, § GSC
3. [`pilot-checklist-202606.md`](../../../docs/modules/giam-sat/pilot-checklist-202606.md)

## Rule & verify

- Rule glob: `13-giam-sat-spec-context.mdc`
- `npm run verify:engineering` sau action/`gstt_*`
- Checklist tay: G1–G4, V1–V3 trong pilot checklist
