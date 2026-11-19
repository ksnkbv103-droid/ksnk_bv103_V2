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
