# SO_NO_APPKSNK — Nợ kỹ thuật và việc mở

Sinh từ `scripts/readiness/so-loi.mjs` (2026-11-13). Không sửa tay; chạy lại: `node scripts/readiness/so-loi.mjs status`, `next 100`, `next --tay 20`.

## Tổng quan
```
Sổ lỗi: 112 dòng · mở 6 · đã sửa 90 · lỗi giả 11 · hoãn 5
Module     NGHIEM_TRONG          CAO   TRUNG_BINH         THAP   (đang mở/tổng)
VST_GSC             0/0          0/2          0/3          0/5
CSSD                0/1          0/6         1/10         2/10
NKBV                0/0          0/5         2/11         0/10
QLCV                0/0          0/0          0/5          0/1
DAO_TAO             0/1          0/0          0/8          0/5
QUAN_TRI            0/0          0/2          0/8          0/3
NEN                 0/0          0/2          1/3          0/0

Chờ PO:
  CSSD-017 BI được chấp nhận với thời gian ủ 1 phút và giờ đọc muộn hơn hiện tại; không có ngưỡng ủ tối thiểu
  CSSD-025 cssdCommandFreezeSet không có nơi gọi trên giao diện (mã chết)
  NKBV-023 softDeleteGiamSatNkbvCa ẩn được cả ca đã XAC_NHAN/LOAI_TRU
  NKBV-026 submitClinicalVerification vẫn nhận calculated_doe từ client (chỉ kiểm định dạng) và chấp nhận khoa quy kết có mặt bất kỳ ngày nào trên lưới BA, không phải khoa của ngày DOE (Transfer Rule)
```

## Dòng mở (next 100)
```
NEN-003	TRUNG_BINH	DA_XAC_MINH	VAN_HANH	cssd_incident_void_atomic: prod ghi version 20261110063506, file local là 20261110110000; đẩy prod sẽ chạy lại file	supabase/migrations/20261110110000_cssd_incident_void_atomic.sql	→ CHỜ PO (prod/vận hành)
CSSD-004	THAP	DA_XAC_MINH	DB	Đổi tên 6 bộ vi phẫu chưa đưa vào seed	cssd_dm_bo_dung_cu B01.SET.(09|20), B04.SET.(09|10)	→ SỬA (migration-author)
```

## Kịch bản tay chưa chạy (next --tay 20)
```
CSSD-007	CHUA	TRUNG_BINH	rpc_cssd_cap_phat_commit chấp nhận p_nguoi_cap_phat_id NULL (coalesce giữ NULL) nên tài khoản chưa gắn nhân sự vẫn cấp phát được mà không có người cấp; luồng quét trạm thì chặn trường hợp này
CSSD-008	CHUA	THAP	Luân chuyển và loại biên dụng cụ truyền p_nguoi_thuc_hien_id null khi tài khoản chưa gắn nhân sự; fn_cssd_resolve_ledger_actor (nhánh service_role) trả đúng giá trị fallback null, nên sổ kho thiếu người thực hiện
CSSD-009	CHUA	THAP	Đóng băng thủ công: update is_dong_bang rồi mới ghi ngoại lệ ở chế độ soft; ghi ngoại lệ lỗi thì bộ bị khóa mà không có lý do, không có người thao tác
NKBV-007	CHUA	TRUNG_BINH	updateNkbvViSinhStoreRecord không qua zod: ket_qua và mdro_phenotype không được kiểm lúc chạy; ngay_lay_mau sai định dạng làm new Date().toISOString() ném RangeError chưa bắt.
CSSD-012	CHUA	TRUNG_BINH	releaseSetReconcileDraftAction xóa cứng nháp rà soát bộ theo id không kiểm chủ phiếu
NKBV-013	CHUA	TRUNG_BINH	submitClinicalVerification ghi attributed_khoa_id/calculated_doe từ client vào loa_khoa_id/doe, không đối chiếu lưới ngày-khoa của BA; lệch tử số tỷ lệ theo khoa
DT-016	CHUA	TRUNG_BINH	6 action ghi Thi KSNK (updateMucDoThiThu, updateKyThiThat, setKyThiGan, importMcqMatrixAction, setCauHoiActive, updateCauHoiDaoTao) chỉ verifyPermission edit/import, không qua requireDaoTaoAdmin: vai khách thống kê còn sót grant gọi thẳng Server Action là ghi được
Kịch bản tay: còn 7 · đạt 36
```
