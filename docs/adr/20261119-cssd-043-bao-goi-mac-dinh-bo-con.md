# ADR 20261119 — CSSD-043: bao gói mặc định của bộ con tách nhiệt

Dòng sổ lỗi: CSSD-043 phần (b). Phần (a) «bộ con -EO» không thuộc ADR này (chờ khoa CSSD, câu C2).

## Bối cảnh

`fn_cssd_dong_bo_tach_nhiet_core` (bản `20261111140000_cssd_bo_tong_hardening_2.sql:74`) gán `loai_bao_goi_id` của bộ con -CN và -KCN bằng bao gói của bộ mẹ (`:174`). Bộ mẹ bao gói VAI thì cả hai con đều VAI. Quy tắc cũ theo nhóm (chịu nhiệt → GIAY; không chịu nhiệt → TUI_EP) chỉ còn ở commit `379b835e` (TS), không vào nhánh hiện tại. Hạn dùng (HSD) đọc bao gói của bộ con nên HSD sai; Plasma cấm cellulose mà -KCN đang kế thừa VAI/GIAY (`domain-overview.md:190`). Đặc tả PO: «bộ thành phần mới tách nhận bao gói theo nhóm» (`domain-overview.md:194`).

## Phương án

- A. Một migration mới `CREATE OR REPLACE` hàm core, đổi dòng gán thành `COALESCE(tra cssd_dm_loai_bao_goi theo ma của vai trò, bao gói bộ mẹ)`; chỉ áp cho bộ con mới INSERT.
- B. Khôi phục bước gán trong TS (`cssd-heat-split-apply.ts`) sau khi gọi RPC.
- C. Thêm cột «bao gói mặc định theo vai trò» vào `cssd_dm_loai_bao_goi` rồi tra cột đó.

## Phản biện

- B: hàm core còn được gọi từ trigger và `20261111130000_cssd_bo_tong_chuyen_du_lieu.sql:197`, không qua TS, nên B bỏ sót các đường đó; quy tắc nằm hai nơi.
- C: thêm cột và dữ liệu cho một quy tắc hai giá trị, chưa có nhu cầu đổi giá trị theo đơn vị.
- A: -CN luôn GIAY nên ghi đè trường hợp bộ mẹ cố ý đặt HOP; con đã tồn tại không được sửa (backfill là quyết định riêng, cần PO); mã `ma` thiếu trong bảng thì COALESCE giữ bao gói bộ mẹ (không làm lỗi hàm).

## Chọn

Phương án A: sửa tại hàm SQL duy nhất mọi đường đều đi qua, tra theo `ma` (GIAY, TUI_EP), COALESCE về bao gói bộ mẹ khi không tra được. Giữ nguyên COMMENT/REVOKE/GRANT để `acl-snapshot.json` không đổi. Hoàn tác: migration ngược chép lại thân hàm của `20261111140000`.
