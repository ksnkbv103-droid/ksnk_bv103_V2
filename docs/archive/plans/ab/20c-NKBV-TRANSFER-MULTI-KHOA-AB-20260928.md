# 20c — NKBV Transfer đa khoa 24h (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §B.2.5; Soft audit park #6; backlog NKBV-L03 |
| Tip | `nkbv-timeline-math.ts` — mới transfer-day / day-after |
| Trạng thái | **Domain chốt A** — PO xác nhận khi rảnh (không chặn Soft nếu Lead lấy A) |
| Ưu tiên | #3 sau RIT + age-null |

## §1. Lock SSOT

LOA = khoa BN đang nằm vào DOE, trừ Transfer Rule.  
Transfer: DOE = ngày chuyển **hoặc** ngày sau chuyển → khoa **chuyển đi**.  
**Nhiều khoa trong 24 giờ trước DOE** → khoa **đầu ngày trước DOE** (Ch.2).  
Không = «khoa nằm lâu hơn».

## §2. Ba phương án

| | A — Full Ch.2 multi-khoa (khuyến nghị) | B — Chỉ transfer-day/day-after (tip) | C — Longest-stay heuristic |
|---|----------------------------------------|--------------------------------------|----------------------------|
| Hành vi | Nếu ≥2 khoa trong 24h trước DOE → LOA = khoa đầu của ngày lịch trước DOE | Giữ tip hiện tại | Khoa có nhiều ngày nhất |
| Đúng NHSN | Khớp §B.2.5 | Thiếu nhánh multi-khoa | Lệch Transfer Rule |
| Phụ thuộc | `ba_ngay_khoa` đủ | Ít | Sai hệ thống |
| | Thiếu grid → warn (L07), không đoán | | |

**Chốt Domain = A.** Loại B (lệch SSOT). Loại C (cấm cảm tính).

## §3. DoD mỏng Soft

1. Implement multi-khoa 24h trong `nkbv-timeline-math` (+ hydrate Hub).
2. Spec: CC→ICU transfer day=DOE → LOA=CC; ≥2 khoa trong 24h trước DOE → first khoa ngày trước DOE.
3. Grid trống → không gán LOA «im lặng»; warn (khớp L07).
4. Không đụng RIT/MBI trong lát này.

## Nhật ký lát — _audit-soft-nkbv-transfer-20c-2026-09-28.md

# Soft — NKBV Transfer multi-khoa 24h · 20c=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft (RIT 20a + age-null 20b + ensure-chi_tiet **left alone**) |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20c-NKBV-TRANSFER-MULTI-KHOA-AB-20260928.md` DoD §3 · **Domain chốt A** |
| Không | commit / push / PR / Vercel / migrate / RIT / age-null / MBI / SSI / APRV / invent CDC |

## Behavior (DoD §3)

1. **`attributeLocationOfAttribution`** in `nkbv-timeline-math` (+ `calculateCdcMetrics` hydrate path): LOA = khoa BN đang nằm vào DOE, trừ Transfer Rule.
2. **Transfer:** DOE = ngày chuyển hoặc ngày sau → khoa chuyển đi (calendar day).
3. **Multi-khoa 24h:** ≥2 khoa chạm cửa sổ lịch `[ngày trước DOE … DOE]` → LOA = **first khoa** overlapping ngày lịch trước DOE (**không** longest-stay).
4. **Grid trống / không khớp DOE** → `attributedStay=null` + warn reason (L07); Hub empty `locationDays` clears synthetic stay; no silent `khoa_ghi_nhan` fallback on submit.
5. **Không đụng** RIT / age-null / MBI / SSI / APRV trong lát này.

## Files

- `lib/nkbv-timeline-math.ts` — `attributeLocationOfAttribution` + wire `calculateCdcMetrics`
- `lib/nkbv-timeline-math.spec.ts` — multi-khoa / empty-grid / no silent last-stay / DOE+2 ICU
- `components/NkbvClinicalChecklistModal.tsx` — Hub `locationDays=[]` → `setTreatmentHistory([])`
- `components/useNkbvChecklistModalState.ts` — bỏ silent default single-stay; submit LOA không fallback khoa ghi nhận
- `components/NkbvStayHistoryTable.tsx` — empty grid amber warn LOA
- `components/NkbvCdcMetricsPanel.tsx` — amber warn khi `attributedStay` null
- DoD mirror `docs/modules/nkbv/20c-NKBV-TRANSFER-MULTI-KHOA-AB-20260928.md`

## Spec / UAT

- Vitest `nkbv-timeline-math.spec.ts` (+ ba-ngay / ba-grid-engine): **57** pass; `tsc --noEmit` clean.
- UAT: CC→ICU DOE=ngày chuyển → LOA=CC; DOE+2 → ICU; A→B→C trong 24h lịch trước DOE → first khoa ngày trước DOE; lưới trống → «Chưa xác định» + warn, không KPI khoa giả.

## Domain ask

- **None for 20c** (Domain A already). Soft next = **SSI deepest 20d**.
- Park còn lại: MBI ANC · APRV/ECMO.
