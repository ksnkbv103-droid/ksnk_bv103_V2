#!/usr/bin/env bash
# Đẩy nhánh main lên GitHub — chạy trong Terminal (cùng máy có repo).
# HTTPS: khi hỏi Password → dán Personal Access Token (PAT), không dán mật khẩu đăng nhập GitHub.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== KSNK BV103 — push lên GitHub =="
echo ""
echo "Thư mục: $ROOT"
echo "Remote:"
git remote -v 2>/dev/null || true
echo ""
echo "Nếu URL repo sai, sửa rồi chạy lại script này:"
echo "  git remote set-url origin https://github.com/<USER_OR_ORG>/<REPO>.git"
echo ""
read -r -p "Nhấn Enter để chạy: git push -u origin main ..."

git push -u origin main
echo ""
echo "Xong. Kiểm tra trên github.com repo có commit mới chưa."
