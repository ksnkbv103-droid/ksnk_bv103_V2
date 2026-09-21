# Báo cáo sau chỉnh sửa — Waves toàn hệ (2026-09-18)

> Sau lệnh Nghĩa «chốt tất cả các đợt chỉnh sửa» · Asia/Saigon  
> Baseline trước: `origin/main` = `f5ba649` · Working tree: thay đổi local chưa commit  
> Plan hiệu lực: [`BV103-KE-HOACH-TOAN-HE-20260918.md`](./BV103-KE-HOACH-TOAN-HE-20260918.md)

## 1. Tóm tắt

Đã **chốt phương án** (Action board **A** = 1 lens) và **đóng** phần có thể tự động: migrate prod CSSD đề nghị, chrome VST tách GSC, Action board trên thống kê VST/GSC, chuẩn hóa % BCTH, docs SSOT một cửa. Hub 2-CTA + ModeNav «Nhập/Lịch sử/Thống kê» **đã có sẵn** trên main — không đụng lại. `tsc --noEmit` **sạch**.

## 2. Việc đã làm

### W0 — DB / migrate (prod `ksnk-bv103-prod`)

| Mục | Kết quả |
|-----|---------|
| GSC ROUND 2 dp | Đã có từ trước (`gsc_ty_le_round_2` / `20260917043322`) |
| `cssd_catalog_de_nghi` | **Applied** `20260918013014` — bảng + RLS |
| MIXED batch kind | **Applied** `20260918013033` — CHECK LOAI\|BO\|BOM\|MIXED |

### W1 — UX giám sát

| Mục | Kết quả |
|-----|---------|
| Hub 2 CTA VST·GSC + NKBV «Khác» + quiet Lịch sử/Thống kê | **Đã có** (`GiamSatHubPage`) — giữ |
| ModeNav bỏ «TK» | **Đã có** (mobileLabel = đầy đủ) — giữ |
| Action board A | **Mới:** `SupervisionActionBoard` fold-0 trên `VstStrategicAnalyticsPanel` + `GscStrategicAnalyticsPanel` (một `sourceLens`) |

### W2 — Calc / chrome

| Mục | Kết quả |
|-----|---------|
| VST không import `gscFormChrome` | **Mới:** `vst-form-chrome.ts`; 3 file VST chuyển import |
| % BCTH ad-hoc | CSSD appendix + KPI NKBV + TopicHybrid dùng `formatPercent1` |
| Dead `ComprehensiveDimensionCompare` | **Xóa** (0 importer) |

### W3–W4 — CSSD / docs

| Mục | Kết quả |
|-----|---------|
| CSSD đề nghị/su-co/heat-split | Đã ship trên `f5ba649` — migrate prod vừa bổ sung |
| Docs plan một cửa | **Mới:** `BV103-KE-HOACH-TOAN-HE-20260918.md`; pointer SUPERSEDED trên KE-HOACH-TOI-UU |

## 3. File đụng (local, chưa commit)

- `src/modules/giam-sat-vst/lib/vst-form-chrome.ts` (new)
- `VSTForm.tsx` · `VSTFormView.tsx` · `VstStrategicAnalyticsPanel.tsx`
- `GscStrategicAnalyticsPanel.tsx`
- `ComprehensiveCssdAppendix.tsx` · `ComprehensiveKpiCards.tsx` · `ComprehensiveTopicHybrid.tsx`
- `ComprehensiveDimensionCompare.tsx` (deleted)
- `docs/reference/reports/BV103-KE-HOACH-TOAN-HE-20260918.md` (new)
- `docs/reference/reports/BV103-KE-HOACH-TOI-UU-20260916.md` (pointer)
- Báo cáo này

## 4. Còn lại (cần Nghĩa / lát sau)

| # | Việc | Lý do chưa đóng hết |
|---|------|---------------------|
| UAT | `/cssd-dung-cu` đề nghị · `/cssd-su-co` · Auth xin cấp TK · thống kê Action board | Tay trên localhost / preview |
| W1 U2/U3 | Accordion so sánh / BCTH fold nhẹ hơn nữa | Đã có accordion; tinh chỉnh sâu chỉ khi UAT thấy còn dài |
| W2 C4 | NKBV residual infant map | Cố ý không xóa mù — lát UAT riêng |
| W5 | Lazy-load Nâng cao · pagination catalog | Perf sau UAT |
| Commit / Vercel | — | Chờ lệnh «commit» / «deploy Vercel» |

## 5. Kiểm chứng

- `npx tsc --noEmit` → exit 0  
- Prod migrations: `cssd_catalog_de_nghi`, `cssd_catalog_de_nghi_batch`, `gsc_ty_le_round_2`  
- Không push trong lát này

## 6. Việc Nghĩa

1. UAT localhost các cửa trên.  
2. «commit» (+ «push» nếu muốn) khi chốt FE.  
3. «deploy Vercel» khi muốn lên môi trường chạy.
