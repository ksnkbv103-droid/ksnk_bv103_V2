# 26 — CSSD GO-LIVE A · P0 doors A/B DoD (Domain Soft Soft Soft-ready) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Lane | **Domain** · Soft Soft Soft-ready A/B DoD · **không code** |
| Ngày | 2026-09-28 (Asia/Saigon) |
| Tip cite | Lead plan A · `_plan-golive-A-ia-doors-2026-09-28.md` (Mac `docs/modules/_audit/`) · branch `cursor/me-sync-recall-print` · HEAD `1507db7` |
| Neo | `17` Lock A (§6 SC tách tuyệt đối · §7 CAP_PHAT gate · D1) · `18` M-22/M-23 thu hồi · `18b` AB-3 conservative · IA tip `_audit-ia-direct-doors-2026-09-27.md` (G-P0-06 MOVE→dung-cu; 5 chip) · debt `_audit-full-debt-overlap-2026-09-27.md` (BCTH phụ lục ↔ report) |
| Phạm vi | **Chỉ P0-1…P0-5 + menu P0-3** từ plan §2 / §6. Không invent Soft Soft Soft ngoài neo+plan. Không mở P1. |
| Soft Soft Soft-queue | **P0-1 / P0-2 / P0-4 / P0-5 + P0-3 phần số (1 công thức)** Soft Soft Soft-ready **ngay** — **không** chờ sidebar menu. Menu = **B · Domain+PO khóa · Soft Soft Soft-ready** (Nghĩa 09:21 via Lead + 09:26 autonomy). |
| Không | Domain sửa code · invent cửa mới · mở lại «cửa Chuyển» trên Sự cố · viết công thức analytics mới |

---

## Bảng chốt P0 (Domain)

| # | Domain chốt | One-line rule | Soft Soft Soft DoD | Reject |
|---|-------------|---------------|--------------------|--------|
| **P0-1** | **A** | Thu hồi mẻ = **một cửa ghi** từ phiếu mẻ đang mở (đã có `ma_lo` / mã lô) **HOẶC** chip **Sự cố quy trình** (`/cssd-su-co` PROCESS / batch-recall); **report chỉ đọc** — không nút lập thu hồi. | (1) `MeTietKhuanPage` (kể cả `suppressShell`): giữ **một** lối thu hồi khi phiếu mở + đã có mã lô. (2) Danh sách mẻ / cột Thu hồi: **không** thêm lối thứ hai khi chưa mở phiếu / chưa có mã lô. (3) Chip PROCESS trên `/cssd-su-co` vẫn ghi thu hồi (neo 17 §6.1 + IA «Thu hồi mẻ»). (4) `/cssd-erp/report?tab=incident`: **bỏ** nút thu hồi / lập phiếu. (5) Không tạo SC inline trên shell 6 trạm (Lock A M4). | **B** = chỉ phiếu mẻ (bỏ chip) → mất đường khi mẻ đã đóng / NV đang ở khung SC. **C** = chỉ su-co → mất ngữ cảnh mã lô đang mở trên phiếu (nhiều click, dễ lệch lô). **D** = giữ 4 chỗ (status quo) → chồng module, lệch go-live «không chồng». |
| **P0-2** | **A** | **Ghi phiếu** = trang Sự cố; **nhật ký xác nhận + in** = `/cssd-erp/report?tab=incident` — tách write vs journal. | (1) `/cssd-su-co`: giữ lập phiếu (5 chip); **bỏ** `IncidentConfirmButton` + `IncidentJournalPrintButton` trên «phiếu gần đây». (2) Một link quiet «Nhật ký sự cố» → `report?tab=incident`. (3) Tab Sự cố báo cáo: giữ xác nhận + in nhật ký. (4) Không nhân form xác nhận thứ ba. | **B** = giữ xác nhận/in trên cả hai → trùng P0-2 plan, NV không biết cửa «đúng». **C** = chuyển xác nhận về su-co, report chỉ đọc → lệch plan Lead + lệch «report = cửa đọc» (§1.2); neo tách reporting khỏi stations vẫn OK nhưng lệch cascade «lịch sử/in» đã khóa ở Giám sát dialect. |
| **P0-3 số** | **A** | **Một** công thức tỷ lệ / sản lượng / mẻ / máy = `cssd-analytics-core`; **bỏ** fallback thô `100 − sự cố/quy trình` trên bundle `raw`. Phụ lục BCTH chỉ **link** sang `/cssd-erp/report` sau khi số khớp (lát F; Soft Soft Soft-queue phần số ở lát B). | (1) `CSSDReportPage`: mọi chỉ số «không sự cố» / sản lượng lấy từ analytics-core; **không** tính lại trên `raw` khi analytics null (hiển thị trống / «chưa có số» thay vì fallback lệch). (2) Không viết công thức mới trong file báo cáo. (3) Biểu đồ: cùng nguồn «hoàn thành» + «sự cố» từ core — không trộn analytics + raw. (4) Phụ lục BCTH: **không** bảng số thứ hai lệch; lát B chỉ siết core; link phụ lục = lát F. | **B** = giữ fallback thô «cho có số» → cùng màn hai cách tính (plan §3 cascade). **C** = nhân công thức riêng cho phụ lục BCTH → chồng L6 debt. |
| **P0-4** | **A** | Sự cố máy = **một cửa ghi** `/cssd-su-co?group=EQUIPMENT` (+ query máy đang chọn); **bỏ modal** trên Bảo dưỡng. | (1) `BaoTriThietBiPage`: nút «Báo sự cố» = deep-link `cssd-su-co?group=EQUIPMENT` kèm máy (id/mã); **không** mở modal EQUIPMENT. (2) Chip «Sự cố máy» trên `/cssd-su-co` giữ. (3) Không prefill tạo tự động vượt Lock A M4 trừ deep-link group+máy (điều hướng, không form inline trên trạm/bảo dưỡng). | **B** = giữ modal + chip → 2 cửa ghi cùng EQUIPMENT (P0-4). **C** = chỉ modal Bảo dưỡng, bỏ chip → lệch IA 5 cửa trực tiếp + neo «SC chỉ qua `/cssd-su-co`». |
| **P0-5** | **A** | Cửa ghi luân chuyển = tab **Luân chuyển** `/cssd-dung-cu?tab=LUAN_CHUYEN`; **sửa 1 câu banner** admin; **không** mở lại «cửa Chuyển» trên Sự cố. | (1) `QuanLyDungCuPage` banner: bỏ chữ «cửa Chuyển» / «ở sự cố CSSD»; viết đúng «Luân chuyển số lượng ở Dụng cụ → tab Luân chuyển». (2) Bookmark sự cố → dung-cu LUAN_CHUYEN **giữ** (G-P0-06). (3) Không thêm chip/cửa Chuyển trên `/cssd-su-co`. | **B** = mở lại cửa Chuyển trên Sự cố → phá G-P0-06 / D1 / IA lock. **C** = chỉ xóa banner, không sửa câu → NV vẫn mất đường. |

---

## Menu P0-3 — **Domain+PO khóa B · Soft Soft Soft-ready**

| | **A — Sidebar mục «Báo cáo»** | **B — Link trên shell Quy trình (Domain chốt)** |
|---|------------------------------|--------------------------------------------------|
| Việc | Thêm mục «Báo cáo» nhóm CSSD · Vận hành · href `/cssd-erp/report` | Một link/CTA trên shell `/cssd-quy-trinh` (và/hoặc quiet từ phụ lục BCTH đã có) → `/cssd-erp/report`; **sidebar giữ** Quy trình · Sự cố |
| Ưu | NV thấy cửa đếm trên menu; khớp «một cửa đọc» dễ tìm | Không phình sidebar; người đang vận hành (Quy trình) vào report ≤1 click; phụ lục BCTH đã link `?tab=volume` |
| Nhược | Thêm mục + quyền `CSSD_REPORT` trên sidebar — **đổi nav có hậu quả UX** | NV chỉ vào «Tra cứu» / không mở Quy trình có thể chậm tìm hơn (mitigate: phụ lục BCTH + link từ Sự cố nhật ký đã có ở P0-2) |
| Khớp neo/plan | Plan §6 A | Plan §6 B · go-live «ít click / không chồng» · Domain default prefer B |

**Domain+PO khóa B.** Nghĩa xác nhận 09:21 via Lead; 09:26 autonomy chốt tiếp. Lý do: plan chưa chứng minh NV **không** tìm được report (chỉ thiếu đường vào); thêm sidebar = clutter nhóm Vận hành đã có Quy trình+Sự cố; shell Quy trình đã mang quyền `CSSD_REPORT`. **Soft Soft Soft-ready**: link B có thể áp dụng sau lát B hoặc trong F.  
**Đã khóa B** — nav UX đã có quyết định; không còn chờ PO. **Soft Soft Soft-queue:** phần **số** (1 công thức) vẫn Soft Soft Soft-ready. Link menu B có thể áp dụng sau lát B hoặc trong F.

---

## Anti-bias tóm tắt ( Domain đã critique)

| Door | ≥2 options xem | Vì sao chốt |
|------|----------------|-------------|
| P0-1 | A Lead dual-write-door · B chỉ mẻ · C chỉ su-co · D 4 chỗ | A khớp neo 17 «SC + thu hồi theo mẻ trên `/cssd-su-co`» **và** mã lô trên phiếu mở (18 M-23); report RO = no-overlap |
| P0-2 | A split write/journal · B cả hai · C confirm trên su-co | A khớp plan §1.2 «report không lập phiếu» + Giám sát dialect ghi→lịch sử→in |
| P0-3 số | A 1 core · B fallback · C phụ lục riêng | A khớp cascade Soft Soft Soft-ready + debt L6 |
| P0-3 menu | A sidebar · **B shell** | B ít clutter; **[PO]** vì nav |
| P0-4 | A deep-link · B modal+chip · C chỉ modal | A khớp Lock A M4 + IA 5 chip |
| P0-5 | A banner fix · B reopen Chuyển · C xóa banner | A khớp G-P0-06; không phá D1 |

Evidence thiếu / không bịa: không đọc lại runtime tip `1507db7` trong lát Domain này — cửa 4 chỗ / fallback thô / banner «cửa Chuyển» lấy **nguyên văn plan Lead A**; nếu Soft Soft Soft verify tip lệch plan → báo Lead, không tự invent cửa thứ năm.

---

## P1 park (không mở rộng)

P1-1 Đề nghị vs duyệt · P1-2 Tra cứu vs tab ghi Dụng cụ · P1-3 Nhãn «Lịch sử» admin vs kho · P1-4 Số VST/GSC · P1-5 Số NKBV · P1-6 HC 3 href (giữ deep-link CHEMICAL) · P1-7 Form GSC hub vs gốc.  
→ Lát C/D theo plan §4. Domain **không** Soft Soft Soft-ready P1 ở file này.

---

## Soft Soft Soft-queue (Lead / lát B)

| Hạng mục | Soft Soft Soft-ready? | Chờ |
|----------|----------------------|-----|
| P0-1 Thu hồi 1 cửa ghi (mẻ mở \| PROCESS); report RO | **Có** | — |
| P0-2 Su-co chỉ lập; confirm+in @ `report?tab=incident` | **Có** | — |
| P0-3 **số** một `cssd-analytics-core`, bỏ fallback thô | **Có** | — |
| P0-3 **menu** B (link shell Quy trình) | **Có · Soft Soft Soft-ready** | Áp dụng sau lát B hoặc trong F |
| P0-4 Deep-link EQUIPMENT; bỏ modal Bảo dưỡng | **Có** | — |
| P0-5 Banner 1 câu; không reopen Chuyển | **Có** | — |
| Phụ lục BCTH chỉ link + cùng core | Lát F (sau B số khớp) | — |

Whitelist gợi ý Lead (plan §5) — Domain không sửa file; Soft Soft Soft bám whitelist + DoD trên.

---

## Đường file

| Bản | Path |
|-----|------|
| Domain SSOT (box) | `/workspace/ksnk-domain/26-CSSD-GOLIVE-A-P0-DOORS-AB-20260928.md` |
| Macwork mirror (box) | `/workspace/ksnk_bv103_macwork/docs/modules/cssd/26-CSSD-GOLIVE-A-P0-DOORS-AB-20260928.md` |
| Mac repo (CopyFromBox) | `/Users/drnghia/Desktop/ksnk_bv103/docs/modules/cssd/26-CSSD-GOLIVE-A-P0-DOORS-AB-20260928.md` |
| Tip Lead plan A | `docs/modules/_audit/_plan-golive-A-ia-doors-2026-09-28.md` |

**Cho Lead:** đọc mirror `docs/modules/cssd/26-…` (ưu tiên) hoặc box path trên; Soft Soft Soft-queue P0-1/2/4/5 + analytics **không** chờ menu.
