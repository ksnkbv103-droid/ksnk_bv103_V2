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

## Ghi nhận ngoài lát (2026-11-15, chưa vào sổ lỗi; từ lát CSSD-036)
- `src/components/shared/Header.tsx:72`, `src/components/shared/ClientLayoutWrapper.tsx:118` — header dính `z-50` nằm trên ngăn kéo (`fixed inset-0 z-50` bị nhốt trong `main.relative z-0`) nên phủ ~44 px đầu ngăn kéo; ở viewport 1280 nút «In thẻ kho» (`kho-hoa-chat-drawer.tsx`) không bấm chuột được (`elementFromPoint` trả `NAV`), Tab + Enter vẫn in được.
- `src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx:44-58` — `dmMovs` không bị xóa khi mở mặt hàng khác: ngăn kéo hiện «Chưa có phiếu.» khi mở lần đầu (đã thấy trên :3012) hoặc phiếu của mặt hàng trước (suy từ code, chưa tái hiện) cho tới khi tải xong; bấm «In thẻ kho» lúc đó in sai (suy từ code).
- `.claude/commands/chay-lien-tuc.md:22` — vòng `/loop /chay-lien-tuc` vẫn bảo làm theo `KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` (§7 giai đoạn hiện tại, §3-P3), trong khi bộ 3 file (PO duyệt 2026-11-16) đã thay lộ trình ở `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md` §6.3 và §6.4 ngừng P3/mở rộng; cấu hình luồng đóng băng nên chưa sửa, chờ PO (ghi 2026-11-16, từ lát lưu trữ bản cũ).
- `docs/README.md:8-11` — bảng «Phân lớp» lặp dòng tiêu đề và dòng gạch (dòng 10–11 lặp dòng 8–9); có sẵn, không sửa trong lát xếp lớp (ghi 2026-11-16, từ lát xếp lớp).
- Sau lát bỏ KPI lớp A (2026-11-16, `b13ef7b6`, `b47e4704`, `3e5fafc3`), còn chờ PO: (1) `src/modules/giam-sat-chung/components/GscBkAnalyticsDashboard.tsx:117,122` còn chữ «dưới mục tiêu» (so với ngưỡng cố định, không phải bảng đã DROP); (2) ngưỡng `GREEN_MIN`/`YELLOW_MIN`/`KHOA_WARN_PCT` ở `src/lib/analytics/supervision-thresholds.ts` (bảng `ksnk_dm_tham_so`) giữ làm hệ đèn màu riêng, PO có coi là «mục tiêu KPI» không; (3) `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md:278` (câu 7) ghi «không đụng bảng DB», nay bị quyết định DROP của PO thay thế; (4) lớp B giữ nguyên tên mã: khóa `kpis` trong RPC, `bv103-type-kpi*`, `ve-sinh-tay-kpi.ts`, `ComprehensiveKpiCards`, `VeSinhTayKpiTriptych`, các chữ «KPI» trong docs/bình luận mã.
- Phiên khác đang dở, không thuộc lát bỏ KPI: `src/modules/giam-sat-nkbv/lib/nkbv-loa-server.spec.ts` bị xóa 6 dòng `expect` làm `node scripts/gate-integrity.mjs --base HEAD` FAIL (cần `// gate-ok: <lý do>` hoặc khôi phục), kèm `scripts/gate-integrity.mjs` và `src/modules/cssd-erp/actions/cssd-read.actions.ts` chưa commit (ghi 2026-11-16).
- `scripts/verify-changed.mjs:64-65` — nuốt dòng «miễn N spec xóa nguyên cùng nguồn chết: …» của `scripts/gate-integrity.mjs` khi cổng PASS (nhánh `if (r.status === 0)` chỉ in `PASS <lệnh> (<giây>s)`); cấu hình luồng đóng băng nên chưa sửa (ghi 2026-11-16, từ lát Q13).
- `scripts/gate-integrity.mjs` — 3 điểm yếu có từ trước (phản biện vòng 3): git lỗi hoặc `--base` sai bị coi «0 vi phạm»; đường dẫn có khoảng trắng/không ASCII không quét; file untracked chỉ quét cây con của cwd (ghi 2026-11-16, từ lát Q13).
- `scripts/gate-integrity.mjs` — `diff.noprefix`/`diff.mnemonicPrefix` làm mù bộ đọc header (đề xuất `--src-prefix=a/ --dst-prefix=b/ --no-ext-diff`); đổi tên staged `foo.spec.ts → foo.spec.ts.bak` lọt cổng (đề xuất: kiểm cả đường dẫn cũ khi có `rename from`) (ghi 2026-11-16, từ lát Q13).
- `scripts/gate-integrity.mjs` — chưa có miễn cho việc xóa nguyên một spec khi nguồn chết nằm ở thư mục khác (ngoại lệ Q13 chỉ nhận spec cùng thư mục với nguồn chết), nên việc xóa `src/lib/master-data/instrument-issue-core.spec.ts` (11 dòng `expect(`, PO «Xóa cụm» 2026-11-16, commit `58d9e38d`) bị cổng báo 11 chỗ; cấu hình luồng đóng băng nên chưa sửa (ghi 2026-11-16, từ lát L3c).
