> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/giam-sat/README.md`](../../../modules/giam-sat/README.md) · KPI [`modules/dashboard/metric-dictionary.md`](../../../modules/dashboard/metric-dictionary.md). Tra cứu lịch sử được.

# VST % KPI — reaudit công thức + FE fix (2026-09-07)

> Máy: Mac BV103 · Path: `/Users/drnghia/Desktop/ksnk_bv103`  
> **LOCAL ONLY** — không commit/push  
> Liên quan: `_agent-vst-tuan-thu-audit-20260907.md` (bản đồ module)

---

## 1. Vì sao sai (P0)

RPC `rpc_dashboard_vst_strategic_analytics` (migration `20260610060000_vst_strategic_rpc_fact_inline.sql`) tính **4 mẫu số khác nhau**:

| Chỉ số | Tử số | Mẫu số đúng (RPC) | Ý nghĩa |
|--------|--------|-------------------|---------|
| % tuân thủ | `da_tuan_thu` | `tong_co_hoi` | Trong mọi cơ hội quan sát, bao nhiêu lần rửa/chà tay |
| % đúng kỹ thuật | `dung_ky_thuat` | **`da_tuan_thu`** | Trong các lần **đã tuân thủ**, bao nhiêu đúng kỹ thuật |
| % đủ thời gian | `du_thoi_gian` | **`da_tuan_thu`** | Trong các lần **đã tuân thủ**, bao nhiêu đủ thời gian |
| % lạm dụng găng | `lam_dung_gang` | **`bo_sot`** | Trong các lần **bỏ sót**, bao nhiêu lạm dụng găng |

**FE cũ (bug):** `normalizeVstStrategicPercents` chia cả đúng KT / đủ TG / lạm dụng găng cho `tong_co_hoi`.  
KPI «Đúng kỹ thuật» trong `VstStrategicAnalyticsPanel` cũng `formatPercent1FromRatio(..., tong_co_hoi)`.

**Hệ quả:** khi tuân thủ thấp, % chất lượng bị kéo xuống giả (ví dụ 2/2 đúng KT trên 10 cơ hội → FE cũ hiện **20%** thay vì **100%**). Lạm dụng găng cũng bị pha loãng theo tổng cơ hội thay vì chỉ trên mẫu bỏ sót.

---

## 2. Công thức đúng (tiếng Việt)

1. **% tuân thủ** = số đã tuân thủ ÷ tổng cơ hội quan sát  
2. **% đúng kỹ thuật** = số đúng kỹ thuật ÷ số đã tuân thủ  
3. **% đủ thời gian** = số đủ thời gian ÷ số đã tuân thủ  
4. **% lạm dụng găng** = số lạm dụng găng ÷ số bỏ sót  

Làm tròn **1 chữ số thập phân** phía FE (`rateFromTotals` / `formatPercent1FromRatio`) — không tin `ROUND` từ RPC.

---

## 3. Đã sửa

| File | Thay đổi |
|------|----------|
| `src/lib/analytics/vst-analytics-data.ts` | `normalizeVstStrategicPercents`: đúng KT & đủ TG ÷ `da_tuan_thu`; lạm dụng găng ÷ `bo_sot` |
| `src/lib/analytics/vst-analytics-data.spec.ts` | Thêm case mẫu số chất lượng + fallback khi mẫu = 0 |
| `src/modules/giam-sat-vst/components/VstStrategicAnalyticsPanel.tsx` | KPI «Đúng kỹ thuật» dùng mẫu `da_tuan_thu` |

Panel hiện chỉ hiện KPI «Đúng kỹ thuật» trong hàng «Xem thêm» (không hiện đủ TG / găng trên UI) — nhưng normalize payload đã khớp RPC cho cả bốn tỷ lệ nếu chỗ khác đọc `kpis.ty_le_*`.

---

## 4. GSC tuân thủ — verify nhẹ

- `normalizeGscStrategicPercents` / panel GSC: **% = `tong_dat` ÷ `tong_quan_sat`** (tiêu chí áp dụng), 2 chữ số — **đúng**, không cùng bug mẫu số VST.
- `gscCompliancePercentFromCounts` SSOT cho matrix / trend / gap.

Không sửa runtime GSC trong pass này.

---

## 5. UI declutter

Không cắt thêm KPI/layout trong pass này: hàng KPI đã nằm trong `<details>Xem thêm>`; chỉ sửa mẫu số «Đúng kỹ thuật». Declutter lớn hơn (chrome lịch sử trùng ModeNav, `?loai=`…) vẫn theo audit P1 trước.

---

## 6. Kiểm thử

- `npx vitest run src/lib/analytics/vst-analytics-data.spec.ts`
- `npx tsc --noEmit` (hoặc script project tương đương)
