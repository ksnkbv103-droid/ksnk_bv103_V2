# Pilot giám sát (VST + GSC) — checklist tay

> **Môi trường:** staging linked (hoặc local sau `supabase start`).  
> **Tiền đề:** Phase 1 Quản trị PASS ([`../mdm/README.md`](../mdm/README.md) — khoa, bảng kiểm, RBAC).  
> **Verify DB:** `npm run trial:db:precheck` — `fact_gsc_*`, `fact_vst_*`, `bang_kiem_ok` = true.

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| G1 | Tạo phiên GSC hôm nay | `/giam-sat-chung` → chọn bảng kiểm → điền tiêu chí → Lưu | Không lỗi; điểm/preview khớp `cach_tinh_diem` |
| G1b | Tab Thống kê — 1 phiên | Sau G1: **Tiêu chí áp dụng** = số tiêu chí đã chấm (≠ N/A), **Đạt** ≤ áp dụng; % = Đạt/áp dụng | Khớp form/in ấn |
| G2 | Sửa phiên GSC (chưa khóa) | Mở phiên vừa tạo → sửa 1 tiêu chí → Lưu | Reload giữ dữ liệu |
| G3 | Khóa GSC | Admin bật khóa module GSC (nếu dùng) → thử sửa/xóa | Bị chặn đúng thông báo |
| G4 | Lịch sử GSC | Tab lịch sử → lọc khoa + kỳ | Danh sách đúng ngày/khoa |
| V1 | Tạo phiên VST | `/giam-sat-vst` → phiên mới → ghi ≥1 cơ hội WHO → Lưu | Hiện trên tab history |
| V2 | Header VST | Chọn khoa/khu vực từ danh mục admin | Dropdown khớp MDM |
| V3 | Không import cũ | Không dùng luồng import VST đã gỡ | Chỉ session UI |

**Ghi nhận pilot:** ngày ___ | tester ___ | G1–G4 ___ | V1–V3 ___

**Lệnh:**

```bash
npm run verify:engineering   # sau sửa action giám sát
npm run trial:db:precheck    # staging
```

**Ngoài phạm vi pilot gấp:** `/giam-sat-nkbv`, dashboard strategic sâu (chỉ đọc nếu cần).
