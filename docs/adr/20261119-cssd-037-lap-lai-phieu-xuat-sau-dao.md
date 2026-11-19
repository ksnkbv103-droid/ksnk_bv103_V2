# ADR 20261119 — CSSD-037: sự cố đã đảo phiếu xuất hóa chất được lập lại phiếu xuất

Dòng sổ lỗi: CSSD-037 (PO duyệt 19/11). Migration: `supabase/migrations/20261119140000_cssd_037_lap_lai_phieu_xuat_sau_dao.sql`.

## Bối cảnh

- `rpc_cssd_kho_hoa_chat_ghi_giao_dich` (bản CSSD-039, `20261119110000`) chặn phiếu XUẤT thứ hai cho cùng `su_co_id` bằng vị từ `is_active AND trang_thai <> 'TU_CHOI'` (CSSD-032). Phiếu XUẤT gốc đã đảo bằng phiếu ngược (CSSD-034, `20261118120000`; phiếu ngược `su_co_id` NULL) vẫn thỏa vị từ, nên sự cố bị coi «đã có phiếu» mãi.
- PO 19/11: (1) sự cố đã đảo được lập lại phiếu xuất mới; (3) đảo phiếu lý do `HET_HAN_HUY` vẫn cộng lại lô quá hạn, thêm ghi chú trên phiếu.

## Phương án

- A. `CREATE OR REPLACE` `ghi_giao_dich`: vị từ chặn thêm `NOT EXISTS` phiếu ngược `DA_DUYET` còn hiệu lực trỏ `phieu_goc_id` về phiếu đó — đúng quy tắc «đã đảo hết» mà `rpc_cssd_apply_incident_void` (CSSD-039) và app đang dùng. `lap_phieu_nguoc`: nối ghi chú khi phiếu gốc `ly_do_xuat = 'HET_HAN_HUY'`.
- B. Khi duyệt phiếu ngược thì tự đặt `is_active = false` cho phiếu gốc.
- C. Thêm cột cờ `da_dao` trên phiếu gốc.

## Phản biện

- B: phiếu gốc mất hiệu lực làm tồn tính sai (view tồn và kiểm tồn lọc `is_active`), phiếu đã duyệt bị trừ hai lần khi cộng phiếu ngược; sửa hàm duyệt ngoài phạm vi.
- C: cột trùng lặp thông tin đã suy ra được từ `phieu_goc_id`, cần đồng bộ; trái quy tắc không lưu trùng.
- A: không đổi schema, không đổi quyền; phiếu ngược còn CHO_DUYET vẫn chặn (chưa đảo xong). Đua: duyệt phiếu ngược đồng thời với lập phiếu mới thì phiếu mới chỉ có thể bị chặn (an toàn), không lọt hai phiếu hiệu lực chưa đảo. Ghi chú chỉ dùng cột `ghi_chu` sẵn có.

## Chọn

Phương án A. Giữ chữ ký, SECURITY DEFINER, `search_path`, REVOKE/GRANT (chỉ `service_role`). Hành vi cộng lại lô quá hạn khi duyệt phiếu ngược giữ nguyên (hàm duyệt không đổi). Phần app (kiểm trước RPC, lọc danh sách sự cố) do lát code TS làm. Hoàn tác: migration ngược chép lại thân hai hàm từ `20261119110000` (ghi) và `20261118120000` (lập phiếu ngược).
