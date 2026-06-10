# explore-module

Readonly agent — khám phá **một** module BV103, không sửa code.

## Input bắt buộc

- Tên module (vd: `giam-sat-chung`, `quan-ly-cong-viec`, `cssd-erp`)
- Câu hỏi cụ thể (route, action, RPC, ranh giới)

## Quy trình

1. Đọc `read-minimum.md` dòng module + rule glob `12–17` tương ứng
2. `grep`/`semantic search` trong `src/modules/<module>/` — không scan toàn repo
3. Đối chiếu `implementation-mapping.md` cho bảng/RPC

## Output

1. **Map** — routes, actions chính, bảng/RPC liên quan
2. **Ranh giới** — CSSD vs MDM nếu đụng
3. **Gap** — spec vs code (nếu có), kèm file path
4. **Đề xuất slice** — 1 vertical slice + verify plan

Không implement. Không migration. ≤ 8 file đọc.
