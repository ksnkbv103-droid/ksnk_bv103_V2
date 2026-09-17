# Đề cương & biện pháp — Module Giám sát tuân thủ (GSC / VST)

> Ngày: 2026-09-17 · Phạm vi: `ksnk_bv103` giám sát quá trình (process) · Không commit/migrate/Vercel trong lát này.

## 1. Hiện trạng kiến trúc (1 trang)

Hai nhánh **tách rõ**, cùng hub giám sát:

| Nhánh | Nghiệp vụ | Form | Thống kê | Lịch sử | Lưu trữ |
|-------|-----------|------|----------|---------|---------|
| **VST** | WHO 5 thời điểm; opportunity-based; ≤3 đối tượng/phiên | `/giam-sat-vst` | `/thong-ke/vst` | `/lich-su/vst` | `gstt_fact_vst_sessions` + `gstt_fact_vst` |
| **GSC** | Checklist động theo mẫu; 3 cổng loại | `/giam-sat-chung` (+ `/tuan-thu`, `/nhat-ky`, `/he-thong`) | `/thong-ke/gsc` (mặc định `TUAN_THU`) | `/lich-su/gsc` | `gstt_fact_chung_sessions` + `results_jsonb` |

**GSC — khung đã chốt và đang chạy**

1. **Canonical 36 mẫu** (`docs/data/bang-kiem/canonical-36.md` → `gstt_dm_bang_kiem`) — cutover 51→36 (2026-05-29).
2. **Snapshot khi Lưu (BK-1):** `metadata.bang_kiem_snapshot` — sửa mẫu sau không đổi câu hỏi phiếu cũ.
3. **Guard mẫu tắt / không áp dụng khoa (BK-5):** chặn phiếu mới; phiếu cũ vẫn mở.
4. **Chấm điểm phiên:** `cach_tinh_diem` ∈ `TY_LE` | `TRON_GOI` | `DAT_KHONG_DAT` | `NHAT_KY` — engine `giam-sat-scoring.ts`; UI chỉ hiện % (`gsc-score-display.ts`).
5. **Khóa sổ theo ngày:** `sys_module_locks` GSC/VST.
6. **Offline pending save** trên form GSC (đã siết SEC gần đây).
7. **Không** Excel import phiên; **không** EAV kết quả; **không** ticket RCA; **Phần 3–4 form đã DROP** (domain-spec).

**Đã phân tích, chưa ship**

- Điểm nguy cơ **P×I×S** trên danh mục BK (SOP 7.1) — [`bang-kiem-rui-ro-pis-feasibility-20260731.md`](../../modules/giam-sat/bang-kiem-rui-ro-pis-feasibility-20260731.md). Tách khỏi `tong_diem` phiên.

## 2. Đề cương vận hành chuẩn (nghiệp vụ + kỹ thuật)

### 2.1 Luồng hàng ngày (GSV / mạng lưới)

```text
Chọn cổng (VST | GSC tuân thủ | nhật ký | hệ thống)
  → Header: ngày, khoa, khu vực, đối tượng (NVYT / NB theo mẫu)
  → Chọn mẫu active + áp dụng khoa (GSC) / ghi cơ hội WHO (VST)
  → Rapid chấm DAT / KHÔNG ĐẠT / NA
  → Lưu → (GSC) snapshot mẫu + results_jsonb + tong_diem
  → Xem lại: lịch sử / in; phân tích: thống kê theo kỳ–khoa–mẫu
```

### 2.2 Luồng quản trị danh mục (KSNK Admin)

```text
Cổng A — Đổi nội dung mẫu/tiêu chí chờ duyệt (MDM governance nếu bật)
Cổng B — Chuyển tab / chỉ dùng mẫu khác (không sửa seed)
Cổng C — Sự cố hỏng/mất dữ liệu (incident), không “sửa lén” phiếu khóa
```

Áp dụng UI: `/quan-tri-he-thong/bang-kiem` · `ap_dung_jsonb` (bắt buộc / khuyến nghị / chỉ KSNK).

### 2.3 Luồng khóa & báo cáo

1. Admin đặt `locked_until_date` khi chốt kỳ báo cáo.
2. Phiên `ngay_giam_sat` ≤ ngày khóa: banner + chặn ghi/sửa/xóa.
3. Command Center / deep link analytics theo `tu_ngay`–`den_ngay`.

### 2.4 Lớp kỹ thuật (không đụng lại)

| Lớp | Quy tắc |
|-----|---------|
| Domain | CDC/WHO/BYT/QT BV103 → SSOT module `docs/modules/giam-sat/*` → code |
| FE | Dialog max-h + scroll; không nhồi mã QT lên UI GSV |
| BE | UI → Server Action → verifyPermission → DB; write guard khóa + BK-5 |
| DB | Additive only; fact GSC = session + JSONB; không hồi EAV/RCA ticket |
| UX | Mobile/offline-first; VST nhanh theo cơ hội; GSC theo tiêu chí mẫu |

## 3. Gap ưu tiên (sau rà soát)

| ID | Gap | Lớp | Mức | Ghi chú |
|----|-----|-----|-----|--------|
| G1 | **Nội dung tiêu chí 36 mẫu chưa UAT lâm sàng Khoa** | Domain/UX | **P0 nghiệp vụ** | Khung kỹ thuật đủ; “chuẩn mực 100%” chỉ sau UAT nhóm ưu tiên |
| G2 | `master-bangkiem.md` / `master-tieuchi.md` còn mã **ngoài** canonical (vd BM.07.01, BM.08.02…) | Docs | P0 docs | Dễ khiến người đọc seed nhầm 51-era |
| G3 | `giamsattuanthu.md` là **thiết kế kiến trúc cũ** (Phần 3–4, EAV, ticket) — lệch domain-spec đã DROP | Docs | P0 docs | Cần gắn nhãn archive / không dùng triển khai |
| G4 | **P×I×S** chưa có cột/UI/API | Domain+BE | P2 | Model đã khóa; chờ migrate additive + workshop P/I |
| G5 | BM.QĐ.12.01 (lồng ấp sơ sinh) vẫn trong 36 — **môi trường**, không phải chẩn đoán NKBV nhi | Scope | P1 chốt | Giữ nếu Khoa sơ sinh còn giám sát; tắt mẫu nếu BV103 không vận hành |
| G6 | Phần 3–4 “nguyên nhân / ACT” trong `canonical-36.md` YAML vs form app đã slim | Domain↔FE | P1 | Không tự dựng lại form RCA; dùng analytics lỗi tiêu chí + ACT metadata khi cần kế hoạch |
| G7 | Pilot checklist tay (G1–G5, V1–V3) chưa thay bằng bằng chứng UAT mới | Ops | P1 | Chạy lại trên localhost/staging trước go-live kỳ |

**Không phải gap (đừng “sửa”):** snapshot BK-1, scoring % hiện tại, tách route form/thống kê/lịch sử, gỡ Excel, khóa module, VST ≤3 đối tượng.

## 4. Biện pháp đề xuất (A giữ / B sửa ngay / C UAT / D hoãn)

### A — Giữ nguyên (ổn định)

- Canonical **36** + snapshot + BK-5 + module lock + scoring phiên hiện tại.
- Tách VST (WHO) khỏi GSC checklist.
- Không hồi EAV / RCA ticket / import Excel.

### B — Sửa ngay (docs ≤3 file, an toàn, Grok local)

1. Đánh dấu `docs/data/bang-kiem/giamsattuanthu.md` = **archive / không SSOT triển khai**.
2. Đánh dấu `master-bangkiem.md` + `master-tieuchi.md` = **legacy pre-cutover**; trỏ đọc `canonical-36` + `bang-kiem-overview.md`.
3. Bổ sung mục “Đề cương vận hành” ngắn vào `docs/modules/giam-sat/README.md` trỏ báo cáo này.

### C — Việc Nghĩa / Khoa (UAT nội dung — quan trọng nhất)

Nhóm ưu tiên đề xuất (1–2 tuần / nhóm):

1. **Vệ sinh tay kỹ thuật** — BM.07.02, BM.07.03 (+ đối chiếu VST 5 thời điểm).
2. **PPE + tiêm an toàn** — BM.08.01, BM.09.01.
3. **Care bundles** — CLABSI/CAUTI/VAP/SSI (BM.25.*, BM.27.*, BM.26.01, BM.24.02).
4. **Môi trường / chất thải** — BM.11.01, BM.12.01.

Với mỗi mẫu: Pass = wording tiêu chí khớp QT/thực hành Khoa; `la_then_chot` đúng; `cho_phep_kpa` hợp lý; không mã QT trên UI GSV.

### D — Hoãn có chủ đích

- Implement P×I×S (migrate + form MDM + gợi ý S từ % năm trước) **sau** UAT nhóm 1–2.
- Tái dựng Phần 3–4 trên form (trừ khi PO chốt lại — hiện domain cấm).
- Mở rộng lại >36 mẫu / seed 51.

## 5. Lộ trình đề xuất

| Phase | Việc | Ai | DoD |
|-------|------|----|-----|
| **P0** | Docs hygiene B1–B3 | Grok | File gắn nhãn đúng; README trỏ đề cương |
| **P1** | UAT nhóm ưu tiên C | Nghĩa + Khoa | Checklist mẫu có chữ ký/ghi nhận; chỉnh tiêu chí qua cổng admin nếu lệch |
| **P1b** | Chốt BM.QĐ.12.01 giữ/tắt | Nghĩa | `is_active` hoặc ghi SSOT |
| **P2** | P×I×S MVP theo feasibility | Grok/Cursor sau chốt | Additive DB; không đụng `tong_diem` phiên |
| **P3** | Heatmap/Pareto nâng cao (nếu thiếu trên `/thong-ke/gsc`) | Sau P2 | Chỉ khi analytics hiện tại không đủ báo cáo Ban |

## 6. Việc **không** làm trong “tối ưu cảm tính”

- Đổi engine chấm điểm phiên vì “giống JCI essay” trong `giamsattuanthu.md`.
- Gộp VST vào GSC.
- Sửa hàng loạt `tieu_chi_jsonb` bằng script không qua UAT Khoa.

## 7. Tham chiếu

- `docs/modules/giam-sat/README.md`, `bang-kiem-overview.md`, `module-lock.md`, `pilot-checklist-202606.md`
- `docs/modules/giam-sat/bang-kiem-rui-ro-pis-feasibility-20260731.md`
- `docs/data/bang-kiem/canonical-36.md`
- `docs/core/domain-specification.md` § VST/GSC + entities đã DROP
- Code: `src/modules/giam-sat-chung/**`, `src/modules/giam-sat-vst/**`, `src/lib/domain/giam-sat-scoring.ts`
