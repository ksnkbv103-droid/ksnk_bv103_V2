# Intake — Quy định áp dụng bảng kiểm & so sánh TGS giữa các khoa

> **Trạng thái:** Đã duyệt & implement Wave A+B (2026-06).  
> **Phụ thuộc:** Wave 1–2 analytics đã ship — [`analytics-wave12-intake-202606.md`](./analytics-wave12-intake-202606.md).  
> **Bối cảnh:** Ma trận khoa × BK hiện tại giả định mọi khoa × mọi BK → «Chưa GS» gây hiểu nhầm. Cần SSOT «BK nào, khoa nào, ai làm, đánh giá thế nào» trước khi tính KPI bao phủ và xếp hạng TGS.  
> **QLCV:** Đã gỡ link khỏi giám sát/analytics — module QLCV giữ nguyên, chỉ dùng nội bộ KSNK.

---

## 0. Việc làm trước mắt (checklist)

Thứ tự đề xuất — **dừng sau bước 4** nếu chưa có file mapping từ KSNK.

| # | Việc | Ai | Đầu ra |
|---|------|-----|--------|
| **1** | Duyệt intake này + schema `ap_dung_jsonb` (§4) | Product / KSNK | Spec freeze |
| **2** | Migration: `ALTER gstt_dm_bang_kiem ADD ap_dung_jsonb` | Dev | `mdm:migrate` pass |
| **3** | Type + Zod + `resolveBkApDungChoKhoa()` | Dev | vitest resolve |
| **4** | Form MDM «Áp dụng & bắt buộc» (phạm vi, khoa/khối, TGS/KSNK) | Dev | T-A1, T-A2 |
| **5** | **KSNK điền phạm vi 36 mẫu** (Excel: mã BK × phạm vi × khoa/khối) | KSNK | File seed |
| **6** | Script seed `ap_dung_jsonb` từ file KSNK | Dev | 36 dòng có config |
| **7** | Mapper `buildTgsCoverageRows` — breadth = distinct BK | Dev | T-B1 vitest |
| **8** | Ma trận: ô **Không áp dụng** / **Thiếu TGS** / **Đã TGS** | Dev | T-B2 tay UI |
| **9** | Bảng xếp hạng khoa: bao phủ % + danh sách BK thiếu | Dev | T-B3 |
| **10** | Báo cáo tổng hợp + in — đồng bộ số | Dev | verify:engineering |

**Không làm trong đợt này:** link QLCV, tần suất tối thiểu, auto-spawn việc, tab «khoa tôi» (Wave C).

**File mapping KSNK (mẫu cột):** `ma_bk` · `pham_vi` · `khoi_ma` (nếu theo khối) · `khoa_ma` (nếu theo khoa) · `bat_buoc_tgs` · `bat_buoc_ksnk` · `muc_do` · `ghi_chu`

---

## 1. Goal

Cho phép **quy định trực tiếp trên danh mục bảng kiểm** (một cột `ap_dung_jsonb`) **phạm vi áp dụng**, **đối tượng bắt buộc** và **cách đánh giá triển khai**, để:

1. Khoa lâm sàng biết **BK nào mình phải tự giám sát (TGS)**.
2. KSNK/BGĐ **so sánh công bằng giữa các khoa** về quá trình TGS (bao phủ danh mục + chất lượng khi đã làm).
3. Ma trận / KPI analytics **không phạt oan** khoa không thuộc phạm vi BK.

---

## 2. Nguyên tắc thiết kế (đã thống nhất hội thoại)

| Nguyên tắc | Quyết định |
|------------|------------|
| Lưu trữ | **Một cột** `ap_dung_jsonb` trên `gstt_dm_bang_kiem` — không bảng policy/rule phụ |
| JSON | **Schema cố định** (Zod + form có cấu trúc), không nhập JSON tay |
| Tách vai trò | `tieu_chi_jsonb` = nội dung phiên; `ap_dung_jsonb` = ai phải làm / ở đâu / KPI nào |
| Metadata cũ | Giữ `phan_loai_chuyen_mon`, `loai_giam_sat`, `doi_tuong_giam_sat`, `cach_tinh_diem` — dùng gợi ý mặc định khi tạo BK |
| Pilot | 36 mẫu canonical — seed do **KSNK duyệt**, agent không đoán phạm vi khoa |

---

## 3. Mô hình nghiệp vụ — ba trục cấu hình

### 3.1 Trục A — Áp dụng ở mức nào (`pham_vi`)

| Mã | Nhãn UI | Khoa nào «nằm trong nghĩa vụ» |
|----|---------|--------------------------------|
| `CA_VIEN` | Cả viện | Mọi khoa lâm sàng active, trừ `khoa_loai_tru` |
| `THEO_KHOI` | Theo khối | `khoa.khoi_id ∈ khoi_ids` |
| `THEO_KHOA` | Theo khoa | `khoa.id ∈ khoa_ids` |
| `CHI_KSNK` | Chỉ Khoa KSNK | Khoa lâm sàng **không** vào mẫu số TGS |
| `KHUYEN_NGH` | Khuyến nghị | Không tính thiếu trên KPI bắt buộc |

**Resolve (một hàm SSOT):**

```
bkApDungChoKhoa(bk, khoa) → boolean
```

Dùng chung: form gợi ý, analytics, RPC bao phủ, dashboard «khoa tôi».

### 3.2 Trục B — Đối tượng / ai thực hiện (`bat_buoc`)

| Trường JSON | Nhãn UI | Ý nghĩa |
|-------------|---------|---------|
| `bat_buoc.tu_giam_sat` | Bắt buộc khoa TGS | Khoa trong phạm vi phải có phiên `hinh_thuc = TU_GIAM_SAT` |
| `bat_buoc.ksnk_giam_sat` | Bắt buộc KSNK giám sát | Kỳ vọng phiên `hinh_thuc = KSNK` (đối soát) |
| `muc_do` | Mức độ | `BAT_BUOC` \| `KHUYEN_NGH` \| `CHI_KSNK` |

**Liên kết metadata sẵn có:**

- `doi_tuong_giam_sat` (NHAN_VIEN, NGUOI_BENH, …) → quyết định **form field** khi ghi phiên, không thay `pham_vi`.
- `loai_giam_sat` (`TUAN_THU` / `NHAT_KY_VAN_HANH` / `DANH_GIA_HE_THONG`) → gợi ý mặc định `pham_vi` + `bat_buoc` khi seed.

### 3.3 Trục C — Cách đánh giá (`danh_gia`)

Tách **ba lớp KPI** — không gộp một con số:

| Lớp | Mã KPI | Công thức (một khoa, một kỳ) | Trả lời câu hỏi |
|-----|--------|------------------------------|----------------|
| **Bao phủ (breadth)** | `ty_le_bao_phu_tgs` | `|BK bắt TGS đã có ≥1 phiên TGS| / |BK bắt TGS áp dụng cho khoa||` | Đã chạm đủ **loại** BK chưa? |
| **Cường độ (volume)** | `tong_phien_tgs` | `COUNT(phiên TGS)` | Làm bao nhiêu phiên (phụ) |
| **Chất lượng (depth)** | `ty_le_tuan_thu_tgs` | Giữ RPC hiện tại trên cơ hội TGS | Khi đã làm, tuân thủ ra sao? |

**Quy tắc quan trọng (Spec freeze khi duyệt):**

- Tử số **breadth** = **distinct `bang_kiem_id`**, không cộng số phiên.
- Mẫu số = BK `is_active` + `muc_do = BAT_BUOC` + `bat_buoc.tu_giam_sat = true` + `bkApDungChoKhoa(bk, khoa)`.
- Khoa làm 1 BK 20 lần, bỏ 9 BK khác → `ty_le_bao_phu_tgs = 10%`, `tong_phien_tgs` cao — **hai chỉ số tách**.

**So sánh giữa các khoa (TGS):**

| View | Nội dung |
|------|----------|
| **Bảng xếp hạng TGS** | Cột: Tên khoa · Bao phủ % · Số BK thiếu · Tuân thủ TB TGS · Tổng phiên TGS |
| **Ma trận khoa × BK** | Ô = `Đã TGS` / `Thiếu TGS` / `Không áp dụng` (không màu «thiếu») |
| **Heatmap khối** | Trung bình `ty_le_bao_phu_tgs` theo `khoi_id` |
| **Danh sách BK thiếu** | Drill-down: khoa X thiếu BM.07.02, BM.09.01, … |

Đối soát TGS vs KSNK (**Wave 1**) giữ nguyên: chỉ khi `vol_tgs > 0 ∧ vol_ksnk > 0` **và** BK bắt cả hai nguồn.

---

## 4. Schema `ap_dung_jsonb` (v1)

```json
{
  "pham_vi": "CA_VIEN",
  "khoi_ids": [],
  "khoa_ids": [],
  "khoa_loai_tru": [],
  "bat_buoc": {
    "tu_giam_sat": true,
    "ksnk_giam_sat": true
  },
  "muc_do": "BAT_BUOC",
  "ghi_chu": "Áp dụng mọi khoa lâm sàng"
}
```

**Tuỳ chọn Wave 2+ (không bắt buộc pilot):**

```json
"tan_suat_toi_thieu": { "don_vi": "THANG", "so_lan": 1 }
```

| Key | Kiểu | Bắt buộc v1 |
|-----|------|-------------|
| `pham_vi` | enum | Có |
| `khoi_ids` | uuid[] | Khi `THEO_KHOI` |
| `khoa_ids` | uuid[] | Khi `THEO_KHOA` |
| `khoa_loai_tru` | uuid[] | Tuỳ chọn khi `CA_VIEN` |
| `bat_buoc` | object | Có |
| `muc_do` | enum | Có |
| `ghi_chu` | string | Không |

**Migration:**

```sql
ALTER TABLE public.gstt_dm_bang_kiem
  ADD COLUMN IF NOT EXISTS ap_dung_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.gstt_dm_bang_kiem.ap_dung_jsonb IS
  'Quy định phạm vi áp dụng BK: pham_vi, khoa/khối, bat_buoc TGS/KSNK, muc_do. SSOT resolve nghĩa vụ khoa×BK.';
```

Không CHECK JSON ở DB pilot — validate Zod app + RPC test.

---

## 5. Gợi ý mặc định khi tạo BK (không bảng policy)

| `phan_loai_chuyen_mon` / `loai_giam_sat` | Gợi ý `ap_dung_jsonb` |
|------------------------------------------|------------------------|
| `PHONG_NGUA_CHUAN`, `GOI_CAN_THIEP`, … + `TUAN_THU` | `CA_VIEN`, TGS+KSNK, `BAT_BUOC` |
| `CHUYEN_KHOA` | `THEO_KHOA`, `khoa_ids` rỗng → admin chọn |
| `QUAN_TRI_HE_THONG` / `DANH_GIA_HE_THONG` | `CHI_KSNK`, `bat_buoc.tu_giam_sat: false` |
| `NHAT_KY_VAN_HANH` | `THEO_KHOA` hoặc `CA_VIEN` tùy mẫu — **KSNK seed** |

Admin luôn sửa được trên form; gợi ý chỉ lúc tạo mới.

---

## 6. In scope

### Wave A — Data + MDM (P0)

| Hạng mục | Chi tiết |
|----------|----------|
| Migration | `ap_dung_jsonb` trên `gstt_dm_bang_kiem` |
| Types | `BangKiemApDungJsonb` + Zod trong `bang-kiem.types.ts` |
| Resolve | `resolveBkApDungChoKhoa`, `listBkBatBuocChoKhoa` trong `src/lib/domain/` |
| Form MDM | Section «Áp dụng & bắt buộc» trong `bang-kiem-form-fields.tsx` — multi-select khối/khoa |
| Write | `bang-kiem-write.actions.ts` persist `ap_dung_jsonb` |
| Seed | Script/migration **sau khi KSNK duyệt** bảng mapping 36 mẫu (không đoán) |

### Wave B — Analytics TGS so sánh khoa (P0)

| Hạng mục | Chi tiết |
|----------|----------|
| Mapper | `buildTgsCoverageRows(khoa[], bk[], sessions)` — breadth + thiếu BK |
| Ma trận | Sửa `SupervisionCoverageMatrix`: ô `N/A` khi không áp dụng; `Thiếu` chỉ khi bắt buộc |
| KPI panel | «Bao phủ TGS: X/Y BK» theo khoa đã lọc; bảng xếp hạng khoa |
| GSC/VST RPC | Mở rộng payload `tgs_coverage` (hoặc compose app từ fact + MDM wave A) — ưu tiên **compose app** pilot để tránh RPC lớn |
| Báo cáo tổng hợp | Block «Triển khai TGS theo khoa» + ma trận có cột «Không áp dụng» |
| In | Top khoa thiếu bao phủ + ma trận rút gọn |

### Wave C — Góc nhìn khoa lâm sàng (P1)

| Hạng mục | Chi tiết |
|----------|----------|
| Scope | `getAnalyticsViewerScope` — tab «BK tôi phải TGS» |

> **QLCV — hoãn / bỏ liên kết analytics (2026-06):** QLCV pilot chỉ dùng nội bộ Khoa KSNK; link từ ma trận thiếu bao phủ **không** nằm trong slice này. Khi cần sau: KSNK xem danh sách BK thiếu → tạo việc thủ công trong QLCV.

---

## 7. Out of scope

| Cấm | Lý do |
|-----|-------|
| Bảng `gstt_bk_quy_tac_ap_dung` / policy | User chọn flat JSON trên BK |
| Đổi `tieu_chi_jsonb` / scoring engine | Slice áp dụng only |
| Tần suất tối thiểu trong KPI pilot | Wave B+ nếu KSNK yêu cầu |
| CSSD workflow | Ranh giới MDM |
| VST ma trận per-BK (VST không có 36 BK) | VST giữ 1 chuyên đề; GSC là chính cho BK×khoa |
| QoQ / Wave 4 executive | Sau khi breadth ổn |

---

## 8. Acceptance criteria

### Wave A

1. Form BK lưu/đọc `ap_dung_jsonb`; validate `THEO_KHOA` không được `khoa_ids` rỗng.
2. `resolveBkApDungChoKhoa` unit test: CA_VIEN + loại trừ, THEO_KHOI, THEO_KHOA, CHI_KSNK, KHUYEN_NGH.
3. `npm run mdm:migrate:local` + `verify:mdm` pass.
4. ≥1 BK seed có `ap_dung_jsonb` mẫu (demo), 35 còn lại chờ KSNK file mapping.

### Wave B

5. Khoa **không** thuộc phạm vi BK → ma trận ô **«Không áp dụng»**, không «Chưa GS».
6. Khoa thuộc phạm vi, chưa phiên TGS → **«Thiếu TGS»**.
7. `ty_le_bao_phu_tgs`: khoa làm 1 BK n lần, 9 BK bắt buộc khác = 0 phiên → **10%** (không 200%).
8. Bảng xếp hạng: sort theo `ty_le_bao_phu_tgs` ASC (khoa yếu trước) + cột «BK thiếu».
9. Báo cáo tổng hợp / `/thong-ke/gsc` đồng bộ số với tay đếm 1 khoa + 1 kỳ.
10. `npm run verify:engineering` pass.

### Wave C (khi làm)

11. User khoa X chỉ thấy BK `resolveBkApDungChoKhoa ∧ bat_buoc.tu_giam_sat`.

---

## 9. Verify plan

| Wave | Lệnh | Kịch bản tay |
|------|------|--------------|
| A | `npm run mdm:migrate:local` · `npm run verify:mdm` · vitest resolve | **T-A1:** Sửa BK → CA_VIEN + loại trừ KSNK → resolve đúng 1 khoa thử |
| A | `npm run verify:engineering` | **T-A2:** Tạo BK THEO_KHOA không chọn khoa → lỗi form |
| B | vitest `tgs-coverage*.spec.ts` (mới) | **T-B1:** 10 BK bắt buộc, 1 BK có phiên ×20 → bao phủ 10% |
| B | Tay `/thong-ke/gsc` + `/bao-cao-tong-hop` | **T-B2:** Ma trận — ô N/A vs Thiếu đúng 1 khoa chuyên khoa |
| B | Tay so sánh 2 khoa | **T-B3:** Khoa A 8/10 BK, Khoa B 3/10 → xếp hạng B trước A |
| B | `npm run verify:engineering` | |

---

## 10. Kế hoạch triển khai (7 bước)

| Bước | Wave | Việc | Verify |
|------|------|------|--------|
| 1 | A | Migration `ap_dung_jsonb` | mdm:migrate |
| 2 | A | Types + Zod + `resolveBkApDungChoKhoa` | vitest |
| 3 | A | Form MDM section «Áp dụng» | T-A1, T-A2 |
| 4 | A | Seed template / chờ KSNK mapping file | review nội bộ |
| 5 | B | `buildTgsCoverageRows` + KPI breadth | T-B1 |
| 6 | B | Ma trận N/A/Thiếu + bảng xếp hạng khoa TGS | T-B2, T-B3 |
| 7 | B | Báo cáo tổng hợp + print + `implementation-mapping.md` | verify:engineering |

**Thứ tự ship:** Wave A merge & seed framework → KSNK điền phạm vi 36 mẫu → Wave B analytics.

---

## 11. UI — Form «Áp dụng & bắt buộc» (MDM Bảng kiểm)

```
┌─────────────────────────────────────────────┐
│ Phạm vi áp dụng          [▼ Cả viện      ] │
│ Khoa loại trừ            [multi khoa     ] │  ← chỉ khi Cả viện
│ Khối áp dụng             [multi khối    ] │  ← chỉ khi Theo khối
│ Khoa áp dụng             [multi khoa    ] │  ← chỉ khi Theo khoa
│ ☑ Bắt buộc TGS  ☑ Bắt buộc KSNK giám sát   │
│ Mức độ                   [▼ Bắt buộc     ] │
│ Ghi chú phạm vi          [textarea      ] │
└─────────────────────────────────────────────┘
```

`CHI_KSNK` → khóa TGS = không; `KHUYEN_NGH` → cảnh báo không vào KPI thiếu.

---

## 12. UI — So sánh TGS giữa các khoa (analytics)

```
┌─ KPI tổng ─────────────────────────────────┐
│ Khoa trong lọc: 24 │ TB bao phủ TGS: 62%  │
│ Khoa < 50% bao phủ: 5                      │
└────────────────────────────────────────────┘

┌─ Xếp hạng triển khai TGS ──────────────────┐
│ Khoa      │ Bao phủ │ Thiếu │ Tuân thủ TB │
│ GMHS      │  30%    │ 7 BK  │   78%       │
│ Nội A     │  80%    │ 2 BK  │   85%       │
└────────────────────────────────────────────┘

┌─ Ma trận (hàng=khoa, cột=BK bắt buộc) ─────┐
│     │ VST │ PPE │ Tiêm AT │ ...           │
│ GMHS│  ✓  │  —  │   ✗     │  — = N/A      │
└────────────────────────────────────────────┘
```

Chú thích: `✓` Đã TGS · `✗` Thiếu TGS · `—` Không áp dụng · `K` Chỉ KSNK (nếu cần).

---

## 13. Giả định — cần KSNK xác nhận

| ID | Câu hỏi | Mặc định pilot |
|----|---------|----------------|
| **B1** | Mẫu số breadth: chỉ `BAT_BUOC` hay cả `KHUYEN_NGH`? | Chỉ **BAT_BUOC** |
| **B2** | «Cả viện» có tự loại khoa KSNK / hành chính? | **Có** — `khoa_loai_tru` seed + flag `la_khoa_ksnk` nếu có trên MDM |
| **B3** | Ma trận cột = toàn BK bắt buộc MDM hay chỉ BK có trong kỳ? | **Toàn BK bắt buộc áp dụng** (đúng nghĩa vụ); cột phụ «có phiên kỳ» |
| **B4** | VST có cần `ap_dung_jsonb` riêng? | **Không** — VST 1 chuyên đề; GSC dùng BK×khoa |
| **B5** | Ai duyệt seed 36 mẫu? | File Excel KSNK → script import, không agent đoán |

---

## 14. Rủi ro

1. **Seed sai phạm vi** → KPI oan; cần review KSNK trước Wave B production.
2. **Compose app vs RPC** — nhiều khoa × 36 BK; cache MDM BK một lần/request; theo dõi latency.
3. **Backward compat** — BK `ap_dung_jsonb = {}` → fallback gợi ý từ `phan_loai_chuyen_mon` (log warning), không crash.

---

## 15. Spec freeze (sau duyệt)

- `ap_dung_jsonb` schema v1 (§4).
- Breadth = **distinct BK**, không đếm phiên.
- Ba lớp KPI: bao phủ / cường độ / tuân thủ — không gộp.
- Ma trận: **N/A** ≠ **Thiếu**.
- Một cột JSON, không bảng phụ.

---

## 16. Exit intake

- [x] User duyệt Wave A + B scope
- [ ] KSNK cung cấp mapping 36 BK × phạm vi (B5) — seed metadata tạm; file mẫu `docs/data/bang-kiem/ap-dung-mapping-template.csv`
- [ ] B1–B4 xác nhận hoặc chấp nhận mặc định
- [ ] Sau Wave A: T-A1–T-A2 PASS
- [ ] Sau Wave B: T-B1–T-B3 PASS + verify:engineering
- [ ] Changelog `implementation-mapping.md`

---

## Tham chiếu code hiện tại

| Mục | Path |
|-----|------|
| Bảng BK | `gstt_dm_bang_kiem` — migration baseline |
| Form MDM | `bang-kiem-form-fields.tsx` |
| Gap / comparable | `supervision-matrix-mappers.ts` |
| GSC payload | `gsc-strategic.types.ts` — `gap_analysis`, `dynamic_checklists` |
| TGS trong RPC | `stype = 'TU_GIAM_SAT'` trong strategic RPC |
| Wave 2 ma trận | `SupervisionCoverageMatrix`, `bao-cao-tong-hop-print.ts` |
