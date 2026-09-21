# BV103 — Kế hoạch toàn hệ (plan hiệu lực)

> ✅ **PLAN HIỆU LỰC TOÀN HỆ (2026-09-18)** — file này + giám sát [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) + rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md).  
> Baseline code: `origin/main` ≥ `f5ba649`.  
> Các `BV103-KE-HOACH-TOI-UU` / CLEANUP-WAVE plan cũ: **SUPERSEDED** (giữ lịch sử).

## Nguyên tắc

1. Một việc → một cửa chính (cửa khác chỉ deep-link).
2. Một chỉ số → một công thức (`metric-dictionary` + `supervision-percent`; GSC 2 dp, VST 1 dp).
3. UI → Action → `verifyPermission` → DB; DB additive only.
4. Không gộp VST+GSC; không CCS điều hành; không QLCV trên thống kê; không sự cố trong shell quy trình.
5. Action board **A**: fold-0 / BCTH deep-link **một lens** (TGS hoặc KSNK), cấm dual %.

## Wave (trạng thái sẽ cập nhật sau lần chỉnh 2026-09-18)

| Wave | Nội dung | Trạng thái |
|------|----------|------------|
| W0 | Migrate `cssd_catalog_de_nghi` (+ MIXED); GSC ROUND-2 | **Xong prod** 2026-09-18 (`cssd_catalog_de_nghi`, `_batch`; ROUND-2 sẵn) |
| W1 | Hub 2 CTA · ModeNav · Action board A | **Xong** (hub/ModeNav sẵn; board gắn fold-0) |
| W2 | VST chrome tách · percent SSOT BCTH | **Xong** local 2026-09-18 |
| W3 | CSSD cửa tách bạch (đã ship đề nghị/su-co) | UAT Nghĩa |
| W4 | Auth hub / docs hygiene | Docs SSOT **xong**; Auth UAT Nghĩa |
| W5 | Perf lazy accordion / pagination | Sau UAT |

## Cổng SSOT khi sửa code

- `docs/ssot-map.md` · `docs/modules/dashboard/metric-dictionary.md`
- CSSD: `docs/modules/cssd/` · NKBV: `docs/modules/nkbv/`

*Local-first · commit/Vercel khi Nghĩa lệnh.*
