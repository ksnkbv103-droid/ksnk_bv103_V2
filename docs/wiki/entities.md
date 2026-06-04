# Wiki — Entities (tổng hợp module)

> Một file thay cho `entities/*.md`. SSOT kỹ thuật: [`../core/implementation-mapping.md`](../core/implementation-mapping.md).

## CSSD

6 trạm QR: tiếp nhận → làm sạch → đóng gói/BOM → tiệt khuẩn → kho → phát trả.

| Chủ đề | SSOT |
|--------|------|
| Quy trình | `cssd_fact_quy_trinh`, `cssd_fact_quy_trinh_thanh_phan` |
| Mẻ / QC | `cssd_fact_lo_tiet_khuan` |
| Kho | `cssd_fact_kho_*` |
| Reform QLDCPT | [`../modules/cssd/reform-plan.md`](../modules/cssd/reform-plan.md) |
| Code | `cssd-stations.ts`, `cssd-packaging-rules.ts` |

Ranh giới MDM: [`concepts.md`](concepts.md#cssd-vs-mdm).

---

## Giám sát (VST + GSC)

**VST:** `gstt_fact_vst_sessions` + `gstt_fact_vst` (WHO 5 moments).

**GSC:** `gstt_fact_chung_sessions` + `results_jsonb` (không EAV). Template `gstt_dm_bang_kiem` — tóm tắt [`../modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md); **không** đọc tay `data/bang-kiem/canonical-36.md`.

| Route | Mục đích |
|-------|----------|
| `/giam-sat-chung/tuan-thu` | IPAC |
| `/giam-sat-chung/nhat-ky` | Nhật ký TB |
| `/giam-sat-chung/he-thong` | Cấu hình GSC |

Scoring: [`concepts.md`](concepts.md#gsc-scoring). UI: [`concepts.md`](concepts.md#layout-primitives).

---

## NKBV (HAI)

Stay-centric: `nkbv_fact_benh_an`, `nkbv_fact_su_kien`, `nkbv_fact_vi_sinh`.

| Hội chứng | Data | Runtime |
|-----------|------|---------|
| BSI, VAE, UTI, SSI, PNEU | `data/nkbv/algorithms/*` | `nkbv-rules-engine.ts` |

Logic phân loại **không** đặt trong Zod — chỉ `giam-sat-nkbv.validations.ts`.

- CDC workflow: [`../modules/nkbv/domain-specification.md`](../modules/nkbv/domain-specification.md)
- Form UI: [`../modules/nkbv/clinical-forms.md`](../modules/nkbv/clinical-forms.md)

---

## MDM + RBAC

| Khái niệm | TABLE |
|-----------|-------|
| Khoa / nhân sự | `mdm_dm_khoa_phong`, `mdm_nhan_su` |
| Lookup 14+ loại | `sys_lookup_value` (WRITE duy nhất) |
| RBAC | `sys_roles`, `sys_permissions`, `sys_role_permissions`, `sys_user_roles` |

> **Audit hệ thống (`sys_audit_log`):** đã gỡ khỏi app + DB (2026-06-02). Xem changelog `implementation-mapping.md`.

Import JSON: [`../reference/guides/json-import-export.md`](../reference/guides/json-import-export.md).

---

## QLCV

Pilot: điều hành + checklist + phê duyệt đề xuất (không KPI tháng trên UI).

| Giai đoạn | Hành vi |
|-----------|---------|
| Đề xuất | `is_active=false` → cột Kanban «Đề xuất chờ duyệt» |
| Tạo việc (chỉ huy) | Bắt buộc phụ trách → `DANG_LAM` |
| Phê duyệt đề xuất | Giao tổ + phụ trách → kích hoạt |
| Checklist | RPC `fn_qlcv_update_checklist` |

DB: `qlcv_fact_cong_viec`, `qlcv_fact_cong_viec_dinh_ky`. Chi tiết migrate / lỗi: [`../modules/qlcv/README.md`](../modules/qlcv/README.md).
