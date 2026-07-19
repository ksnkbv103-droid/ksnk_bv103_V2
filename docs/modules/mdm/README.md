# MDM & quản trị

> **Ngôn ngữ:** **MDM tổ chức** = khoa / nhân sự / lookup tổ chức (`mdm_*`, `sys_lookup_value`). **Master CSSD** = loại–bộ–BOM / thiết bị / hóa chất (`cssd_dm_*` TABLE) — CRUD tại Quản trị, không phải phiên QR/mẻ. Chi tiết ranh giới: [`../../wiki/concepts.md`](../../wiki/concepts.md#cssd-vs-mdm).

| Đọc khi | File |
|---------|------|
| **Lộ trình cải tiến (4 lớp)** | [`improvement-roadmap-20260717.md`](./improvement-roadmap-20260717.md) |
| Entrypoints code | [`../../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md`](../../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md) |
| Tổng hợp entity | [`../../wiki/entities.md`](../../wiki/entities.md#mdm--rbac--audit) |
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) § MDM |
| Ánh xạ DB | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § MDM |
| Import JSON | [`../../reference/guides/json-import-export.md`](../../reference/guides/json-import-export.md) |

Rule: `15-danh-muc-mdm-spec-context.mdc`, `20-master-data-placement.mdc`

Go-live 3 module: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

## Pilot checklist (tay — 5 kịch bản)

1. **Khoa → nhân sự → GSC:** Tạo/sửa khoa tại `/quan-tri-he-thong/danh-muc/khoa-phong` → gán nhân sự `/quan-tri-he-thong/nhan-su` → mở `/giam-sat-chung`, header có đúng khoa/khu vực.
2. **Bảng kiểm:** Sửa mẫu tại `/quan-tri-he-thong/bang-kiem` → phiên GSC mới load đủ tiêu chí (qua `mdm-read-gateway`).
3. **RBAC:** User không quyền module tương ứng (vd. `CONG_VIEC.edit` cho lookup QLCV) không sửa được generic DM; tab Phân quyền chỉ mở khi `PHAN_QUYEN.edit` hoặc admin (`/quan-tri-he-thong?tab=phan_quyen`).
4. **Tài khoản:** `/quan-tri-he-thong/tai-khoan-nhan-su` link Auth ↔ `mdm_nhan_su` → đăng nhập staff thành công.
5. **Dụng cụ ↔ CSSD:** Tab `/quan-tri-he-thong/danh-muc/dung-cu?tab=chi-tiet` → BOM checkpoint CSSD replenish (kho dự phòng).

## Import dữ liệu

| Luồng | Trạng thái |
|-------|------------|
| **Smart import** | SSOT mới — khoa phòng, hóa chất, thiết bị, nhân sự, dụng cụ (`smart-import.actions.ts`) |
| **Master Excel modal** | Legacy (`master-import.actions.ts`) — chỉ còn fallback nếu gọi trực tiếp modal cũ |

## Bảo vệ liên kết dữ liệu (IT) & trigger DB

> Tab hub nhãn **«Bảo vệ liên kết dữ liệu»** (không phải CRUD danh mục). Persona: IT / ADMIN.

- UI: hub `?tab=mdm_governance` → `sys_mdm_registry`, `sys_mdm_suggestion`.
- Sau khi approve mapping FK: chạy `npm run mdm:refresh` (script) để đồng bộ trigger `fn_mdm_validate_lookup_integrity` trên bảng đích.
- Chi tiết: [`../../core/operations-sop.md`](../../core/operations-sop.md), migration `20260525000002`.

## Verify

```bash
npm run verify:admin    # health + engineering + master-crud import guard
npm run test:admin      # unit specs module quản trị
```
