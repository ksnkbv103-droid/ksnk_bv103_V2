# 20a — NKBV RIT hard-stop (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft |
| Neo | `10-NKBV-diagnosis-domain-ssot-adult.md` §B.2.6; Soft audit park #2 |
| Phạm vi | LCBI/UTI/PNEU/Ch.17 (có RIT Ch.2). **Không** SSI, **không** VAE |
| Trạng thái | **PO chốt A** 2026-09-28 02:24 +07 — hard-stop evaluate*; Soft/Cloud theo DoD §3 |
| Ưu tiên park | #1 trong gói A (PO 2026-09-28) |

## §1. Lock SSOT (không tranh)

RIT = **14 ngày lịch** từ DOE (DOE = ngày 1). Trong RIT: **không báo ca cùng loại**; giữ DOE/LOA/gắn dụng cụ gốc; thêm tác nhân mới vào ca cũ.

- **Major type** (một RIT chung): BSI (mọi LCBI/MBI), UTI (SUTI/ABUTI), PNEU (mọi PNU).
- **Specific type:** site Ch.17 (SKIN ≠ DECU có thể chồng RIT).
- Tip hiện: grid/kết luận soft; **evaluate* không chặn** → Domain park.

## §2. Ba phương án

| | A — Hard-stop evaluate (khuyến nghị) | B — Cảnh báo + cho lưu | C — Chỉ UI/grid soft (giữ tip) |
|---|--------------------------------------|-------------------------|--------------------------------|
| Hành vi | `evaluate*` từ chối ca mới cùng major/specific type nếu DOE mới ∈ RIT ca đang mở; gợi ý gắn pathogen vào ca cũ | Evaluate trả `RIT_OVERLAP` warn; vẫn `is_positive` nếu đủ tiêu chí; BA/KSNK tự quyết | Không gate engine |
| Đúng NHSN | Khớp «không báo ca cùng loại» | Dễ trùng tử số nếu BA bỏ qua warn | Lệch SSOT |
| An toàn dữ liệu | Tử số sạch | Phụ thuộc kỷ luật người dùng | Phình rate |
| Khớp tip | Cần Soft thêm RIT lookup theo BN+type | Nhẹ hơn | Zero code Domain |
| Bảo trì | Cần index ca mở + RIT end | Đơn giản | Nợ kỹ thuật |

**Phản biện A:** cần dữ liệu ca trước đủ DOE/type; ENDO RIT = hết admission (không 14d) — phải nhánh riêng.  
**Phản biện B:** Soft-safe POA đã cứng; RIT soft sẽ là lỗ hổng tử số còn lại.  
**Phản biện C:** audit đã ghi thiếu — không chấp nhận khi PO đã xếp #1.

**So sánh tiêu chí:** đúng rule KSNK/NHSN · ít side-effect · kiểm chứng được (spec + UAT trùng loại trong 14d).

**Chốt Domain khuyến nghị = A.** Loại B/C vì không bảo vệ tử số.

## §3. DoD mỏng Lead/Soft (sau PO = A)

1. Gate trong `evaluate*` (và bridge) theo major/specific type; SSI/VAE **bypass**.
2. ENDO: RIT = hết đợt nằm viện hiện tại (SSOT §17), không 14d.
3. Hit RIT → không tạo tử số mới; message: thêm tác nhân vào ca cũ / mở ca sau RIT.
4. Spec: cùng UTI DOE+5d → block; loại khác (UTI vs BSI) → không block; hết RIT → cho ca mới.
5. Không invent list organism; không đụng MBI/Transfer trong lát này.

## §4. Ngoài lát

age-null, Transfer đa khoa, SSI deepest, MBI ANC, APRV = lần lượt theo gói A đã chốt — file A/B riêng khi tới lượt.


## §5. PO chốt

**A** — 2026-09-28. Soft implement DoD §3; không mở age-null/Transfer trong cùng lát trừ khi Lead gộp có kiểm soát.
