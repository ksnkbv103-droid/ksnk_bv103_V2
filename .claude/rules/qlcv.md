---
paths:
  - "src/modules/quan-ly-cong-viec/**"
  - "src/app/quan-ly-cong-viec/**"
---

# Công việc mạng lưới — ngữ cảnh spec

Trước khi sửa task, minh chứng, import, notification:

1. [`19-QLCV-DOMAIN-SSOT.md`](../../docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md) — domain QLCV đang dùng
2. [`domain-specification.md`](../../docs/core/domain-specification.md) — QLCV Track B
3. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md) § Công việc
4. [`read-minimum.md`](../../docs/core/read-minimum.md) — đối chiếu `UI → Action → DB` trong mapping khi đổi action

## QLCV pilot

## Invariant nghiệp vụ

- **Trạng thái:** `MOI` → `DANG_LAM` → `CHO_DUYET` → `HOAN_THANH` / `TU_CHOI` / `QUA_HAN` / `DA_HUY`.
- **Tạo việc (chỉ huy):** Bắt buộc phụ trách → `DANG_LAM`; đề xuất `is_active=false` chờ duyệt.
- **Checklist:** RPC `fn_qlcv_update_checklist`; JSONB giữ trạng thái sau reload.
- **Spawn định kỳ:** Không trùng instance cùng mẫu/ngày (`fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`).
- **Scope:** User chỉ thấy việc theo khoa/quyền — không lộ chéo.

## Đọc bắt buộc

1. [`read-minimum.md`](../../docs/core/read-minimum.md) — dòng QLCV
2. [`domain-specification.md`](../../docs/core/domain-specification.md) — § QLCV

## Rule & verify

- `npm run verify:engineering` sau action/`qlcv_*`
- Checklist tay: ≥3 kịch bản qua `/uat-cases`
