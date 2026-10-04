# 20d — NKBV SSI deepest wins (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §C.5 / C.5.3 «sâu nhất thắng»; Soft audit park #8; backlog **NKBV-L04** P1 |
| Tip | `evaluateSsi` / `mapSsiCriteriaFlags` — depth **manual** `ssi_depth` (submit-gate mặc định SUPERFICIAL) |
| Trạng thái | **Domain chốt A** — Soft theo DoD §3; PO xác nhận khi rảnh |
| Ưu tiên | #4 sau RIT · age-null · Transfer |

## §1. Lock SSOT

Khi Superficial + Deep + Organ cùng thỏa trong SP → báo **độ sâu sâu nhất**.  
Organ/Space cần **≥1 tiêu chí site Ch.17** — **không invent** criteria Organ.  
Tip hiện: BA chọn `ssi_depth`; engine không auto deepest → Domain park.

## §2. Ba phương án

| | A — Engine auto deepest + warn (khuyến nghị) | B — Warn only, giữ manual | C — Giữ tip (zero gate) |
|---|-----------------------------------------------|---------------------------|-------------------------|
| Hành vi | `evaluateSsi` chọn sâu nhất trong các tầng **đã met**; nếu user nông hơn → warn UI, kết luận theo engine | Soft warn lệch form; vẫn tin `ssi_depth` user | Không đổi |
| Đúng NHSN | Khớp «sâu nhất thắng» | Under-report nếu BA chọn nông | Lệch SSOT / audit #8 |
| Side-effect | BA bất ngờ đổi depth | Tử số depth sai | Nợ kỹ thuật |
| Tip | Đổi evaluateSsi + map flags | Nhẹ | Zero |

**Phản biện A:** cần map criteria→depth rõ; Organ thiếu Ch.17 **không** nâng Organ.  
**Phản biện B:** audit đã ghi gap — warn không bảo vệ tử số depth.  
**Phản biện C:** không chấp nhận khi L04 P1 đã park.

**So sánh:** đúng Ch.9 · ít silent SUPERFICIAL · kiểm chứng (nông+sâu met → Deep; Organ+Ch.17 → Organ).

**Chốt Domain = A.** Loại B (phụ thuộc BA). Loại C (lệch SSOT).

## §3. DoD mỏng Soft

1. `evaluateSsi` pick **deepest met** depth (Superficial < Deep < Organ-Space).
2. Organ chỉ khi criteria Organ **và** ≥1 site Ch.17 met — **không invent** tiêu chí.
3. User `ssi_depth` nông hơn engine → kết luận engine + warn UI (không silent).
4. Spec: nông+sâu đủ → Deep; Organ thiếu Ch.17 → không Organ; PATOS/SP **không** đụng trong lát.
5. Không đụng RIT / MBI / Transfer trong lát này.

## §4. Ngoài lát

MBI ANC (20e), APRV/ECMO/HFV (20f) = L05/L06 sau L04.
