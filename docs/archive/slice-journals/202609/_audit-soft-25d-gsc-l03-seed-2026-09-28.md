# Soft audit — 25d GSC-L03 seed Soft Soft Soft-ready — 2026-09-28

| Soft-ready | **Có** (Domain A) — staged Soft Soft Soft-local, **chưa** apply prod |
| Neo | `25d-GSC-L03-SEED-AB-20260928.md` · file 12 · 16 · `bang-kiem-seed/` |
| Không | invent tiêu chí · seed OUT · sửa Word · commit bắt buộc · prod migrate APPLY |

## Staged Soft Soft Soft-local

| Path | Nội dung |
|------|----------|
| `docs/modules/giam-sat/bang-kiem-seed/` | Catalog 66 + 65 BK json + 1 WHO |
| `scripts/seed-gstt-bang-kiem-from-seed.mjs` | Loader; **he_thong → loai_giam_sat=DANH_GIA_HE_THONG** |
| `src/lib/domain/gsc-lop-giam-sat-filter.ts` | FE picker filter `seed_meta.lop_giam_sat` (16 §6) |

## Residual FE (this beat) — IMPLEMENTED Soft Soft Soft-safe

| DoD | Soft Soft Soft-safe |
|-----|---------------------|
| Picker đọc `lop_giam_sat` / seed_meta | `filterBangKiemByLopGiamSatMode` trong `GscFormView` |
| Hub VST BM.01–03 không lẫn GSC generic | WHO + BM.02/03 (full + short) excluded; `?bk=` vẫn lookup |
| Nội A không hiện QT.02/05/QĐ.01 he_thong | TUAN_THU mode ẩn `he_thong` |

## Load path (exact Soft Soft Soft-safe)

```bash
node scripts/seed-gstt-bang-kiem-from-seed.mjs
# APPLY Soft Soft Soft-local only — KHÔNG prod
# APPLY=1 node --env-file=.env.local scripts/seed-gstt-bang-kiem-from-seed.mjs
```

## Dry-run evidence (prior beat)
- catalog IN=66 · WHO skip=1 · BK upsert-ready=65
- lop BK: thuc_hanh_don_vi 57 · he_thong 7 · hybrid 1

## UAT
1. `/giam-sat-chung/tuan-thu`: không QT.02/05/QĐ.01; không WHO/BM.02/03 generic.
2. `/giam-sat-chung/he-thong`: chỉ lớp he_thong (sau seed APPLY Soft Soft Soft-local).
3. VST hub `?bk=BM.07.02` vẫn mở form (lookup).
