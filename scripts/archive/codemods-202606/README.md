# One-off codemods (archived 2026-06)

Script chạy **một lần** khi refactor UI/table naming — không nằm CI.

| File | Mục đích |
|------|----------|
| `add-panel-chrome-imports.mjs` | Thêm import panel chrome CSSD (Done G-14) |
| `codemod-module-table-names.mjs` | Đổi tên bảng compat → prefix module |
| `fix-typo-drift.mjs` | Sửa typo drift hàng loạt |
| `check-doc-links.sh` | **Obsolete** — thay bằng `npm run docs:links:check` |
| `push-origin-main.sh` | Helper push thủ công — dùng `git push` trực tiếp |

Không chạy lại trừ khi biết rõ diff cần reproduce.
