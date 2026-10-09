# MDM & quản trị

> **MDM tổ chức** = khoa / nhân sự / lookup (`mdm_*`, `sys_lookup_value`). **Master CSSD** = loại–bộ–BOM / thiết bị / hóa chất (`cssd_dm_*`) — CRUD tại Quản trị, không phải phiên QR/mẻ. Ranh giới: [`../../wiki/concepts.md`](../../wiki/concepts.md#cssd-vs-mdm).

| Đọc khi | File |
|---------|------|
| Entrypoints code | [`../../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md`](../../../src/modules/quan-tri-he-thong/ENTRYPOINTS.md) |
| Entity / nghiệp vụ / mapping | [`../../wiki/entities.md`](../../wiki/entities.md#mdm--rbac--audit) · domain-spec § MDM · mapping § MDM |
| Import JSON | [`../../reference/guides/json-import-export.md`](../../reference/guides/json-import-export.md) |

Rule: `15-danh-muc-mdm-spec-context.mdc`, `20-master-data-placement.mdc`

Go-live 3 module: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

## Pilot checklist (tay)

1. **Khoa → nhân sự → GSC:** Tạo/sửa khoa → gán nhân sự → `/giam-sat-chung` header đúng khoa.
2. **Bảng kiểm:** Sửa mẫu tại `/quan-tri-he-thong/bang-kiem` → phiên GSC mới load đủ tiêu chí.
3. **RBAC:** User thiếu quyền không sửa generic DM; tab Phân quyền chỉ khi `PHAN_QUYEN.edit` hoặc admin.
4. **Tài khoản:** `/quan-tri-he-thong/tai-khoan-nhan-su` link Auth ↔ `mdm_nhan_su`.
5. **Dụng cụ ↔ CSSD:** `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo` → BOM; vận hành đọc `/cssd-dung-cu`.

## Import & bảo vệ liên kết

- Smart import + `useImportExport` là SSOT. Xem trước → An toàn / Đồng bộ đầy đủ / Hủy. Server mặc định an toàn.
- Hub `?tab=mdm_governance` → `sys_mdm_registry`. Sau approve FK: `npm run mdm:refresh`.

```bash
npm run verify:admin
npm run test:admin
```
