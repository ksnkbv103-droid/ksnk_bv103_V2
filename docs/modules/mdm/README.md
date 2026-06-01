# MDM & quản trị

| Đọc khi | File |
|---------|------|
| Entrypoints code | [`../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md`](../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md) |
| Tổng hợp entity | [`../../wiki/entities.md`](../../wiki/entities.md#mdm--rbac--audit) |
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) § MDM |
| Ánh xạ DB | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § MDM |
| Import JSON | [`../../reference/guides/json-import-export.md`](../../reference/guides/json-import-export.md) |

Rule: `15-danh-muc-mdm-spec-context.mdc`, `20-master-data-placement.mdc`

## Pilot checklist (tay — 5 kịch bản)

1. **Khoa → nhân sự → GSC:** Tạo/sửa khoa tại `/quan-tri-he-thong/danh-muc/khoa-phong` → gán nhân sự `/nhan-su` → mở GSC, header có đúng khoa/khu vực.
2. **Bảng kiểm:** Sửa mẫu tại `/bang-kiem` → phiên GSC mới load đủ tiêu chí (qua `mdm-read-gateway`).
3. **RBAC:** User không `DANH_MUC.edit` không sửa được generic DM; tab Phân quyền chỉ mở khi `PHAN_QUYEN.edit` hoặc admin (`?tab=phan_quyen`).
4. **Tài khoản:** `/tai-khoan-nhan-su` link Auth ↔ `mdm_nhan_su` → đăng nhập staff thành công.
5. **Dụng cụ ↔ CSSD:** Tab `/danh-muc/dung-cu?tab=chi-tiet` → BOM checkpoint CSSD replenish (kho dự phòng).

## Import dữ liệu

| Luồng | Trạng thái |
|-------|------------|
| **Smart import** | SSOT mới — từng trang DM (`smart-import.actions.ts`) |
| **Master Excel modal** | Legacy (`master-import.actions.ts`) — khoa, HC, TB, nhân sự; gộp vào smart import sau pilot |

## MDM Governance & trigger DB

- UI: hub `?tab=mdm_governance` → `sys_mdm_registry`, `sys_mdm_suggestion`.
- Sau khi approve mapping FK: chạy `npm run mdm:refresh` (script) để đồng bộ trigger `fn_mdm_validate_lookup_integrity` trên bảng đích.
- Chi tiết: [`../../core/operations-sop.md`](../../core/operations-sop.md), migration `20260525000002`.

## Verify

```bash
npm run verify:admin    # health + engineering + master-crud import guard
npm run test:admin      # unit specs module quản trị
```
