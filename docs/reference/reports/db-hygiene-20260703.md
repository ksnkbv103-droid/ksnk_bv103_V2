# Báo cáo vệ sinh database — 03/07/2026 (Đợt 3a cải tổ)

> Phạm vi: chạy toàn bộ probe kiểm tra "dữ liệu rác" theo kế hoạch cải tổ toàn diện.
> Môi trường: **local golden** (đầy đủ) + **linked/staging** (đã chạy 03/07 sau khi PO cấp token mới — xem §3–§4).

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

## 3. Linked/staging — ĐÃ MỞ KHÓA (03/07 chiều)

- PO đã cấp token Supabase mới; `.env.local` đã cập nhật (file không git track).
- `supabase db query --linked` chạy bình thường — **không còn 401**. Kết quả đầy đủ ở §4.

## 4. Kết quả linked 03/07 — chạy toàn bộ probe read-only

Tất cả lệnh CHỈ ĐỌC, không sửa dữ liệu. Kết quả từng probe:

| # | Probe | Kết quả | Số liệu chính |
|---|-------|---------|---------------|
| 1 | `trial:db:precheck` | **PASS** | 23/23 cột `true` (bảng/RPC 4 module + summary tables dropped OK) |
| 2 | `ssot-legacy-guard` (trong precheck) | **PASS** | Không compat view/RPC/prefix legacy tái sinh; `active_khu_vuc_count = 22` |
| 3 | `trial:audit:probe` | **PASS** | `sys_audit_log` không tồn tại, `fn_sys_audit_row` không tồn tại, 0 trigger audit mồ côi — đúng trạng thái sau khi gỡ hệ audit cũ |
| 4 | `trial:auth:precheck` | **PASS** (1 ghi chú) | auth.users 15 · mdm_nhan_su 37 · đã gắn auth 15 · **8 nhân sự có email nhưng chưa có tài khoản** · nhân sự mồ côi phía auth = 0 |
| 5 | `gstt:db:audit` | **PASS** | 36 bảng kiểm active, 0 bảng thiếu cách tính điểm; 5/5 summary đều là VIEW (live); 5 trigger sync/validate đúng danh sách |
| 6 | `gstt-gap-id-parity-check` | **FAIL lúc phát hiện — ĐÃ XỬ LÝ 03/07** | Lúc phát hiện: `invalid_khu_vuc_vst_sessions = 1`, `invalid_khu_vuc_vst_obs = 14`; sau xử lý: tất cả = 0 (chi tiết §4.1) |
| 7 | `gstt-archive-parity-check` | **PASS** (linked ≥ archive) | VST sessions 2508 (archive 2094, +414) · VST obs 25201 (archive 21940, +3261) · GSC 247 (archive 14, +233) — xem §4.2; `null_khoa`/`null_nguoi_gs` đều = 0 |
| 8 | `cssd:db:audit` | **PASS** | `quy_trinh_thieu_tram = 0` · `quy_trinh_tram_invalid = []` · FEFO quá hạn = 0; 6 trạm active đúng thứ tự |
| 9 | `admin:rbac:parity` | **PASS** | 119 quyền / 29 module khớp registry ↔ DB; 8 role, 317 link role-quyền, 16 link user-role, admin đủ 119/119 |
| 10 | `fact:orphan:sweep` | **PASS** | Cả 6 chỉ số = 0 (NKBV mã bệnh án, người báo cáo, QLCV phụ trách inactive, kho hóa chất, FK NOT VALID) |
| 11 | `trial:qlcv:precheck` | **PASS** | 10/10 cột `true` (schema QLCV lean) |

### 4.1. Dữ liệu rác phát hiện — ĐÃ XỬ LÝ 03/07

**1 phiên VST + 14 quan sát trỏ khu vực giám sát không tồn tại** trong `sys_lookup_value`:

| Trường | Giá trị |
|--------|---------|
| Bảng | `gstt_fact_vst_sessions` (1 phiên) + `gstt_fact_vst` (14 quan sát cùng phiên) |
| `session_id` | `68bdce94-cd78-49d7-bbdd-e154eda19fec` |
| `khu_vuc_id` (mồ côi) | `c1030002-0000-4000-8000-000000000002` — không có trong danh mục khu vực (kể cả bản ghi inactive) |
| Khoa | KHOA RĂNG MIỆNG (`9467cda7-2bac-4205-bd8b-a4219aa987b0`) |
| Ngày giám sát | 14/05/2026 · `created_at` 14/05/2026 08:56 (giờ VN) · `is_active = true` |

**ĐÃ XỬ LÝ 03/07 — PO duyệt phương án bỏ trống khu vực; parity check sau xử lý sạch 100%.**

- PO chọn phương án (b): set `khu_vuc_id = NULL`, giữ nguyên toàn bộ dữ liệu giám sát.
- Đã update trên linked: **1 dòng** `gstt_fact_vst_sessions` + **14 dòng** `gstt_fact_vst`
  (probe trước xử lý xác nhận đúng 1 phiên + 14 quan sát, đúng session id trên).
- Parity check sau xử lý (`gstt-gap-id-parity-check`): `invalid_khu_vuc_vst_sessions = 0`,
  `invalid_khu_vuc_vst_obs = 0`, `orphan_vst_obs = 0`; tổng số không đổi
  (2508 phiên VST / 25201 quan sát / 247 phiên GSC).

Các phương án đã cân nhắc trước đó:
- (a) Gán lại `khu_vuc_id` sang khu vực đúng trong danh mục, hoặc
- (b) Set `khu_vuc_id = NULL` cho phiên + 14 quan sát (giữ dữ liệu giám sát, mất thông tin khu vực) — **được chọn**, hoặc
- (c) Khôi phục bản ghi khu vực `c1030002-…-0002` vào `sys_lookup_value` nếu xác định bị xóa nhầm.

### 4.2. Parity so archive — không mất dữ liệu, chỉ có dữ liệu mới

Snapshot archive (`supabase/archive/data-pgdump-deprecated-202606.sql`): VST 2094 phiên /
21940 quan sát / GSC 14 phiên. Linked hiện tại **lớn hơn hoặc bằng** ở mọi chỉ số →
không mất dữ liệu so snapshot; phần chênh (+414 phiên VST, +3261 quan sát, +233 phiên GSC)
là dữ liệu pilot nhập mới sau thời điểm snapshot 06/2026. Ghi chú thêm:
`vst_sessions_before_2024 = 147`, `vst_sessions_2024 = 790` (dữ liệu lịch sử import, không phải rác);
GSC 245/247 phiên có `results_jsonb`, 0 phiên `null_khoa`.

### 4.3. Ghi chú không phải rác (không cần dọn)

- **8 nhân sự có email nhưng chưa gắn tài khoản auth** (`mdm_email_no_auth = 8`):
  bình thường nếu các nhân sự này chưa được cấp tài khoản đăng nhập; chiều ngược lại
  (tài khoản auth không có hồ sơ nhân sự) = 0 nên không có mồ côi thật.

## 5. Trạng thái tổng

| Hạng mục | Trạng thái |
|----------|-----------|
| Local golden 9 probe | PASS |
| Probe FK mồ côi mới (3c) | Đã thêm — PASS local + PASS linked |
| Linked probes (03/07) | ĐÃ CHẠY — 10/11 PASS, 1 phát hiện rác (§4.1) |
| Dọn dữ liệu linked (3b) | ĐÃ XỬ LÝ 03/07 — PO duyệt bỏ trống khu vực; parity sạch 100% (§4.1) |
