# README — Domain giám sát tuân thủ (VST + GSC) — v1.3

| | |
|--|--|
| **File chính** | [`11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md`](./11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md) |
| **Inventory BK** | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](./12-BANG-KIEM-inventory-from-KSNK-final.md) — **v1.1 filtered subset** (chỉ BK/phiếu quan sát GS; không mọi BM QT/QĐ) |
| **Ngày** | 2026-09-22 (Asia/Saigon) — **v1.3 local** NV ngoài danh mục + nhập tay; inventory GS = filtered; **chưa git commit/push** |
| **Phạm vi** | Hai họ form · Module A/B/C · 6 chiều · hình thức · cách thức · đối soát KSNK≠TGS · đối tượng NV (MDM + ngoài DM) · inventory BK (subset GS) · gate |
| **Không gồm** | NKBV · CSSD inventory · sửa Word QT · sửa seed BK codebase · code W1 khi domain chưa ready |

## Khi nào dùng

- **Trước** mọi chỉnh codebase W1 (form / RPC / DB) — xem **§H Gate**.
- Trước khi sửa pack `01`/`02`/`06`/`07`/`08` cho W1 VST/GSC.
- Khi PO khóa: **QT ≠ form giám sát**; hai họ form không trộn mẫu số; lens TGS/KSNK tách %; **giữ Ngoài danh mục NV**.

## Thứ tự đọc (v1.3)

1. **§A** nguyên tắc tách lớp + gate cứng + NV ngoài DM  
2. **§K Đối tượng NV** — MDM + Ngoài danh mục + cờ `ngoai_danh_muc`  
3. **§E Hình thức** — 3 giá trị · derive (KSNK ≠ TGS) · lens  
4. **§F Cách thức** · **§G Đối soát**  
5. **§H Gate** — checklist Domain ready  
6. **§B** Module A WHO · **§C** Module B · **§D** Module C  
7. **§L** Inventory file 12 + pipeline chuẩn bị data BK  
8. **§I** giữ/sửa/bỏ · **§J** kế hoạch local · Phụ lục

Đọc kèm: `src/lib/supervision-policy.ts` · form `src/modules/giam-sat-vst/` · `07-srs-W1-VST-GSC-v1.md` · `metric-dictionary.md` · QT.07 (chỉ đọc) · `canonical-36.md` · **file 12**.

## PO chốt (2026-09-22)

- **6 chiều** bắt buộc trên phiên **VST thường quy** (Module A), không chỉ GSC.
- **VST ngoại khoa** = cùng họ **bảng kiểm giám sát chung**.
- **Hình thức · cách thức · đối soát KSNK–TGS** đủ trong domain **trước** quyết định sửa code.
- **Gate:** chưa đủ domain → không mở PR/lát sửa form/RPC/DB.
- **NV Khoa KSNK** = chỉ chuyên trách độc lập — không TGS/mạng lưới.
- **Hai họ form:** WHO lưới = chỉ VST TQ; Bảng kiểm = GSC + VST NK.
- **NV đối tượng:** ưu tiên MDM theo khoa; **bắt buộc giữ Ngoài danh mục + nhập tay**; cờ `ngoai_danh_muc` (không chặn nhập).
- **Inventory GS:** file 12 = **filtered subset** BK/phiếu quan sát tuân thủ — không seed mọi BM trong QT/QĐ.

## `[PO xác nhận]` còn mở (rút gọn)

1. Map `risk_tier` (PHA_CHE / CHAT_THAI).  
2. Module B: BK trên engine GSC vs route/phiên riêng.  
3. Ẩn danh tên NV đối tượng.  
4. Override hình thức?  
5. Mốc lộ trình 80→85→90 / 50→60 / 90→100.  
6. Cách thức «gián tiếp hóa chất»?  
7. Tick file 12 v1.1 các dòng `cần PO` (đợt 1 catalog GSC).

## Không làm

- Không commit/push origin từ bản local này.  
- Không đưa form giám sát vào QT.07 / HD.  
- Không mở lát code W1 khi checklist §H chưa tick.  
- Không hồi ranking badge Action board trên `/thong-ke`.  
- Không gộp VST+GSC thành CCS.  
- Không biến «100–200 cơ hội/khoa/tháng» thành KPI %.  
- Không trộn % TGS + KSNK trên một chỉ số điều hành.  
- **Không** cấm / bỏ free-text NV · Ngoài danh mục.  
- **Không** sửa seed bảng kiểm codebase trong bước inventory.

---

*Companion 1 trang cho `11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md` (**v1.3 local**).*
