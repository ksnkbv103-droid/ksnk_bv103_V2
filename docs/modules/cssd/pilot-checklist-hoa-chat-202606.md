# Pilot CSSD — Kho hóa chất & vật tư (`/cssd-hoa-chat`)

> **Phase 4.1** · Tiền đề: migration apply; quyền `KSNK_KHO_HOACHAT`; **không** bật `KSNK_PILOT_CORE_MODULES=1` (route CSSD bị 404).

**Verify auto trước khi ký tay:**

```bash
npm run verify:cssd
npx vitest run src/modules/cssd-erp/helpers/kho-hoa-chat-lot.spec.ts
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/cssd-workflow.spec.ts -g "Hóa chất"
```

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| H1 | Xem tồn theo lô | `/cssd-hoa-chat` → tab **Tồn kho** | Bảng tồn hiển thị; tổng khớp view `v_cssd_kho_hoa_chat_ton_lo` |
| H2 | Nhập kho | Chọn hóa chất → **Nhập** → số lượng + lô + HSD → Lưu | Giao dịch `NHAP` trong lịch sử; tồn lô tăng |
| H3 | Xuất kho (FEFO) | **Xuất** từ lô có HSD gần nhất | Giao dịch `XUAT`; không xuất âm tồn |
| H4 | Ngưỡng cảnh báo | Quản trị hoặc sheet → đặt `nguong_ton_toi_thieu` → tồn ≤ ngưỡng | Banner đỏ + stat card «dưới ngưỡng» |
| H5 | HSD sắp hết | Lô HSD trong 30 ngày | Banner amber «sắp hết hạn» |
| H6 | Phân quyền | User không có `KSNK_KHO_HOACHAT` | Trang «Không có quyền»; không gọi được action ghi |

**Ghi nhận pilot:** ngày ___ | tester ___ | H1–H6 ___

**Pass Phase 4.1:** ≥5/6 ☐

**Lỗi thường gặp:** thiếu danh mục hóa chất ở Quản trị → tab Catalog read-only; incident «Thiếu hóa chất» mở từ nút báo sự cố trên trang kho.
