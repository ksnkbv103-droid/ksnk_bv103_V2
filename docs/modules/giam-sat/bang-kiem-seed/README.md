# bang-kiem-seed — nguồn seed giám sát (DRAFT docs)

| Trường | Giá trị |
|--------|---------|
| Mục đích | Chuẩn bị catalog + tiêu chí bảng kiểm / WHO để **sau này** load `gstt_dm_bang_kiem` (+ tiêu chí) |
| Phạm vi | Inventory filtered file `12` · Drive folder KSNK_final · extract `/workspace/ipc-updated/QT|QD/` |
| **DB** | **CHƯA load** — không migration, không insert, không Cursor Cloud UI |
| Trạng thái | `draft_from_qt` / `po_in_scope_missing_form` / `who_moments_file` |
| Ngày | 2026-09-22 (Asia/Saigon) |
| PO | **Nghĩa chốt 2026-09-22** — cả 15 BM `pending_po`/`can_po` → digital=`co` (đồng bộ QT) |

## Họ form (domain lock)

| Họ | Dùng cho | Schema đánh giá | File |
|----|----------|-----------------|------|
| **WHO** | Chỉ VST thường quy `KSNK.QT.07.BM.01` | Lưới 5 thời điểm + hành động C/N/K | `who/KSNK.QT.07.BM.01-moments.json` |
| **BK** | GSC + VST ngoại khoa (BM.03) + mọi BK tiêu chí | `DAT` / `KHONG_DAT` / `KHONG_AP_DUNG` · `cach_tinh_diem=DAT_TREN_AP_DUNG` | `bk/<ma>.json` |

Sáu chiều phiên (WHO + GSC): `khoa_id` → `khu_vuc_id` → `vi_tri` → `doi_tuong_loai` → `doi_tuong_ten` → `gan_nb` — xem file WHO.

## Map sang DB (sau này)

| Seed file | Bảng / cột dự kiến |
|-----------|-------------------|
| `00-catalog.json` | `gstt_dm_bang_kiem` (mã, tên, loại, chuyên đề, active…) |
| `bk/*.json` → `tieu_chi[]` | `tieu_chi_jsonb` / bảng tiêu chí con |
| `who/*-moments.json` | Module A constants / không vào picker BK |
| `lua_chon` | Enum kết quả tiêu chí GSC |

## Cây thư mục

```
bang-kiem-seed/
  README.md
  00-catalog.json
  01-excluded-index.md
  02-chuyen-de-map.md
  03-gap-vs-canonical36.md
  who/KSNK.QT.07.BM.01-moments.json
  bk/KSNK.QT.*.BM.*.json
  bk/KSNK.QĐ.*.BM.*.json
```

## Counts (lần generate này)

| Hạng mục | Số |
|----------|----|
| Catalog (IN SCOPE) | 66 |
| WHO file | 1 |
| BK json | 65 |
| — có `tieu_chi` filled (từ QT MD / Drive BM phụ lục) | 65 |
| — skeleton `pending_po` | 0 |
| — skeleton `can_po_extract` | 0 |
| — `po_in_scope_missing_form` (digital=co, tieu_chi=[]) | 0 |
| digital=`co` (1 WHO + 65 BK) | 66 |
| OUT excluded (index only) | 69 |

## Gap — PO in scope, thiếu form tiêu chí DAT family

_Không_ — cả 15 đã resolve tiêu chí (hoặc map hạng mục).

## Quy tắc chất lượng

- Chỉ trích tiêu chí khi đọc được từ QT/QĐ MD **hoặc** phụ lục BM trong docx Drive folder `10_190H0LJ…` (Phần 2 bảng tiêu chí).
- Không invent nội dung lâm sàng; bản MD 1.1 local thường chỉ còn tên BM → ưu tiên appendices Drive khi có.
- QĐ phụ lục có sẵn trong `ipc-updated/QD/*.md|docx` (bản 2.x) → dùng local khi Drive pack lệch phiên bản.
- `KSNK.QT.11.BM.01` form giấy = lưới ngày T2–CN; seed map hạng mục công việc → `tieu_chi` DAT family.
- Mirror: `ksnk-domain/bang-kiem-seed/` · `ksnk_bv103_macwork/docs/modules/giam-sat/bang-kiem-seed/` · `/home/box/bang-kiem-seed/`.

## Soft Soft Soft-ready load (25d Domain A — 2026-09-28)

DB vẫn **chưa** load mặc định. Soft Soft Soft-local:

```bash
node scripts/seed-gstt-bang-kiem-from-seed.mjs          # DRY_RUN
APPLY=1 node --env-file=.env.local scripts/seed-gstt-bang-kiem-from-seed.mjs
```

Insert **65 BK** vào `gstt_dm_bang_kiem`; **skip WHO** BM.01 (VST module); **0 OUT**. Không invent tiêu chí.

*PO Soft · Domain — seed assets staged Soft Soft Soft-local. NO prod migrate / NO git commit bắt buộc.*
