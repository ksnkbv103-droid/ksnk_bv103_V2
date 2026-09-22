# Phân tích domain — Giám sát tuân thủ (VST + GSC) — v1.3

| Trường | Giá trị |
|--------|---------|
| Mã | `11-GIAM-SAT-TUAN-THU-domain-analysis-v1` |
| Phiên bản | **v1.3.1 local 2026-09-22** — NV ngoài danh mục + nhập tay (PO bắt buộc); inventory BK file 12 **filtered subset GS**; hoàn thiện domain; **chưa git commit/push** |
| Phạm vi | Hai họ form (WHO lưới · Bảng kiểm) · Module A/B/C · 6 chiều · hình thức · cách thức · đối soát KSNK≠TGS · đối tượng NV (MDM + ngoài DM) · inventory BM · gate trước code |
| Ngoài phạm vi | NKBV case-finding · CSSD inventory/6 trạm · QLCV · **không** sửa Word QT/QĐ · **không** sửa seed bảng kiểm codebase · **không** mở PR form/RPC khi Domain ready chưa xong |
| Trạng thái | Draft SSOT local — neo **trước** mọi chỉnh codebase W1 |
| Chủ sở hữu domain | Grok domain (artifact) · PO xác nhận mục `[PO xác nhận]` |
| Inventory BK | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](./12-BANG-KIEM-inventory-from-KSNK-final.md) |

> **Thay đổi so với v1.0:** tách rõ **ba module** (WHO cột tích ≠ bảng kiểm ngoại khoa ≠ GSC khác); khóa Domain A bám form WHO/BYT Phụ lục 6 + field code hiện có; **cấm** đưa form giám sát vào QT/HD VST; bảng giữ/sửa/bỏ; chỉnh nhẹ phân khu.
>
> **v1.1 / v1.1.1:** PO chốt — **6 chiều bắt buộc** Module A; Module B cùng bản chất bảng kiểm GSC (C).
>
> **v1.2:** Khung **Hình thức · Cách thức · Đối soát**; **Gate** domain-before-code.
>
> **v1.2.1:** PO chốt — NV Khoa KSNK **luôn** chuyên trách độc lập ≠ TGS; tách cứng lens.
>
> **v1.2.2:** PO chốt — **Hai họ form**: WHO lưới = *chỉ* VST TQ; Bảng kiểm = GSC *và* VST ngoại khoa.
>
> **v1.3:** PO chốt — **Đối tượng NV: ưu tiên MDM theo khoa + bắt buộc giữ «Ngoài danh mục» + nhập tay**; cờ thống kê `ngoai_danh_muc` (không chặn nhập); liên kết inventory file **12**; kế hoạch chuẩn bị data BK (inventory → normalize → map họ → seed sau); bỏ mọi khuyến nghị «cấm free-text NV».

---

## A. Nguyên tắc tách lớp

| Lớp | Là gì | Không phải | Neo |
|-----|-------|------------|-----|
| **QT / HD VST** (`KSNK.QT.07`, HD.01–03) | **Cách làm sạch tay** (chỉ định 5 thời điểm, 6 bước, ngoại khoa scrub/rub) | Form phần mềm giám sát; màn hình cột tích; engine BK | QT.07 nội dung kỹ thuật |
| **Module A — VST thường quy** | Phiếu **quan sát WHO** (cột tích theo cơ hội / 5 moments) | Bảng kiểm tiêu chí Đạt/KĐ/NA; quy trình rửa tay | BYT 3916 Phụ lục 6; QT.07 **BM.01**; `src/modules/giam-sat-vst/` |
| **Module B — VST ngoại khoa** | **Bảng kiểm kỹ thuật** scrub/rub (tiêu chí từng bước) | Lưới 5 moments làm mẫu số % thời điểm | QT.07 **BM.03**; catalog project **BM.07.03**; engine BK (label domain riêng) |
| **Module C — GSC khác** | Bảng kiểm thực hành KSNK theo BM/QT/QĐ khác | Form WHO cột tích; không gộp KPI với A | Inventory file **12**; `giam-sat-chung` + `gstt_dm_bang_kiem` |

**Cứng:**

1. **Không** chỉnh Word/QT.07 / HD để *chèn* UI giám sát — BM là **biểu mẫu kèm** (tài liệu), số hóa nằm ở **module giám sát** riêng.
2. **Không** dùng lưới 5 moments làm mẫu số chính cho Module B hoặc C.
3. **Hình thức** (TGS / Chuyên trách / Chéo) và **cách thức** (trực tiếp / camera…) **áp dụng phiên** trên A/B/C — **không** trộn lens % khi thống kê; **không** để cách thức thay lens hình thức.
4. Chỉ số chiến lược **thời điểm** (`ty_le_vst`) **chỉ** thuộc Module A. KPI kỹ thuật ngoại khoa thuộc Module B. `%` tiêu chí BK thuộc Module C (và B nếu chạy trên engine BK).
5. **Gate:** chưa đủ khung domain (§E–§H + §K checklist) → **không** mở lát code W1 sửa form/RPC/DB.
6. **Đối tượng NV:** ưu tiên chọn MDM theo khoa; **bắt buộc** giữ tùy chọn **Ngoài danh mục + nhập tay**; thống kê gắn cờ `ngoai_danh_muc` — **không chặn nhập** (§K).

```text
QT / QĐ / HD        →  “Làm thế nào đúng kỹ thuật / chính sách”
Module A (WHO)      →  “Quan sát có/không VST đúng chỉ định (5 moments)”
Module B (BK NK)    →  “Checklist từng bước kỹ thuật ngoại khoa”
Module C (GSC BK)   →  “Checklist thực hành KSNK khác”
Hình thức / cách thức / đối soát  →  ngữ cảnh phiên + lens thống kê (mọi module)
Đối tượng NV        →  MDM theo khoa  ∪  Ngoài danh mục + nhập tay (+ cờ)
Inventory file 12   →  **filtered subset** BK/phiếu quan sát GS (không mọi BM QT/QĐ) → catalog (seed sau)
```

---

## B. Domain Module A — VST thường quy (WHO observation)

### B.1 Cấu trúc phiếu (bám WHO / BYT Phụ lục 6 + form project)

**Header phiên** (một buổi quan sát) — field thật từ `useVSTForm` / `VST_SESSIONS_FULL_VIEW_SELECT`:

| Khái niệm WHO/BYT | Field project |
|-------------------|---------------|
| Khoa / đơn vị | `khoa_id` |
| Khu vực · vị trí | `khu_vuc_id` · `vi_tri` (form) / `vi_tri_cu_the` (view) |
| Hình thức · Cách thức | `hinh_thuc_giam_sat` / `hinh_thuc_id` · `cach_thuc_giam_sat` / `cach_thuc_id` (+ mã `ma_hinh_thuc_giam_sat`, `ma_cach_thuc_giam_sat`) |
| Giám sát viên | `nguoi_giam_sat_id` |
| Ngày · giờ | `ngay_giam_sat`, `thoi_gian_bat_dau`, `thoi_gian_ket_thuc` |
| Tổng hợp phiên | `tong_co_hoi`, `da_tuan_thu` |

**Lưới cơ hội** (WHO: tới 3 NVYT / phiếu; project: 3 cột `VSTFormPerson`):

| Cột WHO (Phụ lục 6) | Ý nghĩa | Field `VSTOpportunity` |
|---------------------|---------|-------------------------|
| Chỉ định / thời điểm | 5 ô tích (có thể chọn 1–2 khi tuân thủ) | `thoi_diems: MomentType[]` |
| Hành động | C / N / K | `hanh_dong`: `"Rửa tay bằng nước"` \| `"Chà tay bằng cồn"` \| `"Bỏ sót"` |
| Găng (G/Đ/S) | Có mang găng | `co_deo_gang: boolean \| null` |
| Bổ sung chất lượng nhẹ (không = BM.02 đầy đủ) | Đúng KT · đủ thời gian | `dung_ky_thuat`, `du_thoi_gian` |
| Thời điểm ghi | | `thoi_gian_ghi_nhan` |

**Map 5 moments (1:1 với `MOMENTS` trong `vst-constants.ts`):**

| # | WHO / BYT | Chuỗi code |
|---|-----------|------------|
| 1 | T-NB | `Trước khi tiếp xúc người bệnh` |
| 2 | T-VK | `Trước khi làm thủ thuật vô khuẩn` |
| 3 | S-DCT | `Sau khi có nguy cơ tiếp xúc với dịch` |
| 4 | S-NB | `Sau khi tiếp xúc người bệnh` |
| 5 | S-XQ NB | `Sau khi tiếp xúc xung quanh người bệnh` |

**Chỉ số đạt/cơ hội — chỉ Module A:**

```text
ty_le_vst = round( so_tuan_thu / tong_co_hoi × 100, 1 )
```

- Tuân thủ: `hanh_dong` ∈ {`"Rửa tay bằng nước"`, `"Chà tay bằng cồn"`} — `classifyVstAction(...).isCompliant`.
- `Bỏ sót` = không tuân thủ.
- `vstMaxIndications(hanh_dong)`: tuân thủ → tối đa 2 chỉ định; bỏ sót → 1 (khớp hướng dẫn WHO).
- Persist quan sát: `VST_OBSERVATION_FULL_VIEW_SELECT` gồm `thoi_diem` (persist) / `thoi_diems` (UI), `hanh_dong`, `dung_ky_thuat`, `du_thoi_gian`, `co_deo_gang`, …

**In phiếu:** `VSTPrintView` — `title="PHIẾU GIÁM SÁT THỰC HÀNH VỆ SINH TAY (WHO 5 THỜI ĐIỂM)"` — **giữ form hiện có; không invent UI lệch WHO.**

### B.2 Person cột + 6 chiều phiên (bắt buộc Module A)

- `VSTFormPerson`: `nghe_nghiep_id`, **`nhan_vien_id` *hoặc* (`is_manual` + `ten_manual`)** , `opportunities[]`.
- Sticky ngữ cảnh phiên: khoa / khu vực / vị trí (parity GSC).
- **Sáu chiều bắt buộc trên phiên Module A** (PO chốt 2026-09-22):  
  `khoa_id` → `khu_vuc_id` → `vi_tri` → `doi_tuong_loai` → `doi_tuong_ten` → `gan_nb`.  
  Lưới cột tích 5 thời điểm WHO là **nội dung quan sát trong phiên**, không thay thế 6 chiều ngữ cảnh.  
  *(Bãi bỏ mọi ghi chú cũ kiểu «VST đủ 6 = optional».)*
- **Đối tượng NV:** xem **§K** — MDM theo khoa **và** Ngoài danh mục + nhập tay (bắt buộc giữ).

### B.3 Tham chiếu hình thức / cách thức / đối soát

Chi tiết first-class: **§E Hình thức**, **§F Cách thức**, **§G Đối soát KSNK–TGS**.  
Lookup mã (`sys_lookup_value`) và lens RPC tóm tắt tại §E / §F; cấm trộn % lens trên một KPI điều hành.

### B.4 Khu vực / vị trí / đối tượng (giữ thiết kế, chỉnh nhẹ)

- **Khu vực:** `KHU_VUC_GIAM_SAT` seed project — **giữ danh mục** (mã dưới).
- **Vị trí:** free text trong khu; không master vị trí toàn viện W1.
- **Đối tượng A:** NVYT/HV — **ưu tiên MDM theo khoa**; **vẫn cho Ngoài danh mục + nhập tay** (§K). Cùng 6 chiều với GSC (xem B.2).

**Đề xuất `risk_tier` nhẹ** (metadata; không đổi công thức %; `[PO xác nhận]`):

| risk_tier | Mã (giữ) | Chỉnh v1.1+ |
|-----------|----------|-------------|
| **CAO** | `KV_PHONG_MO`, `KV_CAN_THIEP`, `KV_PHONG_SINH`, `KV_ICU_SACH`, `KV_NB_MIEN_DICH`, `KV_THU_THUAT_SACH`, `KV_CAP_CUU`, `KV_LOC_MAU`, `KV_ICU_CHUNG`, `KV_CACH_LY`, `KV_DA_KHANG`, `KV_CSSD_BAN`, `KV_VS_NGUY_CO_CAO`, **`KV_PHA_CHE`** (← nâng từ TRUNG) | Cân nhóm thu_tu 1xx vô khuẩn / xâm lấn |
| **TRUNG** | `KV_NOI_TRU`, `KV_KHAM_TT`, `KV_CDHA`, `KV_XET_NGHIEM`, `KV_CSSD_SACH`, `KV_VS_KHOA`, `KV_BE_MAT_TBYT`, **`KV_CHAT_THAI`** (← từ THAP) | Tiếp xúc NB / MT thường |
| **THAP** | `KV_HANH_CHINH`, `KV_SANH_CHO`, `KV_NHAN_VIEN`, `KV_NHA_AN`, `KV_BE_MAT_CC` | Hành chính / hỗ trợ |

Ghi chú seed: `KV_KHAM_TT`, `KV_BE_MAT_TBYT` đang `is_active=false` — **giữ mã**, không xóa.

### B.5 Chỉ số thống kê thuộc track A

| Chỉ số | Thuộc A? | Ghi chú |
|--------|----------|---------|
| `ty_le_vst` (5 moments) | **Có** | Lens một nguồn (xem §G) |
| `ty_le_vst_ky_thuat` (BM.02 / field nhẹ) | Có (tách chart) | **Không** gộp vào `ty_le_vst` thời điểm |
| `ty_le_vst_ngoai_khoa` | **Không** — Module B | |
| `ty_le_gsc` | **Không** — Module C (và B nếu BK) | |
| Workload 100–200 CH/khoa/tháng | Báo khối lượng A | **Không** KPI % |
| `ty_le_tgs` / `ty_le_ksnk` / `do_lech` / `ty_le_bao_phu_tgs` | Phân tích đối soát (§G) | Không badge xếp hạng fold `/thong-ke` |
| Tỷ lệ / số phiên có `ngoai_danh_muc=true` | Phân tích phụ | Cờ PO — **không** chặn nhập (§K) |

---

## C. Domain Module B — VST ngoại khoa (bảng kiểm kỹ thuật)

### C.1 Bản chất

- Quan sát **kỹ thuật** scrub (xà phòng sát khuẩn) / rub (cồn ngoại khoa) **trước PT**.
- Hình thức UI = **bảng kiểm** tiêu chí Đạt / Không đạt / NA (hoặc PASS_FAIL theo seed) — **không** lưới 5 moments.
- Mẫu số KPI = số lần đánh giá / số tiêu chí áp dụng — **không** `tong_co_hoi` WHO.
- **PO chốt:** Module B **cùng họ bảng kiểm GSC (Module C)** — phân biệt bằng mã BM / nhãn chuyên đề, không tạo track WHO cho ngoại khoa.

### C.2 Neo biểu mẫu

| Mã viện | Vai trò |
|---------|---------|
| `KSNK.QT.07.BM.03` | BM viện — đánh giá kỹ thuật NK (bắt buộc chấm riêng bước chà cồn — HĐKSNK 31/07) |
| `KSNK.QT.07.HD.03` | Hướng dẫn kỹ thuật (thuộc lớp QT — không phải form GS) |
| Catalog project **`BM.07.03`** | «Bảng kiểm giám sát tuân thủ kỹ thuật VST ngoại khoa» trong `docs/data/bang-kiem/canonical-36.md` (PASS_FAIL / STAFF) |

Xem inventory **file 12** §D.

### C.3 Quan hệ phần mềm

- **Ưu tiên:** reuse **engine bảng kiểm** Module C (`gstt_dm_bang_kiem` + phiên GSC) với **domain label / filter** `VST_NGOAI_KHOA` (hoặc `ma_bk = BM.07.03`) — KPI analytics **tách** khỏi `ty_le_vst`.
- **Không** nhánh “track flag” trên cùng lưới WHO làm mẫu số chính (tránh trộn).
- `[PO xác nhận]` Phiên riêng vs template BK trên `giam-sat-chung` vs route riêng — miễn KPI tách và UI là checklist.

### C.4 KPI Module B

```text
ty_le_vst_ngoai_khoa = đạt BM.03/BM.07.03 (có thể tách mục chà cồn) / số lần (hoặc tiêu chí) đánh giá NK
```

Mục tiêu viện (tham chiếu): ≥90% → 100% `[PO xác nhận]` mốc thời gian.

Đối soát lens TGS vs Chuyên trách trên Module B: **cùng logic §G**, mẫu số = tiêu chí/lần BK (không phải cơ hội WHO).

Đối tượng NV trên phiên B: **cùng §K** (MDM + ngoài danh mục).

---

## D. Domain Module C — GSC bảng kiểm khác

- Engine: chọn `BangKiemMau` → điền tiêu chí `DAT` / `KHONG_DAT` / `NA` → `% = đạt / tiêu chí áp dụng`.
- **6 chiều** bắt buộc (thống nhất với Module A): `khoa_id` · `khu_vuc_id` · `vi_tri` · `doi_tuong_loai` · `doi_tuong_ten` · `gan_nb`.
- **Đối tượng NV:** **cùng §K** — MDM filter theo khoa + Ngoài danh mục + nhập tay.
- Nguồn danh mục BM: **file 12** (inventory từ Drive KSNK_final) — seed catalog **sau** khi PO tick inclusion (§L).
- Ví dụ ranh giới: ICRA, PPE, VS MT, gói SSI/CLABSI/CAUTI/VAP… — **không** phải phiếu WHO; **không** dùng làm `ty_le_vst`.
- Module B **chạy trên cùng họ engine** nhưng **domain label + KPI + seed BM** khác C “thường”.
- Hình thức / cách thức / đối soát: áp dụng phiên như A/B — xem §E–§G.

---

## E. Hình thức giám sát (first-class)

**Định nghĩa:** ai đứng quan sát so với đơn vị được quan sát — **thuộc tính phiên**, dùng để **derive lens thống kê** (TGS / Chuyên trách / Chéo).  
**Khác** cách thức (§F): hình thức = *ai / quan hệ tổ chức*; cách thức = *phương pháp thu thập*.

### E.1 Ba giá trị canonical

Khớp nhãn `src/lib/supervision-policy.ts` và lookup `HINH_THUC_GIAM_SAT`:

| Giá trị (nhãn) | Mã lookup | Định nghĩa nghiệp vụ | Quy tắc derive | Ai thường dùng |
|----------------|-----------|----------------------|----------------|----------------|
| **Tự giám sát** | `HT_TU_GIAM_SAT` | Quan sát viên thuộc cùng khoa được quan sát (mạng lưới / NV khoa đó) | `khoa_GS == khoa_được_GS` **và** người GS **không** thuộc biên chế chuyên trách Khoa KSNK | ML.KSNK tại khoa lâm sàng |
| **Giám sát chuyên trách** | `HT_CHUYEN_TRACH` | Quan sát viên Khoa KSNK (độc lập) | người GS thuộc Khoa KSNK | Khoa KSNK **chỉ** vai trò này |
| **Giám sát chéo** | `HT_GIAM_SAT_CHEO` | Khoa lâm sàng A quan sát khoa B — **không** phải NV Khoa KSNK | `khoa_GS ≠ khoa_được_GS` **và** không phải chuyên trách KSNK | Khoa lâm sàng chéo |

**Logic derive (khớp PO v1.2.1 — KSNK ≠ TGS):**

```text
if người GS thuộc Khoa KSNK (biên chế chuyên trách)
    → luôn Giám sát chuyên trách     # không bao giờ TGS / Chéo / mạng lưới
else if khoa_GS == khoa_được_GS
    → Tự giám sát
else if khoa_GS ≠ khoa_được_GS
    → Giám sát chéo
else
    → Tự giám sát
```

> Code hiện tại (`resolveSupervisorPolicy`) có nhánh «KSNK cùng khoa → Tự giám sát» — **lệch domain v1.2.1+**. Sửa code **chỉ sau** gate §H; domain này là chuẩn.

### E.2 Field phiên + thống kê

- Persist: `hinh_thuc_giam_sat` / `hinh_thuc_id` / `ma_hinh_thuc_giam_sat`.
- **Auto-derive trên phiên** từ hồ sơ người GS + `khoa_id` được quan sát — **không** để người dùng tự chọn tùy tiện làm lệch thống kê.
- Override thủ công: **chỉ nếu PO cho phép** — ghi `[PO xác nhận]` chính sách override (ai được, audit log).
- Lens RPC / analytics: `TU_GIAM_SAT` · `KSNK` (chuyên trách) · `CHEO`.  
  - `ty_le_tgs` ← phiên Tự giám sát.  
  - `ty_le_ksnk` ← phiên Chuyên trách.  
  - **CHEO không vào** `ty_le_tgs` / `ty_le_ksnk` chính (có thể báo riêng nếu PO yêu cầu).

### E.3 Cạnh biên ML / KSNK — **đã khóa PO**

NV **biên chế Khoa KSNK** **không** được derive thành TGS / mạng lưới / Chéo.  
Edge case «biên chế KSNK đang làm ML tại khoa LS» — **không hợp lệ trong domain** (PO 2026-09-22 16:03). Không cần `[PO xác nhận]` nữa.

---

## F. Cách thức giám sát (DM — phương pháp thu thập)

**Định nghĩa:** *làm thế nào* thu thập quan sát (trực tiếp / camera…).  
**Khác hình thức:** cách thức **không** thay lens KSNK/TGS; **không** vào công thức `% tuân thủ`.

### F.1 Danh mục hiện có (project)

| Mã | Nhãn | Ghi chú |
|----|------|---------|
| `CT_TRUC_TIEP` | Trực tiếp tại chỗ | Mặc định thường quy |
| `CT_CAMERA_TRUC_TIEP` | Camera trực tiếp | Theo thời gian thực |
| `CT_CAMERA_LAI` | Camera xem lại | Giám sát lại qua ghi hình |

**BYT 3916** còn nêu *gián tiếp hóa chất* — **chỉ thêm vào DM nếu project quyết định dùng**; không invent mã khi chưa có nhu cầu (`[PO xác nhận]`).

### F.2 Vai trò trong thống kê

- Dùng để **lọc / ma trận** (vd. % tuân thủ theo cách thức × khoa) — **không** trộn vào mẫu số `% tuân thủ` chính, **không** đổi lens hình thức.
- Field phiên: `cach_thuc_giam_sat` / `cach_thuc_id` / `ma_cach_thuc_giam_sat`.

### F.3 Map QT.33 / BYT 3916 — không over-engineer

| Yêu cầu nghiệp vụ | Đề xuất domain |
|-------------------|----------------|
| Không báo trước lịch thường quy | **Policy vận hành / ghi chú phiên** (hoặc checkbox nhẹ) — **không** tạo hình thức mới; **không** nhét vào công thức % |
| Overt vs covert | Gắn **cách thức** (camera xem lại ≈ ít bị phát hiện hơn trực tiếp) **hoặc** ghi chú phiên — chọn **một** cơ chế; tránh song song 2 enum |
| Phản hồi sau buổi GS | Quy trình QT — ngoài công thức KPI |

---

## G. Đối soát Khoa KSNK ↔ khoa lâm sàng (TGS)

### G.1 Mục đích

Phát hiện **lệch nhận thức / thiên lệch** giữa tự giám sát (TGS) tại khoa lâm sàng và chuẩn độc lập của Khoa KSNK — phục vụ cải tiến chất lượng quan sát, **không** xếp hạng cá nhân trên fold `/thong-ke`.

### G.2 Lens — tách %, cấm trộn

| Lens | Nguồn phiên (hình thức) | Chỉ số |
|------|-------------------------|--------|
| **Tự giám sát (TGS)** | `HT_TU_GIAM_SAT` | `ty_le_tgs` |
| **Chuyên trách (KSNK)** | `HT_CHUYEN_TRACH` | `ty_le_ksnk` |
| Chéo | `HT_GIAM_SAT_CHEO` | **Không** gộp vào hai chỉ số trên |

**Cấm:** trung bình / cộng gộp `%` TGS + KSNK trên cùng một chỉ số điều hành; cấm dùng cách thức để “giả” lens.

### G.3 Khi nào comparable (theo khoa / kỳ)

Khoa (hoặc đơn vị cắt) **comparable** khi **cả hai** nguồn có mẫu số > 0 trong kỳ:

```text
comparable = (mau_so_tgs > 0) AND (mau_so_ksnk > 0)
```

- Module A: mẫu số = `tong_co_hoi` (theo lens).  
- Module B/C: mẫu số = số tiêu chí áp dụng / số lần đánh giá (theo lens).  
Nếu một phía = 0 → **không** tính `do_lech`; UI hiển thị “thiếu mẫu đối soát”.

### G.4 Bộ chỉ số bắt buộc

```text
ty_le_tgs              = % tuân thủ (hoặc % đạt BK) trên phiên Tự giám sát
ty_le_ksnk             = % tuân thủ (hoặc % đạt BK) trên phiên Chuyên trách
do_lech                = ty_le_tgs − ty_le_ksnk     # chỉ khi comparable
ty_le_bao_phu_tgs      = độ rộng BK/cơ hội có phiên TGS / khung kỳ
```

**Diễn giải `do_lech`:**

| Dấu | Ý nghĩa nghiệp vụ (gợi ý) |
|-----|---------------------------|
| `do_lech > 0` | TGS cao hơn KSNK — nghi thiên lệch lạc quan / khác chuẩn quan sát |
| `do_lech < 0` | TGS thấp hơn KSNK — nghi TGS nghiêm hơn hoặc lệch mẫu |
| `do_lech ≈ 0` | Hai nguồn hội tụ (vẫn cần đủ mẫu) |

**`ty_le_bao_phu_tgs`:** đo **độ rộng bao phủ** (có phiên TGS trên bao nhiêu cơ hội/BK/khung) — **không thay** `% tuân thủ`; không đưa vào công thức `ty_le_vst` / `ty_le_gsc`.

### G.5 Áp dụng Module A và Module B/C

| | Module A (WHO) | Module B/C (bảng kiểm) |
|--|----------------|------------------------|
| Logic lens | Giống §G.2 | Giống §G.2 |
| Mẫu số | Cơ hội WHO (`tong_co_hoi`) | Tiêu chí áp dụng / lần đánh giá |
| Chỉ số gốc | `ty_le_vst` theo lens | `ty_le_vst_ngoai_khoa` / `ty_le_gsc` theo lens |
| `do_lech` | Trên `%` thời điểm | Trên `%` tiêu chí BK |

### G.6 Báo cáo & ẩn danh

- Đối soát nằm **lớp phân tích / BCTH nâng cao** — **không** đưa lại badges xếp hạng trên fold `/thong-ke`.
- Báo cáo công khai: **không nêu tên** NV được quan sát (chỉ khoa / nhóm nghề nếu cần).  
  Chính sách lưu tên nội bộ: `[PO xác nhận]` (không lưu / chỉ KSNK / che trên báo cáo công khai).
- Phiên `ngoai_danh_muc=true`: vẫn vào mẫu số lens nếu đủ field; báo cáo PO có thể **lọc / gắn cờ** riêng (§K) — không loại khỏi `%` trừ khi PO quyết định khác.

---

## H. Gate triển khai — domain trước code

> **Chưa đủ domain → không mở lát code W1 sửa form/RPC.**

Mọi PR/chỉnh `giam-sat-vst` / `giam-sat-chung` / RPC strategic / migration liên quan hình thức–cách thức–đối soát–đối tượng NV **chỉ** sau khi checklist dưới được PO tick.

### H.1 Checklist «Domain ready»

- [ ] **Glossary:** hình thức, cách thức, TGS, lens, `do_lech`, 6 chiều A+C (và B trên họ BK), `ngoai_danh_muc`
- [ ] **Ranh giới** Module A vs B/C (WHO ≠ bảng kiểm; B cùng họ C) + **hai họ form**
- [ ] **Quy tắc derive hình thức** (KSNK luôn chuyên trách) — khớp §E.1
- [ ] **Đối tượng NV:** MDM + Ngoài danh mục + nhập tay + cờ thống kê (§K) — PO đã chốt giữ
- [ ] **Bộ chỉ số bắt buộc** + đủ mẫu (`ty_le_tgs`, `ty_le_ksnk`, `do_lech`, `ty_le_bao_phu_tgs`; min-N A/C)
- [ ] **Policy ẩn danh** tên NV đối tượng trên báo cáo công khai
- [ ] **`risk_tier` khu vực** (chỉnh nhẹ PHA_CHE / CHAT_THAI) chốt PO
- [ ] **Inventory BM file 12** đã rà; PO tick inclusion catalog (§L) *trước* seed

### H.2 Hệ quả gate

| Trạng thái checklist | Được phép | Không được phép |
|----------------------|-----------|-----------------|
| **Chưa xong** | Soạn/duyệt domain pack local; ghi `[PO xác nhận]` | Mở PR sửa form / RPC / DB; “lát code W1” hình thức–lens–đối soát–cấm free-text NV |
| **Đã xong (PO tick)** | Mở lát code theo SRS/metric đã khóa | Vẫn **không** sửa Word QT; không badge xếp hạng `/thong-ke`; không xóa tùy chọn Ngoài danh mục |

---

## I. Chỉnh domain hiện tại — bảng giữ / sửa / bỏ

### I.1 So với file 11 v1.0 → v1.3

| Hạng mục | Quyết định | Lý do |
|----------|------------|-------|
| Gộp «VST thường quy + ngoại khoa + GSC» một narrate | **Sửa** → Module A/B/C tách | PO: ba module khác nhau |
| Track NGOAI_KHOA trên mental model 5 moments | **Sửa** — A = WHO; B = BK (họ C) | Tránh mẫu số NK = cơ hội WHO |
| Nhét form GS vào QT.07 | **Bỏ** | QT = kỹ thuật; GS = module riêng |
| BM.01–04 không tách B | **Sửa** — BM.01→A (WHO); BM.02 hỗ trợ A (BK); BM.03→B; BM.04 báo cáo | Ranh giới rõ |
| Lookup hình thức/cách thức · lens · cấm CCS/badge | **Giữ** + **mở rộng first-class §E–§G** | PO yêu cầu khung đầy đủ trước code |
| «VST không bắt buộc 6 chiều» / optional 6 chiều A | **Bỏ** | PO chốt 6 chiều bắt buộc cả Module A |
| Phân khu `KHU_VUC_GIAM_SAT` | **Giữ** danh mục; **sửa nhẹ** tier | Không redesign |
| RACI · derive stype | **Giữ** + chi tiết §E; **sửa** nhánh KSNK→TGS | PO: KSNK ≠ TGS |
| Công thức `ty_le_vst` / min-N / workload≠KPI% | **Giữ** — nhấn chỉ A | |
| Đối soát `do_lech` / bao phủ TGS | **Thêm / chuẩn hóa §G** | PO: mục đích · comparable · lens tách |
| Gate domain-before-code | **Thêm §H** | Chưa đủ domain → không mở code W1 |
| Ranking badge Action board | **Bỏ** (không hồi) | PO đã cắt |
| Khuyến nghị «cấm free-text NV» / «không Ngoài danh mục» | **Bỏ / mâu thuẫn — cấm xuất hiện** | PO v1.3: **bắt buộc giữ** Ngoài DM + nhập tay |
| Đối tượng NV MDM-only | **Sửa** → MDM ưu tiên + Ngoài DM | §K |
| Inventory BM Drive | **Thêm §L + file 12** | PO: danh sách data BK |

### I.2 Việc **không** làm

- Không `git commit` / `push` / PR từ revision này.
- Không sửa file Word QT/QĐ/HD để gắn form GS.
- Không invent UI WHO mới lệch Phụ lục 6 / form `giam-sat-vst` hiện có.
- Không gộp CCS VST+GSC; không badge fold `/thong-ke`.
- **Không mở lát code W1 sửa form/RPC** khi checklist §H.1 chưa tick.
- **Không sửa seed bảng kiểm / canonical trong codebase** trong task inventory này.
- **Không** loại bỏ tùy chọn Ngoài danh mục / nhập tay tên NV.

---

## J. Kế hoạch chỉnh pack/domain (local only)

| Bước | Việc | Owner | DoD /约束 |
|------|------|-------|-----------|
| **J0** | Rewrite file 11 + README 11 → **v1.3**; tạo file **12** inventory | Grok | Unstaged OK; **không** commit/push |
| **J1** | Pack `01` glossary: hình thức · cách thức · TGS · lens · `do_lech` · 6 chiều · `ngoai_danh_muc` · Module A/B/C · «QT ≠ form GS» | Grok domain | Diff local; `[PO xác nhận]` giữ |
| **J2** | Pack `02`/`06`/`08`: entity · risk_tier · coverage map tách A/B/C · field phiên · đối tượng NV | Grok | Không đụng NKBV/CSSD |
| **J3** | SRS `07` + metric-dictionary: FR WHO A; FR BK B; đối soát; NV ngoài DM; **gate** trước code | Grok spec → Cursor **chỉ khi** §H tick | Không mâu thuẫn dictionary |
| **J4** | Normalize mã BM (file 12 → short code) + seed **sau** PO tick inclusion | KSNK nội dung · Cursor seed | UAT ký; **không** làm trong J0 |
| **J5** | UAT: phiên A · B · C · derive hình thức · lens · đối soát · ngoài DM · ẩn danh | Nghĩa + Khoa | ≥ kịch bản PASS |

---

## K. Đối tượng nhân viên (MDM + Ngoài danh mục) — **PO khóa v1.3**

### K.1 Quy tắc bắt buộc

1. **Ưu tiên** chọn nhân viên từ **MDM** đã lọc theo **khoa** đang giám sát (và nghề nếu form có).
2. **Bắt buộc giữ** tùy chọn **«Ngoài danh mục»** + **nhập tay** họ tên (free-text) trên form quan sát (Module A **và** họ Bảng kiểm B/C khi đối tượng = NV).
3. **Cấm** mọi khuyến nghị domain / SRS / UX kiểu «cấm free-text NV», «bỏ Ngoài danh mục», «chỉ cho chọn MDM», «chặn lưu nếu không có `nhan_vien_id`».
4. Khi chọn Ngoài danh mục / nhập tay: gắn cờ **`ngoai_danh_muc = true`** (persist phiên hoặc dòng đối tượng) để **PO / phân tích** biết tỷ lệ quan sát ngoài master — **không** dùng cờ để chặn nhập hay loại khỏi mẫu số tuân thủ mặc định.

### K.2 Field gợi ý (parity code hiện có)

| Khái niệm | Field (tham chiếu project) | Ghi chú |
|-----------|----------------------------|---------|
| NV trong MDM | `nhan_vien_id` | Filter `khoa_id` |
| Ngoài danh mục | `is_manual` / tương đương | UI: chọn «Ngoài danh mục» |
| Tên nhập tay | `ten_manual` / `ten_manual_nhan_vien` / `doi_tuong_ten` | Bắt buộc khi manual |
| Cờ thống kê | `ngoai_danh_muc` (bool) | Derive từ `is_manual` hoặc persist riêng |
| Nghề | `nghe_nghiep_id` / `doi_tuong_loai` | Vẫn chọn được khi manual |

### K.3 Thống kê & báo cáo

- Báo cáo điều hành có thể có **chỉ số phụ**: số / % cơ hội hoặc phiên có `ngoai_danh_muc=true` theo khoa / kỳ — phục vụ PO biết chất lượng master dữ liệu.
- **Không** loại tự động các quan sát ngoài danh mục khỏi `ty_le_vst` / `ty_le_gsc` / lens TGS–KSNK trừ khi PO ban hành rule khác sau này.
- Báo cáo công khai vẫn **ẩn danh** tên (§G.6) — kể cả tên nhập tay.

### K.4 Áp dụng

| Họ form / module | Áp dụng §K? |
|-----------------|-------------|
| Module A — WHO | **Có** (cột person) |
| Module B/C — Bảng kiểm (đối tượng NV) | **Có** |
| Đối tượng = người bệnh / môi trường / không phải NV | Không bắt buộc nhập tên NV; ngoài phạm vi «Ngoài danh mục NV» |

---

## L. Inventory bảng kiểm & kế hoạch chuẩn bị data

### L.1 Neo inventory

- File: [`12-BANG-KIEM-inventory-from-KSNK-final.md`](./12-BANG-KIEM-inventory-from-KSNK-final.md) (**v1.1 filtered**)
- Nguồn Drive: folder **«Quy trình, quy định, mô tả vị trí việc làm KSNK_final»**
- Cross-check: `/workspace/ipc-updated/QT|QD/*.md`
- **Phạm vi seed giám sát (PO 2026-09-22):** inventory file 12 = **filtered subset** — chỉ mẫu **bảng kiểm / phiếu quan sát** phục vụ **công tác giám sát tuân thủ** (WHO + BK Đạt/KĐ/NA tại điểm chăm sóc / chuyên đề). **Không** = mọi BM trong QT/QĐ (sổ, biên bản, phiếu hành chính, đào tạo BDNL, NKBV case-finding, nhật ký CSSD thuần vận hành → OUT).
- Counts (v1.1): IN SCOPE **66** (WHO **1** · BK **65**) · EXCLUDE **69** / corpus 135 — chi tiết §2–§4 file 12.
- **Không** sửa seed / Word trong bước này

### L.2 Pipeline chuẩn bị data (seed = bước sau)

```text
1. Inventory filtered (file 12 v1.1)   ← local — PO filter giám sát
2. PO tick dòng «cần PO» trong §2 file 12
3. Normalize mã BM                    ← KSNK.QT/QĐ.*.BM.* ↔ short BM.* / gstt_dm
4. Map họ form                        ← WHO vs BK (đã gắn)
5. Seed / migration catalog           ← OUT OF SCOPE task này (cấm đụng seed cũ)
```

### L.3 QT.07 trong catalog (nhắc lại)

| Mã viện | Họ form domain |
|---------|----------------|
| `KSNK.QT.07.BM.01` | **WHO lưới** (Module A) |
| `KSNK.QT.07.BM.02` | **Bảng kiểm** (kỹ thuật TQ — KPI tách) |
| `KSNK.QT.07.BM.03` | **Bảng kiểm** (VST ngoại khoa — Module B) |
| `KSNK.QT.07.BM.04` | Báo cáo / tổng hợp — không form quan sát |

---

## Phụ lục

### P1. Công thức (khóa)

```text
ty_le_vst              = round( so_tuan_thu / tong_co_hoi × 100, 1 )          # Module A, một lens
ty_le_vst_ky_thuat     = đạt đánh giá kỹ thuật TQ / số lần                     # tách A
ty_le_vst_ngoai_khoa   = đạt BM.03|BM.07.03 / số lần (hoặc tiêu chí)         # Module B
ty_le_gsc              = round( so_dat / so_tieu_chi_ap_dung × 100, 2 )       # Module C (+B nếu BK)
ty_le_tgs              = % trên phiên HT_TU_GIAM_SAT                           # theo module
ty_le_ksnk             = % trên phiên HT_CHUYEN_TRACH                          # theo module
do_lech                = ty_le_tgs − ty_le_ksnk   # chỉ khi comparable
ty_le_bao_phu_tgs      = độ rộng có phiên TGS / khung kỳ   # ≠ % tuân thủ
đủ_mẫu_VST             = tong_co_hoi ≥ 20
đủ_mẫu_GSC             = tong_quan_sat ≥ 30
# Phụ (PO phân tích master):
ty_le_ngoai_danh_muc   = số quan sát/phiên ngoai_danh_muc / tổng   # không thay % tuân thủ
```

**Cấm:** CCS `0.5×VST+0.5×GSC`; trung bình các % khi gộp kỳ; **trộn TGS+KSNK một KPI**; dùng cách thức thay lens hình thức; **khuyến nghị bỏ free-text NV / bỏ Ngoài danh mục** (PO bắt buộc giữ).

### P2. BYT 3916 §8 (tóm tắt)

- Tuân thủ **thời điểm** (+ găng): tối thiểu **hằng tháng** — phương pháp trực tiếp / camera / gián tiếp hóa chất → **Module A** (+ cách thức §F).
- **Kỹ thuật** thường quy + **ngoại khoa**: **hằng quý** → kỹ thuật TQ hỗ trợ A; ngoại khoa → **Module B**.
- Ưu tiên khu nguy cơ cao; phản hồi sau buổi GS; báo HĐ/BGĐ theo kỳ.
- Lịch thường quy **không báo trước** — policy vận hành / ghi chú; không over-engineer enum.

### P3. `[PO xác nhận]` còn mở

1. Map `risk_tier` cuối (bảng B.4 — gồm nâng `KV_PHA_CHE`, `KV_CHAT_THAI`).
2. Module B: chỉ template BK trên GSC engine vs route/phiên riêng.
3. Chính sách ẩn danh tên NV đối tượng (không lưu / chỉ KSNK / che trên báo cáo công khai).
4. Override thủ công hình thức — có mở cửa không (ai, audit).
5. Mốc lộ trình CT 06/2026: TQ 80→85→90 · kỹ thuật 50→60 · ngoại khoa 90→100.
6. Có thêm cách thức «gián tiếp hóa chất» vào DM project hay không.
7. Inclusion list file 12 v1.1: tick các dòng digital=`cần PO` (audit quản trị / CSSD hybrid) trước seed đợt 1.

*(Đã khóa — không còn mở: 6 chiều A; hai họ form; KSNK ≠ TGS; **giữ Ngoài danh mục + nhập tay**.)*

### P4. Nguồn đã verify khi soạn v1.1 → v1.3

- Code Module A: `src/modules/giam-sat-vst/lib/vst-constants.ts`, `vst-form-model.ts`, `vst-observation-persist-fields.ts`, `vst-read-view-select.ts`, `vst-action-classifier.ts`, `vst-form-submit.ts`; UI `components/VSTOpportunityForm.tsx`, `VSTAssessmentSection.tsx`, `VSTPrintView.tsx`, `VSTForm.tsx`; hook `hooks/useVSTForm.ts`
- Hình thức derive: `src/lib/supervision-policy.ts` — nhãn `Tự giám sát` / `Giám sát chuyên trách` / `Giám sát chéo` (**cần chỉnh** cho khớp §E.1 sau gate)
- BYT QĐ 3916: `/workspace/ipc-iso/ref/hd_vst_3916.txt` — Phụ lục 6 (phiếu quan sát cột tích)
- QT/QĐ viện: `/workspace/ipc-updated/QT|QD/` + Drive folder KSNK_final — BM là **tài liệu kèm**; **không** sửa Word
- Inventory: `12-BANG-KIEM-inventory-from-KSNK-final.md`
- Bảng kiểm NK: `docs/data/bang-kiem/canonical-36.md` → `BM.07.03`
- Seed khu vực: `supabase/seed.sql` — `KHU_VUC_GIAM_SAT`
- Metric: `docs/modules/dashboard/metric-dictionary.md`

---

## PO chốt (tích lũy) — 2026-09-22 (Asia/Saigon)

1. **Sáu chiều phiên bắt buộc cả Module A (VST thường quy)** — thống nhất với GSC; bãi bỏ “optional 6 chiều VST”.
2. **Module B (VST ngoại khoa) cùng họ bảng kiểm GSC (Module C)** — không phải form WHO cột tích.
3. **Hình thức · cách thức · đối soát KSNK–TGS** phải có trong domain đầy đủ (định nghĩa, derive, field phiên, chỉ số, lens) **trước** khi quyết định chỉnh codebase.
4. **Gate:** *Chưa đủ domain → không mở lát code W1 sửa form/RPC.*
5. **NV Khoa KSNK = chỉ giám sát chuyên trách độc lập** — không làm mạng lưới/TGS; thống kê tách cứng TGS vs KSNK.
6. **Hai họ form:** WHO lưới = chỉ VST TQ; Bảng kiểm = GSC + VST ngoại khoa.
7. **Đối tượng NV (v1.3):** ưu tiên MDM theo khoa; **bắt buộc giữ Ngoài danh mục + nhập tay**; cờ `ngoai_danh_muc` cho phân tích — **không chặn nhập**. Bỏ mọi khuyến nghị cấm free-text NV.

---

## PO chốt 2026-09-22 (16:03 Asia/Saigon) — KSNK ≠ mạng lưới TGS

1. **Nhân viên chuyên trách Khoa KSNK luôn là giám sát chuyên trách độc lập.**  
   Không được phân công / derive họ thành «mạng lưới» hay **Tự giám sát** cho khoa lâm sàng khác (hoặc bất kỳ khoa nào ngoài vai trò chuyên trách).

2. **Tự giám sát (TGS)** chỉ gồm quan sát viên thuộc **đúng khoa được giám sát** (mạng lưới KSNK tại khoa / NV khoa đó).  
   **Giám sát chéo** = khoa lâm sàng A quan sát khoa B — **không** phải nhân viên Khoa KSNK.

3. **Tách cứng trên phân tích · tổng hợp · thống kê:**  
   - Lens **Chuyên trách (KSNK)** và lens **Tự giám sát (TGS)** luôn xem riêng.  
   - **Cấm trộn %** tuân thủ hai nguồn trên cùng chỉ số điều hành.  
   - Đối soát (`do_lech`, bao phủ TGS) là lớp so sánh *sau* khi đã tính từng lens — không gộp mẫu số.

4. Edge case cũ «biên chế Khoa KSNK đang làm ML tại khoa LS» — **không hợp lệ trong domain**; không cần `[PO xác nhận]` nữa.

---

## PO chốt 2026-09-22 (16:10 Asia/Saigon) — Hai họ form (khóa cứng)

Domain giám sát tuân thủ chỉ còn **hai họ form** — không mô tả VST ngoại khoa như «module VST» song song với WHO.

| Họ form | Thuộc những gì | UI / mẫu số | Không phải |
|---------|----------------|-------------|------------|
| **Họ 1 — Lưới quan sát WHO** | **Chỉ** giám sát **VST thường quy** (5 thời điểm / cơ hội) | Cột tích theo chuẩn WHO + BYT Phụ lục 6; như đã triển khai `giam-sat-vst`; % = đạt / `tong_co_hoi` | Bảng kiểm tiêu chí Đạt/KĐ/NA |
| **Họ 2 — Bảng kiểm** | **Mọi** bảng kiểm giám sát chung **và** bảng kiểm **VST ngoại khoa** (cùng dạng) | Tiêu chí Đạt / Không đạt / NA; % = đạt / tiêu chí áp dụng (loại NA); cùng engine/họ `giam-sat-chung` + catalog BM | Lưới 5 moments WHO |

**Hệ quả domain**

1. «Module A» = duy nhất họ lưới WHO (VST thường quy) + **6 chiều phiên** bắt buộc.
2. «Module B» (VST ngoại khoa) **không** đứng riêng tư cách form: xếp **trong họ bảng kiểm**, cạnh các BK giám sát chung; khác nhau chủ yếu ở **mã BM / nội dung tiêu chí / nhãn chuyên đề**, không ở kiểu form.
3. Thống kê strategic kiểu `ty_le_vst` (cơ hội WHO) **chỉ** họ 1. KPI VST ngoại khoa đi theo **họ bảng kiểm** (cùng logic GSC), có thể lọc theo mã BM ngoại khoa.
4. Hình thức (TGS / Chuyên trách / Chéo) + cách thức + đối soát KSNK↔TGS áp dụng **cả hai họ**, vẫn tách lens, cấm trộn %.

Từ v1.2.2: mọi chỗ còn gọi B là «track VST» hoặc «module VST thứ hai» coi như **lệch domain** — phải đọc lại theo bảng trên.

---

## PO chốt 2026-09-22 (16:22 Asia/Saigon) — Ngoài danh mục NV + inventory BK

1. Domain **phải** giữ tùy chọn **Ngoài danh mục** và **nhập tay** tên NV; ưu tiên MDM theo khoa nhưng **không** cấm free-text.
2. Thống kê được gắn cờ `ngoai_danh_muc` để PO phân tích — **không** chặn nhập.
3. Bảng kiểm / BM từ folder Drive KSNK_final được inventory tại **file 12**; đưa vào domain qua §L; **không** sửa seed/code bảng kiểm cũ trong bước này.
4. **PO 2026-09-22 (filter):** inventory giám sát = **chỉ** BK/phiếu quan sát tuân thủ — không seed mọi BM QT/QĐ; file 12 v1.1 = filtered subset.

---

*Hết artifact **v1.3 local** 2026-09-22 (Asia/Saigon). Working tree docs only — **không** git commit / push / origin từ executor.*

---

## PO chốt 2026-09-22 (18:51 Asia/Saigon) — Khối chuyên đề Vệ sinh tay

### Quyết định
1. **Một khối chuyên đề «Vệ sinh tay»** trên điều hướng nhập liệu + báo cáo/BCTH, gồm **ba mẫu**:
   - **WHO / BM.01** — lưới 5 thời điểm (form `/giam-sat-vst` hiện có)
   - **BM.02** — bảng kiểm kỹ thuật VST thường quy (form BK GSC hiện có)
   - **BM.03** — bảng kiểm VST ngoại khoa (form BK GSC hiện có)
2. **Không** gộp ba mẫu thành một form hay một `%` duy nhất. Ba chỉ số **đặt cạnh nhau** (cùng kỳ / khoa / lens TGS|KSNK).
3. **Các chuyên đề khác** (PTPH, môi trường, đồ vải, CSSD quan sát tuân thủ, SSI…) nằm **module giám sát chung** (họ bảng kiểm) + lọc `chuyen_de`.
4. Engine kỹ thuật có thể vẫn 2 route (`giam-sat-vst` / `giam-sat-chung`); **khối chuyên đề** là lớp IA + báo cáo, không phá form cũ.

### Rà soát có hướng nào phù hợp hơn không?
| Hướng | Đánh giá |
|-------|----------|
| **A. Khối Vệ sinh tay 3 mẫu (PO vừa chốt)** | **Chọn.** Đúng 2 họ form; UX theo chuyên đề; thống kê rõ; tái sử dụng form đã có. |
| B. Giữ 2 module tách hẳn, không khối chuyên đề | Đơn giản code hơn một chút nhưng người dùng «mất» cửa Vệ sinh tay; báo cáo phải tự ghép — **kém hơn A về nghiệp vụ**. |
| C. Một form / một `%` cho cả QT.07 | Lệch WHO; phá mẫu số — **loại**. |
| D. Đưa BM.01 vào picker GSC như BK thường | Lệch domain 2 họ form — **loại**. |
| E. Tách module thứ 3 chỉ cho ngoại khoa | Thừa module; BM.03 đã cùng họ BK — **không cần**. |

**Kết luận rà soát:** Không có hướng nghiệp vụ tốt hơn A trong ràng buộc WHO + BK + form hiện có. Chỉ tinh chỉnh sau UAT (thứ tự tab WHO→BM.02→BM.03; deep-link từ BCTH).

