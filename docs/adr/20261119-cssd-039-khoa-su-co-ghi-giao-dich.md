# ADR 20261119 — CSSD-039: khóa sự cố khi lập phiếu xuất kho hóa chất

Dòng sổ lỗi: CSSD-039 (DA_XAC_MINH, db-verify 19/11). Migration: `supabase/migrations/20261119110000_cssd_039_khoa_su_co_ghi_giao_dich.sql`.

## Bối cảnh

- (a) `rpc_cssd_kho_hoa_chat_ghi_giao_dich` (bản `20261118090000_cssd_hc_chan_trung_su_co.sql`) khóa advisory theo sự cố (CSSD-032) nhưng không đọc `cssd_fact_su_co`, nên lập được phiếu XUẤT CHO_DUYET gắn sự cố đã `is_active=false` (tái hiện tuần tự).
- (b) `rpc_cssd_apply_incident_void` (bản `20261110110000_cssd_incident_void_atomic.sql`) đã `SELECT … FOR UPDATE` dòng sự cố, nhưng việc kiểm phiếu kho hóa chất chỉ nằm ở app (`void-incident.application.ts`, trước khi gọi RPC). Hủy chạy đồng thời với lập phiếu thì phiếu vẫn gắn vào sự cố đã hủy.
- Phiếu ngược (CSSD-034, `20261118120000_cssd_hc_phieu_nguoc.sql`) là phiếu NHẬP có `phieu_goc_id`, `su_co_id` luôn NULL (CHECK `cssd_fact_kho_hc_phieu_nguoc_check`), lập qua RPC riêng, không đi qua `ghi_giao_dich`.

## Phương án

- A. Một migration `CREATE OR REPLACE` hai hàm: `ghi_giao_dich` thêm `FOR SHARE` dòng sự cố (chỉ nhánh XUẤT có `su_co_id`, sau advisory lock) và chặn khi sự cố không còn hiệu lực; `apply_incident_void` kiểm lại phiếu kho dưới `FOR UPDATE` sẵn có, cùng quy tắc app.
- B. Trigger trên `cssd_fact_kho_hoa_chat_giao_dich` kiểm sự cố còn hiệu lực khi INSERT.
- C. Chỉ dùng advisory lock theo sự cố ở cả hai hàm (void cũng gọi `pg_advisory_xact_lock('cssd_kho_hoa_chat_su_co:'…)`).

## Phản biện

- B: trigger chạy cả với INSERT trực tiếp (fixture, nhập dữ liệu cũ), đổi hành vi ngoài phạm vi; không giải quyết (b) vì void vẫn không kiểm phiếu.
- C: thêm một khóa thứ hai cho void (thứ tự khóa: advisory rồi dòng, phải chứng minh lại không vòng với các đường khác khóa dòng sự cố); `FOR SHARE` dùng chính khóa dòng mà void đã giữ, không thêm loại khóa mới.
- A: `FOR SHARE … WHERE is_active = true` dưới READ COMMITTED đọc lại bản mới nhất sau khi void commit, nên trả không dòng → chặn. Thứ tự khóa: `ghi` = advisory hóa chất → advisory sự cố → dòng sự cố; `void` = dòng sự cố rồi chỉ đọc phiếu kho, không lấy advisory → không vòng. Phiếu ngược mang `su_co_id` NULL nên vế ngoài không đếm nó; quy tắc «đã đảo hết» xét `phieu_goc_id` + DA_DUYET + `is_active`, như app. Dữ liệu lọt cũ (phiếu đã gắn sự cố đã hủy) không dọn.

## Chọn

Phương án A. Giữ nguyên chữ ký, SECURITY DEFINER, `search_path`, REVOKE/GRANT (chỉ `service_role`); hai hàm không có COMMENT. Thông điệp chặn hủy chép đúng chuỗi app trả về. Kiểm chứng: `supabase/tests/database/cssd_039_khoa_su_co.test.sql` (8 ca) + thử đua hai phiên. Hoàn tác: migration ngược chép lại thân hàm của `20261118090000` (ghi_giao_dich) và `20261110110000` (apply_incident_void).
