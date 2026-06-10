---
name: qlcv-pilot
description: Invariant QLCV pilot BV103 — Kanban, checklist RPC, spawn định kỳ. Invoke manual @qlcv-pilot khi sửa quản lý công việc.
---

# QLCV pilot

## Invariant nghiệp vụ

- **Trạng thái:** `MOI` → `DANG_LAM` → `CHO_DUYET` → `HOAN_THANH` / `TU_CHOI` / `QUA_HAN` / `DA_HUY`.
- **Tạo việc (chỉ huy):** Bắt buộc phụ trách → `DANG_LAM`; đề xuất `is_active=false` chờ duyệt.
- **Checklist:** RPC `fn_qlcv_update_checklist`; JSONB giữ trạng thái sau reload.
- **Spawn định kỳ:** Không trùng instance cùng mẫu/ngày (`fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`).
- **Scope:** User chỉ thấy việc theo khoa/quyền — không lộ chéo.

## Đọc bắt buộc

1. [`read-minimum.md`](../../../docs/core/read-minimum.md) — dòng QLCV
2. [`domain-specification.md`](../../../docs/core/domain-specification.md) — § QLCV
3. [`pilot-checklist-202606.md`](../../../docs/modules/qlcv/pilot-checklist-202606.md)

## Rule & verify

- Rule glob: `14-cong-viec-spec-context.mdc`
- `npm run verify:engineering` sau action/`qlcv_*`
- Checklist tay: Q1–Q6 trong pilot checklist
