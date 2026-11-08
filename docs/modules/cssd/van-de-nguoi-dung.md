# CSSD — Vấn đề & giá trị

Trạng thái: XÂY
Đầu mối: Nguyễn Thanh Bình

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`domain-overview.md`](domain-overview.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Tổ CSSD quét tem qua 6 trạm, chạy mẻ tiệt khuẩn, cấp phát cho khoa. `[SSOT]` domain-overview §3.
- Đầu mối: Nguyễn Thanh Bình. `[SSOT]` PO 2026-10-31.
- Mỗi trạm có thể nhiều người; một người có thể đảm nhiệm nhiều trạm trong kíp trực. Người làm trạm nào nhập liệu trạm đó. `[SSOT]` PO 2026-11-08.
- Khoa lâm sàng nhận bộ dụng cụ; KSNK xem sự cố/truy vết. `[GIẢ THUYẾT]`

## 2. Hiện làm thế nào (không có app)
- Theo quy trình PCI QT.18–25. `[SSOT]` domain-overview.
- Hiện không có sổ hay giấy ở các trạm; muốn số hóa. Mỗi trạm cần ghi: người làm, thời gian bắt đầu xử lý. `[SSOT]` PO 2026-11-08.
- Phiếu mẻ tiệt khuẩn ghi giấy tại khu kiểm tra chất lượng tiệt khuẩn; muốn số hóa. Kho, hóa chất, BOM đang nhập tay/Excel, đưa vào thử luôn. `[SSOT]` PO 2026-11-08.

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Truy vết bộ dụng cụ → mẻ → khoa rất lâu, hiện không có cách nào tìm lại một bộ hoặc một mẻ. BI dương: chưa có cách thu hồi nhanh, chỉ chặn ở cửa phát hoặc gọi điện báo khoa. `[SSOT]` PO 2026-11-08; luật thu hồi theo `lo_tiet_khuan_id` `[SSOT]` §5 mục 3, 11.
2. Thiếu cấu phần trong bộ phát hiện muộn, khoảng 10 lần/tháng. `[SSOT]` PO 2026-11-08; §5 mục 1 (cảnh báo, không chặn).
3. Sai/quên xảy ra ở tất cả các trạm và khâu. `[SSOT]` PO 2026-11-08. Khi chạy tay: tương đối ổn nhưng chuyển trạng thái khi quét/chọn chậm (cần đo, mục 5). `[SSOT]` PO 2026-11-08.

## 4. Giải pháp đang có
- 6 trạm, phiếu mẻ, in tem, sự cố, kho, bảo trì máy. `[SSOT]` domain-overview §3, §6, §7.
- Mới chạy tay K1–K5 trên DB local do Claude chạy thay tổ CSSD; chưa phải người dùng thật. `[SSOT]` handover-roadmap §5.

Rà theo 10 bước: xem mục 8.

## 5. Tiêu chí «có ích» (đo được)
- Truy vết một bộ từ mã tem tới mẻ và khoa dưới 1 phút. `[SSOT]` PO 2026-11-08.
- Một lần quét/chuyển trạm dưới 5 giây. `[SSOT]` PO 2026-11-08; đo thực tế mục 3.3.
- Bỏ giấy là mục tiêu, không đặt điều kiện thêm. `[SSOT]` PO 2026-11-08.
- ≈ 1000 chu trình/tuần, tất cả các trạm tham gia, trong 4 tuần. `[SSOT]` PO 2026-11-08; hiện 10 chu trình thử. `[SSOT]` roadmap §5.

## 6. Kịch bản xác nhận
Hỏi đầu mối (15 phút):
1. Một ca làm việc ghi những gì, vào đâu?
2. Lần gần nhất phải tìm lại một bộ/mẻ, mất bao lâu?
3. Bước nào hay sai hoặc hay quên?
4. App làm chậm hay nhanh hơn cách hiện tại, ở trạm nào?
5. Điều kiện nào để tổ chịu bỏ sổ giấy?
Ba kịch bản tay: K1–K5 trong [`18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`](18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md), chạy lại với người của tổ. `[SSOT]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: tổ tự nhập ≥ N chu trình/tuần, 4 tuần, truy vết đạt mục 5.
- Thu hẹp: chỉ giữ trạm/mẻ tổ thật sự dùng, dừng phần còn lại.
- Dừng/đóng băng: tổ vẫn ghi giấy sau 4 tuần.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.

## 8. Rà vòng đời (2026-11-08)
Bằng chứng cơ học: `npm run module:audit -- cssd` (thiếu: bước 9). Phiếu mẻ (BI/CI/QC 3 cấp), hóa chất, sự cố trả về trạm: đã có trong app (PO xác nhận).

| Bước | Chấm | Bằng chứng |
|---|---|---|
| 1 Vấn đề | hợp | mục 1–3 `[SSOT]` PO 2026-11-08 |
| 2 Giải pháp | hợp | 6 trạm + phiếu mẻ + sự cố + kho (domain-overview §3, §6, §7) |
| 3 MVP | hợp | roadmap §5 có lát CSSD |
| 4 Yêu cầu/DoD | hợp | SSOT 18 (K1–K5), 21 nhãn `[SSOT]` |
| 5 Thiết kế | **lệch** | ① nơi nhận: PO yêu cầu chọn khoa hoặc bàn mổ/phòng mổ, nhiều bộ một lần `[SSOT]`; code `rpc_cssd_cap_phat_commit` chạy từng bộ (`cssd-scan.actions.ts:166`), chỉ có `khoa_nhan_id` + `ma_ca_mo_id` (truy vết), chưa có nơi nhận là phòng/bàn mổ. ② người + giờ mỗi trạm **đã có**: RPC quét ghi `nguoi_*_id` + `thoi_gian_*` theo người đăng nhập (`20261030010000_cssd_nhat_ky_chu_ky.sql:342-346`, `cssd-station-clear.ts:12-17`); không cần lát mới, chỉ cần mỗi người dùng tài khoản riêng khi chạy thử (rà 2026-11-09, sửa nhận định sai ngày 2026-11-08). ③ thu hồi BI+ trả từng bộ kèm khoa (`batch-recall-hold.application.ts:67-82`); chưa có màn gom «mẻ → khoa» để gọi điện |
| 6 Xây lát | hợp | 46 action, phiếu mẻ/hóa chất/sự cố có sẵn |
| 7 Kiểm chứng | hợp | 60 spec; K1–K5 chạy tay trên DB local |
| 8 Chạy thử | **thiếu** | chưa người của tổ chạy; hiện 10 chu trình thử (roadmap §5) |
| 9 Vận hành | **thiếu** | chưa có ai hỗ trợ/ca trực lúc chạy thử, quy trình khi app sự cố → quay lại giấy |
| 10 Đo | **thiếu** | chưa đo thời gian quét/chuyển trạm và truy vết trên máy thật (ngưỡng <5 s, <1 phút ở mục 5) |

Đã có mà trước đây ghi nhầm là thiếu: nhập Excel hóa chất và loại dụng cụ qua UI (`HoaChatMasterPage.tsx`, `LoaiDungCuPage.tsx` dùng `ImportExportToolbar`). Chưa chắc: nhập Excel riêng cho BOM (cấu phần bộ) `[CẦN XÁC NHẬN]` — PO mở màn Danh mục dụng cụ kiểm xem có nút nhập.

### Quyết định PO 2026-11-09 `[SSOT]`
1. Nơi nhận khi cấp phát: thêm phòng mổ/bàn mổ cùng với khoa, quét nhiều bộ rồi chốt một lần → lát riêng cần làm (bước 5).
2. Mỗi trạm chỉ cần ghi người làm + giờ bắt đầu (không cần giờ kết thúc) → app đã đáp ứng, không làm lát.
3. Cần màn gom «mẻ → khoa + bộ» khi BI dương (chỉ đọc).
4. Chưa có người của tổ chạy thử: hoàn thiện app trước, rồi mới chuyển giao người dùng (bước 8 chờ xong 1–3).
5. Khi app sự cố: bất kỳ ai cũng có thể báo (không cần đầu mối).
Tiến độ lát (2026-11-09): L1 cấp phát chọn nơi nhận (khoa/phòng mổ/bàn mổ = dòng `mdm_dm_khoa_phong`) + quét nhiều bộ + xác nhận một lần: đã code, chưa thử tay. L2 nút «Khoa nhận» ở danh sách mẻ (mẻ → khoa + bộ, chỉ đọc, sao chép để gọi): đã code, chưa thử tay. L3 đo (DB local, 186 quy trình): truy vết mẻ → khoa + bộ chạy 0,25 ms ở tầng DB (`EXPLAIN ANALYZE`, Execution Time 0.251 ms). Thời gian một lần quét qua app (đăng nhập + server action) chưa đo; cần máy thật, ngưỡng < 5 s. Build chưa chạy được trong worktree này vì thiếu `.env.local`. Cần PO tạo dòng «Phòng mổ…/Bàn mổ…» trong Danh mục khoa/phòng.
Bước 10: Claude đo thời gian quét/chuyển trạm trên DB local trước, báo số.
Còn mở: Excel cho BOM (xem trên); ngày xem lại mục 7 (đặt sau khi tổ bắt đầu chạy thử).
