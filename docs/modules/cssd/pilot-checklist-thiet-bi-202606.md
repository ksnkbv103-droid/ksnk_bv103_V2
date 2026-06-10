# Pilot CSSD — Thiết bị & bảo trì (`/cssd-thiet-bi`)

> **Phase 4.2** · Tiền đề: có ≥1 máy tiệt khuẩn trong `cssd_dm_thiet_bi`; quyền `CSSD_ME_TIET_KHUAN` (sửa bảo trì dùng chung gate mẻ TK).

**Verify auto trước khi ký tay:**

```bash
npm run verify:cssd
npx vitest run src/modules/cssd-erp/helpers/assert-thiet-bi-cho-me-tiet-khuan.spec.ts
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/cssd-workflow.spec.ts -g "Thiết bị"
```

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| T1 | Danh mục read-only | Tab **Danh mục (Quản trị)** | Banner hướng CRUD sang Quản trị; không sửa trực tiếp tại CSSD |
| T2 | Bắt đầu bảo trì | Tab **Bảo dưỡng** → chọn máy → **Bắt đầu** | `cssd_dm_thiet_bi.trang_thai` = `REPAIRING`; ticket `DANG_THUC_HIEN` |
| T3 | Khóa mẻ TK | Máy đang `REPAIRING` → `/cssd-erp/batch` tạo mẻ cùng máy | Lỗi «đang bảo trì» (app + `assertThietBiSanSangChoMeTietKhuan`) |
| T4 | Kết thúc bảo trì | **Hoàn thành** bảo trì | Máy `READY`; `ngay_bao_tri_ke_tiep` cập nhật theo chu kỳ |
| T5 | Mẻ mở chặn bảo trì | Mẻ TK chưa kết quả test → thử **Bắt đầu bảo trì** cùng máy | Lỗi «còn mẻ chưa kết thúc» |
| T6 | Điều hướng module | **Sidebar** trái | Chuyển được Quy trình / Sự cố / Dụng cụ / Thiết bị / Hóa chất |

**Ghi nhận pilot:** ngày ___ | tester ___ | T1–T6 ___

**Pass Phase 4.2:** ≥5/6 ☐

**Liên kết Phase 3:** sau T4, chạy lại P3-2 (Spaulding + mẻ TK) trên cùng máy vừa `READY`.
