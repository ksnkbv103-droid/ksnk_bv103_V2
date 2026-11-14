# Nhật ký vòng lặp /chay-lien-tuc

Một dòng mỗi vòng: ngày giờ · module · ID · phương án chọn (điểm) · verify · kết quả.

- 2026-11-14 · NEN · NEN-003 · không sửa được ở local (lệch version migration trên prod) · — · CHO_PO, mặc định: `migration repair` trước lô prod
- 2026-11-14 · CSSD · CSSD-004 · A: migration UPDATE theo mã, chỉ khi tên lệch (40đ) thắng B: file seed rời không nằm trong chuỗi nào (35đ); phản biện «ghi đè tên prod đã sửa tay» → chỉ 6 mã, tên đích PO đã chốt · thử trong transaction: 2 lệch → 0, rollback; local 0 lệch · 2997a33a
- 2026-11-14 · NKBV · NKBV-027/028/029 · agent rà luồng DOE→LOA→tỷ suất báo 3 Trung bình; kiểm lại: 2 lỗi giả (RPC đã COALESCE JSON; UNIQUE ma_benh_an), 1 hạ Thấp (không mất số liệu) → HOAN · sạch, không có commit mã
- 2026-11-14 · DAO_TAO · DT-017 · rà luồng làm bài: đáp án không lộ, chấm ở server, IDOR/RLS/giới hạn lượt thi thật đều đúng; 1 mục Thấp (thi thử không trần) SSOT im → HOAN · sạch, không có commit mã
- 2026-11-14 · QLCV · (không ghi sổ) · agent báo 2 Trung bình; kiểm lại RPC 20261113100000: (1) form sửa đặt 100% → trạng thái DANG_LAM+pct≥100 chính là cổng chờ nghiệm thu theo RPC, vẫn cần người khác nghiệm thu, nên không bỏ qua kiểm soát; (2) SET_TRANG_THAI chỉ ADMIN, bắt lý do, ghi nhật ký, đã chặn HOAN_THANH/CHO_DUYET sai loại, CHECK chặn mã lạ → 2 mục là lỗi giả/Thấp · sạch, không có commit mã
- 2026-11-14 · QUAN_TRI · (không ghi sổ) · rà cổng quyền 30+ action phân quyền/tài khoản/danh mục: 3 file không thấy guard là helper nhận client (không "use server"), phiếu danh mục có requireCssdCatalogApprove, form công khai có chặn dồn ACC-1 (PO quyết không captcha) · sạch, không có commit mã
- 2026-11-14 · NEN · (không ghi sổ) · trace M01: R1.23 (khóa sổ kỳ) đã cài ở vst-write-save-session.actions.ts:169 nhưng thiếu mã dẫn → thêm chú thích @dac-ta (R 3→4/40); R1.01/R1.02/R1.04/R1.06 cần bảng mới (ke_hoach_khoa, qsv_nang_luc) thuộc kế hoạch xây lõi, không làm trong vòng này · tsc pass
- 2026-11-14 · VST_GSC · (không ghi sổ) · đối chiếu R1.07 với mã: server đã chặn đủ (enum thời điểm 1–5, ≥1 chỉ định, trần ≤2 theo khóa PO) tại giam-sat-vst.validations.ts, không lệch khóa PO → chỉ thêm mã dẫn (R 4→5/40) · tsc + vitest validations 59 pass
