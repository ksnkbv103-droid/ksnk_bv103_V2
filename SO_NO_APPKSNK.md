# SO_NO_APPKSNK — Nợ kỹ thuật và việc mở

Mọi lỗi và việc mở nằm ở sổ lỗi: `node scripts/readiness/so-loi.mjs status | next 10 | stats`. Câu cần PO nằm ở [`CAU_HOI_PO_APPKSNK.md`](CAU_HOI_PO_APPKSNK.md). File này chỉ giữ bảng phân loại một lần và mục ghi nhận mới. Bản trước khi phân loại: `git show 3312cfe8:SO_NO_APPKSNK.md`.

## Phân loại 19/11 (PO duyệt «Đồng ý»; số = số dòng ở bản `3312cfe8`)

- **Chuyển vào sổ lỗi:**
  - 43→NEN-007 · 44→CSSD-038 · 65→CSSD-039 · 66→NEN-008 · 67→VST-036 · 68→VST-037 · 69→VST-038
  - 70, 99→VST-041 · 71→NKBV-049, NEN-010
  - 75→CSSD-040 · 76→CSSD-046 · 77→CSSD-041 · 78→CSSD-047 · 81→CSSD-042 · 82→CSSD-048 · 83→CSSD-043 · 84→CSSD-049 · 85→NEN-011
  - 86→QT-015 · 87→VST-039 · 88→QT-016, VST-040 · 89→QT-017, QT-018, NEN-009, NEN-010 · 90→CSSD-044
  - 94, 95, 104, 58c→NEN-012 · 98→NKBV-048 · 103→CSSD-045 · 58b→DT-018 · 47→VST-043 (TC09), VST-042
- **Đã xong từ trước:** 48, 49, 50, 56, 57, 79, 96, 58a, 58d.
- **Xử lý bằng `.gitignore`:** 92 (`/.next-measure/`).
- **Đóng «không làm»**, vì là nợ công cụ không chặn verify:
  - 45, 46, 51–55, 59, 60 (phần đuôi), 61 (phần đuôi), 62–64;
  - 88 (phần master-crud-core), 89 (phần `rules/mdm.md`);
  - 91, 93, 97, 100–102, 105, 106.
  - Mục mở lại khi nó làm verify đỏ.
- **Dữ liệu UAT local:** 80 (B99). Khi cần, dọn bằng `node scripts/uat-cleanup.mjs`.

## Ghi nhận ngoài lát (một dòng mỗi mục: `file:dòng — vấn đề`; phân loại vào sổ ở lần kế)
- `supabase/migrations/20261119110000_cssd_039_khoa_su_co_ghi_giao_dich.sql:182-193` — void sự cố không khóa dòng phiếu ngược đang bị tắt `is_active` cùng lúc; rủi ro rất thấp (review-bv103 19/11, Minor).
- `supabase/migrations/20261119110000_cssd_039_khoa_su_co_ghi_giao_dich.sql:56` — phiếu NHẬP có `su_co_id` vẫn lọt vào sự cố đã hủy; app hiện không gửi trường này (review-bv103 19/11, Minor).
- `scripts/db-dung.sh:137` — bước chờ chỉ curl `/login`, không kiểm `next start` của chính script còn sống: cổng 3100 có server mồ côi (SIGKILL lần trước) thì e2e chạy trên build cũ, có thể xanh giả. Sửa 1 dòng: `kill -0 "$E2E_PID"` sau vòng chờ, hoặc kiểm cổng trống trước khi start (review-bv103 Lát 1c, Minor).
- `scripts/db-dung.sh:142-143` — `${E2E_USER_EMAIL:-…}` nhận tài khoản có sẵn trong shell; và `next build/start` local còn nạp `.env.local` (`KSNK_PILOT_FOUR_MODULES`, `KSNK_BREAK_GLASS_EMAILS`) mà CI không có, nên xanh local chưa chắc xanh CI. Sửa: luôn gán tài khoản seed, unset hai biến trong bước 7 (Minor).
- `.github/workflows/db-dung.yml:41` — chưa cache `~/.cache/ms-playwright`; `npm ci` + `next build` + e2e làm job dài thêm, theo dõi trần `timeout-minutes: 30` sau lần chạy CI đầu (Minor).
- `e2e/gsc-vst-supervision.spec.ts:35,76` — `toHaveCount(0)` qua ngay khi thấy chữ «Tỷ lệ tuân thủ»; panel tải chậm báo lỗi sau đó thì lọt (có từ trước Lát 1c).
- `src/lib/offline-pending-supervision-save.ts:142` — lỗi khu vực («Khu vực không thuộc danh mục cho phép của khoa đã chọn.» / «Khu vực giám sát không tồn tại trong danh mục.») không tính là lỗi vĩnh viễn → bảng kiểm trong hàng đợi offline (localStorage) thử lại mãi; `SupervisionOfflineSyncListener` không có nút hủy. Gặp thật 20/11 sau khi ngừng 13 khu vực ngày 12/11. Sửa an toàn: nút «Hủy bảng kiểm này» có xác nhận, hiện khoa/khu vực/giờ; không thêm thẳng vào `isPermanentSupervisionFlushError` vì sẽ âm thầm bỏ dữ liệu của mọi người (Major).
