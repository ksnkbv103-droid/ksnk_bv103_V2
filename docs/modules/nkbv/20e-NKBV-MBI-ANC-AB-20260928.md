# 20e — NKBV MBI ANC / GI full Ch.4 (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §C.1.4.5 · **G.1#1** `[PO xác nhận]`; Soft audit park #9; backlog **NKBV-L05** P1 |
| Tip | `evaluateBsiClabsiCore` MBI — partial `ANC≥2d \| HSCT \| diarrhea` |
| Trạng thái | **Domain chốt A** — Soft **cấm invent số**; cite extract hoặc park đến khi verified |
| Cờ PO | **G.1#1** (ngưỡng ANC/WBC Ch.4) · G.1#5 list organism browser |

## §1. Lock SSOT

Sau LCBI: MBI chỉ khi **ANC/WBC cửa sổ** + **MBI-eligible organism** + **barrier** đúng bảng Ch.4.  
**Không** tự gắn vì «BN ung thư». Tip hiện = nhánh rút gọn P1.

## §2. Ba phương án

| | A — Full Ch.4 sau PDF line-check (khuyến nghị) | B — Giữ partial + nhãn «rút gọn» | C — Tắt MBI |
|---|-----------------------------------------------|-----------------------------------|-------------|
| Hành vi | Implement bảng ANC/WBC + barrier **sau** đối chiếu PDF/`cdc-ch4` từng dòng — **không invent** | Giữ tip; UI/label «rút gọn P1» | Không xét MBI (mọi LCBI+CVC → CLABSI path) |
| Đúng NHSN | Đúng khi extract khóa | Thiếu biên Ch.4 | Over-count CLABSI |
| Evidence | Cần `cdc-ch4` verified | Đã tip | Zero |
| Side-effect | Scope lớn; chờ PDF | Under/over MBI biên | Sai tử số |

**Phản biện A:** thiếu extract → Soft **park**, hỏi PO — không đoán số.  
**Phản biện B:** không đóng park; chỉ tạm vận hành.  
**Phản biện C:** lệch Ch.4 / G.1#1 — mất MBI hợp lệ.

**Chốt Domain = A.** Loại C. Loại B chỉ tạm — **không** end-state.

## §3. DoD mỏng Soft

1. **Cấm invent** threshold ANC/WBC/ngày cửa sổ. Soft chỉ code số đã **cite** từ extract `nkbv-sources/extracted/cdc-ch4.txt` (hoặc PDF Ch.4) đã Domain/PO line-check.
2. Extract chưa verified → **park L05**; không ship bảng đoán.
3. MBI = LCBI + ANC/WBC window + MBI organism (browser/versioned, G.1#5) + barrier đúng bảng — không «ung thư = MBI».
4. Spec: đủ cửa sổ + barrier → `MBI_LCBI` không CLABSI; thiếu ANC/barrier → không MBI.
5. **Flag PO G.1#1** trước harden full. Không đụng deepest/APRV trong lát.

## §4. Evidence

Extract có tại `nkbv-sources/extracted/cdc-ch4.txt` — Soft **phải** cite dòng đã verify; thiếu/mơ hồ → park, không invent.
