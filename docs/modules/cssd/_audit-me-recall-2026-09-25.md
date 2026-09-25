# Rà soát phiếu mẻ + thu hồi — 2026-09-25

Tip đồng bộ: `cursor/me-sync-recall-print` @ `883f697` (+ patch nhãn UI / domain-overview trong commit sau).

Nguồn chuẩn: `docs/modules/cssd/me-s2-batch-qc-release.md`, `me-s3-batch-recall-trace.md`, AB Lead (fail→Tiếp nhận, implant BI hard-block, BI+ cửa sổ, Plasma/EO chờ BI−).

## Đồng bộ

| Mặt | Trạng thái |
|-----|------------|
| Mac tip | `cursor/me-sync-recall-print` = origin |
| ME-S1…S5 + S-A + S-B + in thu hồi | Có trên tip |
| Migrate remote | **Chưa** — file `20260925090000`→`20260925150000` chỉ local |

## Khớp chuẩn (giữ)

1. **Một RPC** `rpc_cssd_me_thu_hoi` — mẻ + bộ + sự cố cùng transaction.
2. **Không đạt / BI+** → đóng chu kỳ cũ (`is_active=false`, giữ `lo_tiet_khuan_id`), mở chu kỳ mới **Tiếp nhận**, không gắn mẻ.
3. **Đã dùng lâm sàng** (`ma_ca_mo_id`) → chỉ liệt kê `RECALL_LISTED_USED`, không đổi trạm.
4. **BI+ cửa sổ** cùng máy: sau BI âm gần nhất → hết mẻ dương; mẻ khác trong cửa sổ → `THU_HOI`.
5. **In phiếu mẻ** sau thu hồi: đếm mọi chu kỳ còn `lo_tiet_khuan_id`; cột hướng xử lý (`xuLyLabel`).
6. **In biên bản sự cố**: bảng A về Tiếp nhận + bảng B đã dùng (`parseRecallMemberListText`).
7. **Filter phương pháp + gỡ bộ đang nạp** (ME-S5).
8. View `v_cssd_quy_trinh_full` **không** lọc `is_active` → in vẫn thấy chu kỳ đóng.

## Lệch / nợ đã xử lý trong lần này

| Mức | Vấn đề | Hướng chuẩn | Xử lý |
|-----|--------|-------------|-------|
| P1 | UI hiện mã `QT.24` (gate «không mã QT trên UI») | Bỏ mã, giữ nghĩa | Sửa `IncidentReportModal`, `SuCoBaoCaoPage` |
| P1 | `domain-overview` §5.3 còn «rollback Đóng gói» | Khớp ME-S3 → Tiếp nhận | Sửa docs |
| P0 ops | Migrate ME chưa apply | UAT nhả/thu hồi/gỡ cần migrate | **Chờ Nghĩa lệnh** |

## Không sửa (đúng ME-S3 / ngoài scope)

- Overview cũ «wet pack → LAM_SACH» vs thu hồi mẻ về TN rồi xử lý lại từ đầu chuỗi — giữ TN làm cửa vào (ME-S3); wet pack đơn lẻ vẫn có thể đi sự cố bộ.
- BI+ kéo mẻ đang nạp trong cửa sổ — đúng SSOT cửa sổ máy.
- Không merge stack G-P0 Đóng gói vào tip ME.

## Checklist UAT (sau migrate)

1. Nạp → chốt → QC không đạt → bộ về TN, sự cố PROCESS, In phiếu mẻ có cột hướng xử lý.
2. Nhả hơi nước → BI+ → cửa sổ máy; bộ chưa dùng về TN; bộ có ca mổ chỉ liệt kê; In biên bản A+B.
3. Đang nạp: filter sai phương pháp biến mất khỏi list; gỡ bộ khỏi phiếu.
4. Không thấy mã QT trên modal/trang thu hồi.
