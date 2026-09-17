# Phase C — Đối chiếu % form · lịch sử · in · thống kê

**Ngày:** 2026-09-17 · **PO:** Nghĩa · **LÁT:** C (code verify)  
**SSOT:** `docs/modules/dashboard/metric-dictionary.md` · engine `src/lib/domain/giam-sat-scoring.ts` · UI `%` `src/lib/analytics/supervision-percent.ts`

## Ma trận C1 (GSC)

| Surface | Nguồn % | Làm tròn | Code verify |
|---------|---------|----------|-------------|
| Form preview | `previewGscFormProgress` → `computeScore` / `scoreTyLe` | 2 chữ số (`formatPercent2`) | PASS (vitest) |
| Lịch sử | `tong_dat / tong_quan_sat` (view live từ `results_jsonb`, loại NA) → `gscCompliancePercentFromCounts` | 2 | PASS |
| Bản in phiếu | `formatPercent2FromRatio(DAT, evaluable)` | 2 | PASS (cùng công thức counts) |
| Thống kê `/thong-ke/gsc` | `formatPercent2FromRatio(kpis.tong_dat, tong_quan_sat)` | 2 | PASS |
| BCTH KPI | `gscCompliancePercentFromCounts(gsc_dat, gsc_tong)` | 2 | PASS |
| BCTH KPI card UI | `formatPercent2(ty_le_gsc)` | 2 | FIXED 2026-09-17 |

**Công thức:** `% = round(Đạt / (Đạt+Không đạt) × 100, 2)` · **NA ngoài mẫu số** · Nhật ký không hiện %.

## C2 (VST)

| Surface | Nguồn | Làm tròn |
|---------|-------|----------|
| Lịch sử / in / thống kê | `da_tuan_thu / tong_co_hoi` + `classifyVstAction` (WHO: rửa nước / cồn = tuân thủ) | 1 chữ số (`formatPercent1`) |

Code path thống nhất PASS. **UAT tay 1 phiên** vẫn để Nghĩa (pilot V1).

## C3 Snapshot

`gsc-bang-kiem-snapshot.spec.ts` + `gsc-score-display` (ưu tiên `cach_tinh_diem` trong snapshot) — chạy lại PASS.

## C4 Pilot tay

Checklist `docs/modules/giam-sat/pilot-checklist-202606.md` G1–G5, V1–V3 → **Chờ Nghĩa ký PASS** trên localhost.

## Gap còn lại (không sửa SQL trong lát này)

Nhiều RPC SQL vẫn `ROUND(..., 1)` cho GSC (`ty_le_tuan_thu` trong compare matrices / checklist analytics).  
**App** đã ưu tiên đếm + `formatPercent2` ở KPI/thống kê chính. Khi Nghĩa ra lệnh migrate: đổi ROUND GSC → **2** cho khớp metric-dictionary.

## Việc Nghĩa

1. UAT tay 1 phiếu GSC: form % = in % = lịch sử % = ô thống kê (cùng BK/kỳ/khoa).  
2. UAT 1 phiên VST: cơ hội / tuân thủ / % trên lịch sử–in–thống kê.  
3. Ký pilot G1–G5 + V1–V3.  
4. (Tuỳ chọn) «commit» khi H2+P.A+C ổn.
