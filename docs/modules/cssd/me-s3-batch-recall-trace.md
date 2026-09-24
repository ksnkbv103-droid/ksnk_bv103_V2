# ME-S3 — Mẻ không đạt, thu hồi BI+, truy vết, phiếu in

Một lát trên nhánh ME-S2. Không gồm UX nhãn.

## Không đạt

Mẻ không đạt (một mục QC hoặc BI dương lúc kết luận) cập nhật mẻ, bộ và sự cố trong `rpc_cssd_me_thu_hoi`. Không thu hồi xong rồi mới ghi mẻ.

Mọi bộ chưa dùng lâm sàng: đóng chu kỳ cũ (`is_active = false`, giữ `lo_tiet_khuan_id`, khóa chu kỳ đó) và mở chu kỳ mới tại Tiếp nhận, không gắn mẻ, để xử lý lại như dụng cụ bẩn. Không về Đóng gói. Máy đang sẵn sàng chuyển `HOLD_QC`.

## BI dương

Kể cả mẻ đã nhả. Mẻ dương: `trang_thai_bi = DUONG`. Đã nhả thì `THU_HOI`, chưa nhả thì `QC_KHONG_DAT`. `ket_qua_test = false` — không còn hiển thị Đạt.

Phạm vi: cùng máy, sau mẻ BI âm gần nhất (mốc, không thu hồi) đến hết mẻ dương. Không có mốc âm thì lấy từ đầu đến mẻ dương. Không lấy mẻ chạy sau mẻ dương. Mẻ khác trong cửa sổ chuyển `THU_HOI`.

Bộ đã có `ma_ca_mo_id` không đổi trạm. Tên bộ ghi trên phiếu sự cố (`RECALL_LISTED_USED`) và trả về cho màn mẻ. Bộ chưa dùng bị thu hồi như trên.

Luồng mẻ không còn nhánh dedupe trả về trước khi thu hồi. Phiếu cùng mẻ và loại sự cố được cập nhật sau khi thu hồi, trong cùng transaction.

## Đếm và in

«Số bộ» và danh sách trên phiếu đếm mọi chu kỳ còn `lo_tiet_khuan_id`, kể cả chu kỳ đã đóng. Truy vấn thu hồi chỉ lấy `is_active = true`.

Phiếu in đọc cột ME-S2: mã mẻ, máy, phương pháp, chương trình, nhiệt độ, áp suất, thời gian chu kỳ, tên người nạp / dỡ / nhả theo user id, giờ bắt đầu, giờ kết thúc chu trình (`tk_mo_form_qc_at`), giờ nhả, ba mục QC bằng chữ Đạt hoặc Không đạt, BI Chưa có / Âm / Dương, cờ implant, danh sách bộ. In được mẻ không đạt và chờ BI. Không in mã thủ tục.

Cấp phát ghi `ma_ca_mo_id` bằng `jsonb ||`, không ghi đè metadata. Lỗi cập nhật cấp phát được trả ra. Ngoại lệ quy trình nối mảng `ngoai_le` bằng RPC.

## Schema

Migration `20260925120000_cssd_me_s3_batch_recall.sql`. Thêm giá trị `THU_HOI` vào check `trang_thai_me`. Không bảng mới.
