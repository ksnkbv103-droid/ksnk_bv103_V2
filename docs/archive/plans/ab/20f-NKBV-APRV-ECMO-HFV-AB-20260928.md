# 20f — NKBV APRV / ECMO / HFV day-level VAE (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §C.4 / C.4.10.1 · **G.1#2** `[PO xác nhận]`; Soft audit park #10; backlog **NKBV-L06** P1 |
| Tip | `evaluateVaeVapCore` — stub **`NO_EVENT` cả ngày** khi flag ECMO/APRV |
| Trạng thái | **Domain chốt A** + PO G.1#2; thiếu extract Ch.10 → Soft **park** sau RIT/age/Transfer/SSI |
| Ưu tiên | #6 theo park order A |

## §1. Lock SSOT

VAE: **loại ngày ECMO/HFV trọn ngày** khỏi dải VAC; **APRV chỉ FiO₂** (không PEEP tương đương) theo Ch.10.  
Tip stub `NO_EVENT` whole day = conservative miss (mất VAC hợp lệ ngày không ECMO).

## §2. Ba phương án

| | A — Day-level exclude + APRV FiO₂-only (khuyến nghị) | B — Giữ stub NO_EVENT (conservative miss) | C — Bỏ carve-out |
|---|-----------------------------------------------------|--------------------------------------------|------------------|
| Hành vi | ECMO/HFV full-day out of baseline/worsening stretch; APRV dùng FiO₂-only per Ch.10 | Giữ stub cả episode/ngày có flag | Tính PEEP mọi mode; không exclude |
| Đúng Ch.10 | Khớp protocol | An toàn quá mức / mất ca | Lệch APRV/ECMO |
| Tip | Đổi VAC stretch + vent-day grid | Zero | Sai |
| Kiểm chứng | Spec ngày ECMO giữa stretch | Dễ | Không |

**Phản biện A:** partial-day ECMO ambiguity — chỉ full-day exclude trừ khi Ch.10 nói rõ hơn (cite extract).  
**Phản biện B:** under-detect VAC — tạm park, không end-state.  
**Phản biện C:** lệch G.1#2 / Ch.10 — cấm.

**Chốt Domain = A** với **PO G.1#2**. Loại C. Loại B chỉ tạm.

## §3. DoD mỏng Soft

1. Day-level: ngày ECMO/HFV **full** → không vào VAC baseline/worsening stretch.
2. APRV: worsening **FiO₂-only**; **không** PEEP-equivalent.
3. Bỏ stub `NO_EVENT` whole-day khi đã có day-level carve-out.
4. **Không invent** ngưỡng ngoài Ch.10. Extract Ch.10 thiếu/unverified → Soft **park L06** sau xong RIT · age-null · Transfer · SSI deepest (20a–d); hỏi PO G.1#2.
5. Spec: ECMO giữa stretch → ngày đó out; APRV FiO₂ đủ → VAC; không đụng MBI/RIT trong lát.

## §4. Thứ tự Soft

Park L06 đến khi: L01–L04 sẵn sàng **và** (extract Ch.10 verified **hoặc** PO G.1#2 chốt số/rule). Không nhảy trước RIT/age/Transfer/SSI.
