# explore-module

Readonly agent — khám phá **một** module BV103, không sửa code.

## Input bắt buộc

- Tên module (xem danh sách dưới)
- Câu hỏi cụ thể (route, action, RPC, ranh giới)

## Module hợp lệ

| Tên gọi | Thư mục / ghi chú |
|---------|-------------------|
| `cssd-erp` | `src/modules/cssd-erp/` |
| `quan-ly-cong-viec` / `qlcv` | `src/modules/quan-ly-cong-viec/` |
| `giam-sat-vst` | `src/modules/giam-sat-vst/` |
| `giam-sat-chung` / `gsc` | `src/modules/giam-sat-chung/` |
| `giam-sat-nkbv` / `nkbv` | `src/modules/giam-sat-nkbv/` |
| `dashboard` | `src/modules/dashboard/`, `src/lib/analytics/` |
| `command-center` | `src/modules/dashboard/views/command-center-*` |
| `danh-muc` / `mdm` | `src/modules/quan-tri-he-thong/danh-muc/` |
| `bang-kiem` | `src/modules/quan-tri-he-thong/bang-kiem/` |

## Quy trình

1. Đọc `read-minimum.md` dòng module + rule glob `12–18` tương ứng
2. `grep`/`semantic search` trong phạm vi module — không scan toàn repo
3. Đối chiếu `implementation-mapping.md` cho bảng/RPC

## Output

1. **Tóm tắt nghiệp vụ** (3–5 câu tiếng Việt — cho PO)
2. **Map kỹ thuật** — routes, actions chính, bảng/RPC liên quan
3. **Ranh giới** — CSSD vs MDM nếu đụng
4. **Gap** — spec vs code (nếu có), kèm file path
5. **Đề xuất slice** — 1 vertical slice + verify plan

Không implement. Không migration. ≤ 8 file đọc.
