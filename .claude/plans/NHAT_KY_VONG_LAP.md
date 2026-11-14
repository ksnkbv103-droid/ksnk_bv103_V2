# Nhật ký vòng lặp /chay-lien-tuc

Một dòng mỗi vòng: ngày giờ · module · ID · phương án chọn (điểm) · verify · kết quả.

- 2026-11-14 · NEN · NEN-003 · không sửa được ở local (lệch version migration trên prod) · — · CHO_PO, mặc định: `migration repair` trước lô prod
- 2026-11-14 · CSSD · CSSD-004 · A: migration UPDATE theo mã, chỉ khi tên lệch (40đ) thắng B: file seed rời không nằm trong chuỗi nào (35đ); phản biện «ghi đè tên prod đã sửa tay» → chỉ 6 mã, tên đích PO đã chốt · thử trong transaction: 2 lệch → 0, rollback; local 0 lệch · 2997a33a
- 2026-11-14 · NKBV · NKBV-027/028/029 · agent rà luồng DOE→LOA→tỷ suất báo 3 Trung bình; kiểm lại: 2 lỗi giả (RPC đã COALESCE JSON; UNIQUE ma_benh_an), 1 hạ Thấp (không mất số liệu) → HOAN · sạch, không có commit mã
- 2026-11-14 · DAO_TAO · DT-017 · rà luồng làm bài: đáp án không lộ, chấm ở server, IDOR/RLS/giới hạn lượt thi thật đều đúng; 1 mục Thấp (thi thử không trần) SSOT im → HOAN · sạch, không có commit mã
- 2026-11-14 · QLCV · (không ghi sổ) · agent báo 2 Trung bình; kiểm lại RPC 20261113100000: (1) form sửa đặt 100% → trạng thái DANG_LAM+pct≥100 chính là cổng chờ nghiệm thu theo RPC, vẫn cần người khác nghiệm thu, nên không bỏ qua kiểm soát; (2) SET_TRANG_THAI chỉ ADMIN, bắt lý do, ghi nhật ký, đã chặn HOAN_THANH/CHO_DUYET sai loại, CHECK chặn mã lạ → 2 mục là lỗi giả/Thấp · sạch, không có commit mã
