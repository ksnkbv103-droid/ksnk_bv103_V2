# Báo cáo vệ sinh database — 03/07/2026 (Đợt 3a cải tổ)

> Phạm vi: chạy toàn bộ probe kiểm tra "dữ liệu rác" theo kế hoạch cải tổ toàn diện.
> Môi trường: **local golden** (đầy đủ) + **linked/staging** (bị chặn — xem §3).

## 1. Kết quả local golden — PASS 9/9

`npm run local:golden:verify` (03/07/2026):

| # | Probe | Kiểm tra | Kết quả |
|---|-------|----------|---------|
| 1 | `ssot:db:guard:local` | Compat view/RPC/prefix legacy tái sinh | OK |
| 2 | `trial:audit:probe:local` | Trigger audit mồ côi (`sys_audit_log`) | OK |
| 3 | `trial:auth:precheck:local` | Nhân sự MDM ↔ tài khoản auth mồ côi | OK |
| 4 | `gstt:db:audit:local` | Introspect GSTT + summary kinds + triggers | OK |
| 5 | `gstt-gap-id-parity-check` | Quan sát VST mồ côi, FK `khu_vuc_id`/`bang_kiem_id` sai | OK |
| 6 | `cssd:db:audit:local` | FK trạm CSSD, quy trình thiếu trạm, FEFO quá hạn | OK |
| 7 | `admin:rbac:parity:local` | Registry quyền TypeScript ↔ `sys_permissions` | OK |
| 8 | `trial:db:precheck:local` | Bảng/RPC 4 module pilot + legacy guard | OK |
| 9 | `trial:qlcv:precheck:local` | Schema QLCV lean (nhat_ky/checklist TEXT-only) | OK |

**Kết luận local:** không phát hiện dữ liệu rác, không có bản ghi mồ côi, không có object legacy tái sinh.

## 2. Probe bổ sung (Đợt 3c)

Probe mới `scripts/sql/fact-orphan-fk-sweep.sql` — quét tham chiếu mồ côi cho các bảng
fact chưa có audit riêng. Đã gắn vào `local:golden:verify` (probe thứ 10, chạy được
riêng bằng `npm run fact:orphan:sweep[:local]`). Nội dung kiểm:

| Khóa | Kiểm tra |
|------|----------|
| `fact_fk_not_validated` | FK khai báo NOT VALID còn treo trên mọi bảng fact |
| `nkbv_mau_so_daily_nguoi_bao_cao_orphan` | Người báo cáo mẫu số daily không tồn tại trong nhân sự (cột không FK) |
| `nkbv_su_kien_ma_benh_an_orphan` | Sự kiện NKBV trỏ mã bệnh án không có trong bệnh án |
| `nkbv_vi_sinh_ma_benh_an_orphan` | Kết quả vi sinh trỏ mã bệnh án không có trong bệnh án |
| `qlcv_viec_mo_phu_trach_inactive` | Việc đang mở nhưng người phụ trách đã ngừng hoạt động |
| `cssd_kho_hoa_chat_dm_inactive` | Giao dịch kho trỏ hóa chất đã tắt trong danh mục |

Kết quả lần chạy đầu (local, 03/07): **tất cả = 0** — sạch. `local:golden:verify` 10/10 PASS.

## 3. Linked/staging — BỊ CHẶN (chờ PO)

- `supabase db query --linked` trả **401 Unauthorized** → `SUPABASE_ACCESS_TOKEN`
  trong `.env.local` đã hết hạn.
- Trùng ghi nhận gap-register 02/07: "Verify linked staging chờ token Supabase OK".
- **Việc PO cần làm:** lấy token mới (Supabase Dashboard → Account → Access Tokens),
  cập nhật dòng `SUPABASE_ACCESS_TOKEN=` trong `.env.local`, sau đó nhờ agent chạy:
  1. `npm run trial:db:precheck && npm run trial:audit:probe && npm run trial:auth:precheck`
  2. `npm run gstt:db:audit` + `scripts/sql/gstt-archive-parity-check.sql` + `gstt-gap-id-parity-check.sql`
  3. `npm run cssd:db:audit` và `npm run admin:rbac:parity`
  4. Probe mới `fact-orphan-fk-sweep.sql` trên linked.
- **Đợt 3b (dọn dữ liệu linked)** chỉ thực hiện sau khi có báo cáo linked ở trên
  **và** PO duyệt danh sách bản ghi cụ thể — không xóa dữ liệu thật khi chưa duyệt.

## 4. Trạng thái tổng

| Hạng mục | Trạng thái |
|----------|-----------|
| Local golden 9 probe | PASS |
| Probe FK mồ côi mới (3c) | Đã thêm — PASS local |
| Linked probes | Chờ token mới (PO) |
| Dọn dữ liệu linked (3b) | Chờ báo cáo linked + PO duyệt |
