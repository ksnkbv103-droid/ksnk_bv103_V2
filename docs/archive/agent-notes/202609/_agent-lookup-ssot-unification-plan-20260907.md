> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`lookup-vs-enum-guidance.md`](../../../reference/architecture/lookup-vs-enum-guidance.md). Tra cứu lịch sử được.

# Kế hoạch thống nhất SSOT lookup (`sys_lookup_value`) — BV103

> 2026-09-07 · Nghiên cứu read-only trên codebase Mac · **Chỉ tài liệu lập kế hoạch** (không đổi schema trong note này).  
> Bổ sung cho [`_agent-lookup-vs-enum-guidance-20260907.md`](./_agent-lookup-vs-enum-guidance-20260907.md), [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md), [`../../core/database-view-catalog.md`](../../core/database-view-catalog.md).

---

## 1. Hiện trạng SSOT (1 bảng + views)

### 1.1 Bảng vật lý duy nhất cho danh mục phẳng

**TABLE** `public.sys_lookup_value`:

| Cột | Vai trò |
|-----|---------|
| `id` (uuid) | Khóa chính ổn định — **FK fact/master trỏ vào đây** |
| `category_type` (text) | Phân loại (vd. `NGHE_NGHIEP`, `CHUC_VU`) |
| `code` (text) | Mã ổn định trong loại (vd. `NN_HOC_VIEN`) — **không đổi khi chỉ đổi nhãn** |
| `name` (text) | Nhãn hiển thị — **được sửa trên UI** |
| `description`, `is_active`, `metadata` (jsonb) | Mô tả / soft-delete / `thu_tu`, `mau_sac`, … |
| `created_at`, `updated_at` | Audit nhẹ |

Comment DB: *«Bảng danh mục lookup hợp nhất từ 11 bảng danh mục phụ…»* — hiện đã rộng hơn (~14 loại trong app registry + seed).

### 1.2 View façade theo module (không phải TABLE)

Mỗi `{module}_dm_*` lookup là **VIEW** `security_invoker` lọc `category_type` và **alias cột** `code→ma_*`, `name→ten_*`. Ví dụ:

| View (đọc app) | `category_type` |
|----------------|-----------------|
| `mdm_dm_chuc_vu` | `CHUC_VU` |
| `mdm_dm_chuc_danh` | `CHUC_DANH` |
| `mdm_dm_nghe_nghiep` | `NGHE_NGHIEP` |
| `mdm_dm_to_cong_tac` | `TO_CONG_TAC` |
| `mdm_dm_khoi_khoa` | `KHOI_KHOA` |
| `gstt_dm_khu_vuc_giam_sat` | `KHU_VUC_GIAM_SAT` |
| `gstt_dm_hinh_thuc_giam_sat` | `HINH_THUC_GIAM_SAT` |
| `gstt_dm_cach_thuc_giam_sat` | `CACH_THUC_GIAM_SAT` |
| `cssd_dm_loai_may` | `LOAI_MAY_TIET_KHUAN` |
| `cssd_dm_tram` | `TRAM_CSSD` |
| `cssd_dm_loai_su_co` | `LOAI_SU_CO` |
| `qlcv_dm_loai_cong_viec` | `LOAI_CONG_VIEC` |
| `qlcv_dm_trang_thai_cong_viec` | `TRANG_THAI_CONG_VIEC` |
| `nkbv_dm_loai` | `LOAI_NKBV` |
| `nkbv_dm_trang_thai_ca` | `TRANG_THAI_NKBV_CA` |

Không còn chuỗi `dm_*` compat (đã DROP 2026-06-02). App đọc `.from('mdm_dm_nghe_nghiep'|…)` — ghi **không** qua view mà qua `sys_lookup_value`.

### 1.3 App write path — `CONSOLIDATED_MAPS`

File: `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts`

- `CONSOLIDATED_MAPS`: map `sourceTable` view → `{ categoryType, maColumn, tenColumn, metadataColumns? }`.
- `upsertMasterRow` / soft-delete / toggle: nếu nằm trong map → ghi `sys_lookup_value`; không thì ghi TABLE vật lý (`PHYSICAL_TABLE_NAMES`).
- Admin generic: `generic-dm.actions.ts` + UI `GenericDmMasterPage` tại `/quan-tri-he-thong/danh-muc/chuyen-biet/[LOAI]`.
- Registry đọc: `domain-registry.ts` (`loaiDanhMuc` → view + cột).
- Hub IA: `danh-muc-hub-catalog.ts` (nhóm `to-chuc` / `giam-sat` / `cssd` / …).
- Khóa hệ thống (chỉ xem): `locked-system-lookups.ts` — hiện `TRANG_THAI_CONG_VIEC`, `TRANG_THAI_NKBV_CA`, `TRAM_CSSD`, `VAI_TRO_HE_THONG_KSNK`.

### 1.4 Governance

- **TABLE** `sys_mdm_registry` (+ `sys_mdm_suggestion`): đăng ký cột `FK_TO_DM` → `sys_lookup_value` + `source_loai_danh_muc`.
- Trigger `fn_mdm_validate_lookup_integrity`: khi ghi fact/master, kiểm tra UUID tồn tại **và** `category_type` khớp loại đăng ký (seed bulk `20260604150000`).
- Ví dụ đã seed: `mdm_nhan_su.nghe_nghiep_id` → `NGHE_NGHIEP`; `gstt_fact_chung_sessions` / `gstt_fact_vst` (`nghe_nghiep_id`, `khu_vuc_id`, `hinh_thuc_id`, `cach_thuc_id`); CSSD/NKBV FKs tương tự.
- **Lưu ý QLCV:** sau `20260607100000` đã **DROP** `loai_cong_viec_id` / `trang_thai_id` — fact dùng **text + CHECK**; view `v_qlcv_cong_viec_full` JOIN lookup **theo `ma`** để lấy `ten`/`mau_sac`. Seed registry cũ cho `loai_cong_viec_id` cần audit/deactivate (pha 0).

### 1.5 Script / tài liệu đo

- `scripts/sql/lookup-catalog-audit.sql`, `lookup-full-audit.sql`, `lookup-wave2-ids.sql`
- `scripts/sql/mdm-governance-*.sql`, `mdm-coverage-gate.mjs`
- Prefix mã: `lookup-code-prefix.ts` (NN, HT, CT, CD, CV, LM, SC, TC, KV, …)

---

## 2. Phân loại A enum / B lookup / C master (bảng quyết định)

Công thức (đã chốt trong guidance 2026-09-07):

```
Đổi giá trị có phá Kanban / quyền / spawn / form field / scoring cứng?
  → Có  → A. Enum + CHECK (hoặc mã gắn code)
  → Không, chỉ đổi tên/thêm mục nhãn?
       → Có thuộc tính/quan hệ/số lượng lớn?
            → Có  → C. Bảng master
            → Không → B. sys_lookup_value
```

| Tầng | Khi nào | Sửa không đụng code? | Ví dụ BV103 |
|------|---------|----------------------|-------------|
| **A. Enum / mã quy trình** | Ít giá trị; mã = nhánh logic | **Không** (đổi = release) — tối đa sửa **nhãn map trong code** | QLCV `loai_cong_viec` / `trang_thai` (TEXT+CHECK); `gstt_dm_bang_kiem.doi_tuong_giam_sat` / `loai_giam_sat` / `cach_tinh_diem` / `phan_loai_chuyen_mon`; Spaulding / phương pháp TK trên `cssd_dm_loai_dung_cu` |
| **B. Lookup phẳng** | Chỉ mã+tên (+metadata nhẹ) | **Có** — CRUD hub | Chức vụ, nghề nghiệp, tổ, khối, khu vực GS, hình thức/cách thức, loại máy, loại sự cố, loại NKBV, … |
| **C. Master TABLE** | Nhiều cột, quan hệ, BOM, JSON tiêu chí | **Có** — form chuyên | Khoa phòng, nhân sự, loại/bộ dụng cụ, thiết bị, hóa chất, bảng kiểm, RBAC roles |

---

## 3. Danh sách: đã trong lookup | ứng viên chuyển thêm | cấm chuyển

### 3.1 Đã trong `sys_lookup_value` (tầng B — giữ)

| `category_type` | View façade | Ghi chú |
|-----------------|-------------|---------|
| `KHOI_KHOA` | `mdm_dm_khoi_khoa` | FK `mdm_dm_khoa_phong.khoi_id` |
| `TO_CONG_TAC` | `mdm_dm_to_cong_tac` | FK nhân sự / QLCV |
| `CHUC_VU` | `mdm_dm_chuc_vu` | FK `mdm_nhan_su` |
| `CHUC_DANH` | `mdm_dm_chuc_danh` | FK `mdm_nhan_su` |
| `NGHE_NGHIEP` | `mdm_dm_nghe_nghiep` | FK GSC/VST/nhân sự — **case đổi nhãn Học viên→Sinh viên** |
| `KHU_VUC_GIAM_SAT` | `gstt_dm_khu_vuc_giam_sat` | FK phiên GS |
| `HINH_THUC_GIAM_SAT` | `gstt_dm_hinh_thuc_giam_sat` | |
| `CACH_THUC_GIAM_SAT` | `gstt_dm_cach_thuc_giam_sat` | |
| `LOAI_MAY_TIET_KHUAN` | `cssd_dm_loai_may` | FK thiết bị / lô TK |
| `TRAM_CSSD` | `cssd_dm_tram` | **Locked** — mã máy workflow |
| `LOAI_SU_CO` | `cssd_dm_loai_su_co` | |
| `LOAI_NKBV` | `nkbv_dm_loai` | |
| `TRANG_THAI_NKBV_CA` | `nkbv_dm_trang_thai_ca` | **Locked** |
| `LOAI_CONG_VIEC` | `qlcv_dm_loai_cong_viec` | Còn dùng **JOIN nhãn theo `ma`**; fact = text CHECK → nên **khóa CRUD** (xem 3.2) |
| `TRANG_THAI_CONG_VIEC` | `qlcv_dm_trang_thai_cong_viec` | Đã **Locked**; fact = text CHECK |

`sys_roles` **không** nằm trong lookup — TABLE RBAC riêng (hub hiển thị như registry nhưng ghi bảng `sys_roles`).

### 3.2 Ứng viên «chuyển thêm» / tinh gọn (không tạo TABLE mới)

| Hạng mục | Đề xuất | Lý do |
|----------|---------|-------|
| `LOAI_CONG_VIEC` hub CRUD | **Khóa / ẩn mutate** (giống trạng thái); giữ view cho JOIN `ten` | Logic app + CHECK fact đã là tầng A; CRUD thêm mã mới sẽ lệch Kanban/spawn |
| Nhãn hiển thị QLCV | Cho phép **chỉ sửa `name`** (không thêm/xóa/đổi `code`) nếu vẫn muốn map nhãn từ DB | Tùy chọn pha 2 — hoặc map nhãn cứng trong UI |
| `doi_tuong_giam_sat` / metadata bảng kiểm (CHECK) | **Không** đưa vào lookup | Quyết định form fields (NHAN_VIEN bắt nghề…); đổi mã = đổi code |
| Orphan `category_type` còn trong DB (vd. lịch sử `KHOA_KSNK_CONFIG`, đã xóa `NGUYEN_NHAN_LOI` / `HANH_DONG_CAN_THIEP`) | Audit pha 0 → archive/soft-off; **không** mở hub | Tránh «danh mục ma» |
| `ksnk_dm_muc_tieu_kpi` | **Giữ TABLE** (metric_key × khoa) | Không phải mã+tên phẳng |
| Không còn TABLE phẳng nào «nhân đôi» cần consolidate | — | Slice 8 / rename 2026-05 đã gom xong; `LOAI_DUNG_CU` cố ý **không** gom |

**Kết luận câu hỏi 1:** Hầu như **không còn** danh mục phẳng vật lý cần «chuyển vào» lookup. Việc còn lại là **khóa enum giả-lookup (QLCV)**, audit orphan category, và **không** nhầm master C thành B.

### 3.3 Cấm chuyển vào lookup (tầng C / đặc thù)

| Đối tượng | Lý do cấm |
|-----------|-----------|
| `mdm_dm_khoa_phong` | `khoi_id`, `specs` jsonb, quan hệ rộng |
| `mdm_nhan_su` | Hồ sơ + `auth_user_id` + nhiều FK |
| `cssd_dm_loai_dung_cu` | Spaulding, chịu nhiệt, PP tiệt khuẩn, tồn dự phòng — form dedicated |
| `cssd_dm_bo_dung_cu` (+ `_chi_tiet`) | BOM / unique bộ×loại |
| `cssd_dm_thiet_bi` | Serial, bảo trì, `loai_may_id`, trạng thái máy |
| `cssd_dm_hoa_chat` | Ngưỡng tồn, lô kho |
| `gstt_dm_bang_kiem` | `tieu_chi_jsonb`, `ap_dung_jsonb`, CHECK metadata, phiên bản |
| `sys_roles` / permissions | RBAC matrix |
| `ksnk_dm_muc_tieu_kpi` | Mục tiêu KPI theo metric×khoa |
| Fact `*_fact_*` | Không phải danh mục |

---

## 4. Đổi tên / CRUD theo hạng mục — quy trình admin + kỹ thuật

### 4.1 Admin (tầng B — lookup được phép sửa)

1. Vào **Trung tâm quản trị** → nhóm tương ứng → mở `/quan-tri-he-thong/danh-muc/chuyen-biet/{LOAI}` (`GenericDmMasterPage`).
2. **Thêm:** tạo dòng mới → `insert sys_lookup_value` (`category_type`, `code` theo `lookup-code-prefix`, `name`, `is_active`).
3. **Sửa nhãn:** sửa `name` (và metadata nếu có) — **giữ nguyên `id` và `code`**.
4. **Xóa:** soft-delete (`is_active=false`) — không hard-delete nếu còn FK (governance + thực tế vận hành).
5. **Excel:** import/export qua `generic-dm-import.actions` (bị chặn nếu `isLockedSystemLookup`).
6. Quyền: `verifyDanhMucLookupPermission` theo module tách (`DANH_MUC_*` / domain).

### 4.2 Kỹ thuật đổi nhãn an toàn (ví dụ Học viên → Sinh viên)

```
UPDATE sys_lookup_value
SET name = 'Sinh viên', updated_at = now()
WHERE category_type = 'NGHE_NGHIEP' AND code = 'NN_HOC_VIEN';
-- id UUID không đổi → mọi nghe_nghiep_id trên fact/nhân sự vẫn đúng
```

- **Cấm** đổi `code` nếu đã có báo cáo/filter theo mã (trừ migration có map + release).
- **Cấm** tạo dòng mới «Sinh viên» song song rồi để dòng cũ — sẽ tách thống kê.
- Cache: `revalidateMasterDataRowCacheTag` + tag `danh-muc-NGHE_NGHIEP` (900s trên một số loại static).

### 4.3 Tầng A (enum)

- Không CRUD hub (hoặc chỉ xem).
- Đổi nhãn UI: map trong code / i18n; đổi mã: migration CHECK + app types + test.

### 4.4 Tầng C (master)

- Form dedicated (`khoa-phong`, `dung-cu`, `thiet-bi`, `hoa-chat`, `bang-kiem`, `nhan-su`).
- Generic mã–tên **bị chặn** cho `KHOA_PHONG` / `LOAI_DUNG_CU` (`genericDmMustUseDedicatedPageError`).

---

## 5. Liên động (referential consistency)

### 5.1 Nguyên tắc SSOT tham chiếu

| Lớp | Cách lưu | Hiển thị |
|-----|----------|----------|
| Lookup B → fact/master | **`uuid` FK** (`nghe_nghiep_id`, `khu_vuc_id`, …) + trigger MDM category | **Live JOIN** `name` / view `ten_*_hien_thi` |
| QLCV loại/trạng thái | **`code` text + CHECK** trên fact | JOIN lookup **theo `ma`** lấy `ten` (nhãn); logic runtime theo mã |
| Bảng kiểm metadata | **TEXT enum CHECK** trên `gstt_dm_bang_kiem` | Label map app (`BangKiemDoiTuongGiamSat`, …) |
| Phiếu GSC đã chốt | `bang_kiem_id` FK + **`metadata.bang_kiem_snapshot`** | Nội dung tiêu chí / tên mẫu **đóng băng** lúc lưu (BK-1) |

**Cấm** snapshot tên lookup vào fact «cho tiện» (vd. cột text `nghe_nghiep` song song id) trừ khi có lý do audit bất biến đã ghi rõ. Comment lịch sử trên VST nhắc denorm legacy; schema hiện tại SSOT là `*_id`; read view tính `ten_nghe_nghiep_hien_thi` bằng JOIN.

### 5.2 Nghiên cứu thực tế GSC / VST / thống kê

| Nơi | Lưu gì hôm nay | Đổi `name` nghề có chảy không? |
|-----|----------------|--------------------------------|
| `gstt_fact_chung_sessions.nghe_nghiep_id` | UUID FK | **Có** — RPC/dashboard filter theo id; nhãn JOIN live |
| `gstt_fact_vst.nghe_nghiep_id` | UUID FK | **Có** — `ten_nghe_nghiep_hien_thi` trên read view |
| `mdm_nhan_su.nghe_nghiep_id` | UUID FK | **Có** — enrich/gateway JOIN view |
| Analytics RPC (`p_nghe_nghiep_ids`) | Mảng UUID | **Có** — không phụ thuộc chuỗi tên |
| `metadata.bang_kiem_snapshot` | `ten_bang_kiem` + `tieu_chi_jsonb` (nhãn tiêu chí) | **Không đổi** trên phiếu đã chốt — **đúng chủ đích** (không phải nghề) |
| `results_jsonb` | `criterion_id` + value | Tham chiếu id tiêu chí trong snapshot; không lưu tên nghề |
| `doi_tuong_giam_sat` trên mẫu BK | Code CHECK (`NHAN_VIEN`…) | Đổi nhãn UI = sửa map code; **không** liên quan `NN_HOC_VIEN` |

**Case «đối tượng giám sát học viên → sinh viên»:** đây là **`NGHE_NGHIEP.name`** (đối tượng quan sát theo nghề), không phải enum `doi_tuong_giam_sat`. Sửa `name`, giữ `id`/`code` → bảng kiểm mới, form header, thống kê theo nghề **đồng bộ**; phiếu GSC cũ vẫn giữ snapshot **mẫu bảng kiểm** (tiêu chí), còn cột nghề trên phiên vẫn trỏ UUID → nhãn mới khi in/xem nếu UI JOIN live (in nhãn: `giam-sat-chung-print-labels` SELECT `ten_nghe_nghiep` theo id → **live**).

### 5.3 Checklist trước khi đổi nhãn / khóa

- [ ] Xác định tầng A/B/C.
- [ ] Grep fact/view/RPC: FK id vs code vs text name.
- [ ] Đổi chỉ `name` (B) hoặc map label (A); không đổi `id`.
- [ ] Nếu đổi `code`: migration + backfill + cập nhật CHECK/app.
- [ ] Soft-off thay vì xóa nếu còn FK.
- [ ] Revalidate cache master-data.
- [ ] Spot-check: form GSC/VST, export, dashboard filter nghề, in phiếu.
- [ ] Phiếu GSC đã chốt: chấp nhận snapshot mẫu BK bất biến; không «sửa sử» tiêu chí cũ bằng cách rename lookup.

---

## 6. View tổng hợp vs nhiều view mỏng

### 6.1 Đề xuất

1. **Thêm (optional)** `v_sys_lookup_all` = chiếu thẳng `sys_lookup_value` (hoặc alias ổn định cho admin/audit) — filter `category_type` / `is_active` ở query.
2. **Giữ** toàn bộ `{module}_dm_*` lookup hiện có như **alias tương thích** (domain-registry, PostgREST column names, Excel mapping).
3. **Không** bắt buộc app rewrite ngay sang một view duy nhất — registry + CONSOLIDATED_MAPS đã là SSOT ghi.
4. Read path dài (`v_gstt_*`, `v_qlcv_*`): tiếp tục JOIN physical `sys_lookup_value` hoặc view module một tầng (đã flatten 2026-06) — tránh chuỗi view lồng.

### 6.2 Trả lời câu hỏi 3

**Có thể có một view tổng hợp** cho vận hành/admin/audit; **nhiều view mỏng không phải nhiều bảng** — chúng chỉ là façade. Gộp UX ≠ DROP hết façade trong một PR.

---

## 7. UX hub một cửa «Danh mục hệ thống»

### 7.1 Hiện trạng

`danh-muc-hub-catalog.ts` đã có nhóm: Tổ chức & nhân sự · Giám sát & bảng kiểm · Master CSSD · NKBV · Công việc · Hệ thống & quyền · (lookup residual).

Cảm giác «vụn» đến từ nhiều ô **lookup** ngang hàng với **dedicated** masters.

### 7.2 Đề xuất IA (pha 2)

Một cửa **«Danh mục hệ thống»** (lookup B only), chia section:

| Nhóm UI | Loại |
|---------|------|
| Tổ chức | `KHOI_KHOA`, `TO_CONG_TAC`, `CHUC_VU`, `CHUC_DANH`, `NGHE_NGHIEP` |
| Giám sát | `KHU_VUC_GIAM_SAT`, `HINH_THUC_GIAM_SAT`, `CACH_THUC_GIAM_SAT` |
| CSSD (lookup) | `LOAI_MAY_TIET_KHUAN`, `LOAI_SU_CO` (+ `TRAM_CSSD` chỉ xem) |
| NKBV | `LOAI_NKBV` (+ trạng thái ca chỉ xem) |
| Công việc (nhãn hệ thống) | `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` — badge «Hệ thống — không sửa mã» |

Masters C **giữ lối riêng** (Khoa phòng, Nhân sự, Bảng kiểm, Dụng cụ, Thiết bị, Hóa chất) — không nhét vào lưới mã–tên.

Tìm kiếm xuyên catalog đã có (`filterDanhMucHubRows`).

Nguyên tắc UX: trực quan (nhóm nghiệp vụ), khoa học (A/B/C badge), cụ thể (số dòng active từ stats), tiện (một generic form + Excel cho mọi B).

---

## 8. Lộ trình pha 0–4

| Pha | Việc | Kết quả |
|-----|------|---------|
| **0 — Đo** | Chạy `lookup-catalog-audit` / `lookup-full-audit`; liệt kê `category_type` thực tế vs CONSOLIDATED_MAPS vs registry; deactivate seed MDM thừa (`qlcv_fact_cong_viec.loai_cong_viec_id`); ghi orphan | Biên bản «đã đủ B / orphan / drift» |
| **1 — Khóa enum QLCV** | Thêm `LOAI_CONG_VIEC` vào `LOCKED_SYSTEM_LOOKUP_LOAI` (hoặc ẩn create/edit); banner «mã máy / CHECK»; không xóa view | Admin không thêm loại CV lệch app |
| **2 — Hub IA** | Section «Danh mục hệ thống» theo nhóm §7; badge Locked / Master / Lookup; deep-link giữ `chuyen-biet/[LOAI]` | UX một cửa, ít vụn |
| **3 — Audit snapshot / FK** | Checklist §5.3 trên GSC/VST/nhân sự/CSSD; xác nhận không còn ghi tên nghề denorm; tài liệu hóa ngoại lệ `bang_kiem_snapshot`; test đổi nhãn `NN_HOC_VIEN` trên staging | Rename label chảy thống kê + form |
| **4 — Optional dọn view** | Thêm `v_sys_lookup_all` nếu cần; **không** DROP façade module trừ khi grep app=0 và có compat window | Schema gọn hơn về mặt nhận thức, không phá consumer |

Mỗi pha: không migration «gom bảng» (đã gom); ưu tiên lock + UX + audit.

---

## 9. Rủi ro & không làm

**Rủi ro**

- CRUD tự do trên `LOAI_CONG_VIEC` / trạng thái → lệch CHECK fact và Kanban.
- Đổi `code` hoặc tạo bản ghi trùng nghĩa → gãy filter/thống kê.
- Nhầm `doi_tuong_giam_sat` (enum A) với nghề (lookup B).
- Ép `LOAI_DUNG_CU` / bảng kiểm vào lookup → mất cột nghiệp vụ.
- DROP view module sớm → vỡ `.from('mdm_dm_*')` / Excel column map.
- Sửa snapshot phiếu cũ khi rename mẫu BK → phá audit phiên đã chốt.

**Không làm**

- Không tạo TABLE nhỏ mới cho 3–5 dòng mã+tên.
- Không consolidate master C vào `sys_lookup_value`.
- Không hard-delete lookup còn FK.
- Không «sửa sử» `bang_kiem_snapshot` hàng loạt khi đổi tên mẫu.
- Không mở lại `NGUYEN_NHAN_LOI` / `HANH_DONG_CAN_THIEP` (đã xóa 2026-06-06) nếu không có product case mới.
- Không dùng note này làm license sửa production — chỉ plan.

---

## 10. Tiêu chí xong

- [ ] Mọi danh mục phẳng vận hành nằm ở tầng đúng A/B/C (bảng §2–§3 đã rà và đồng ý).
- [ ] Admin thêm/sửa/xóa (soft) lookup B theo hạng mục qua hub một cửa; Locked không mutate.
- [ ] Đổi `name` (giữ `id`/`code`) phản ánh trên form, in, export, dashboard filter **không** cần deploy (trừ A).
- [ ] Không còn dual-write / denorm tên lookup trên fact mới; ngoại lệ snapshot BK được ghi rõ và test.
- [ ] `LOAI_CONG_VIEC` không còn CRUD tự do; fact QLCV chỉ text+CHECK.
- [ ] Registry MDM không còn FK trỏ cột đã DROP; orphan `category_type` đã xử lý hoặc gắn nhãn.
- [ ] Tài liệu này + guidance enum được link từ `implementation-mapping` / hub README khi triển khai pha 2+.
- [ ] (Optional pha 4) `v_sys_lookup_all` tồn tại; façade module vẫn alias ổn định.

---

## Phụ lục — File neo nhanh

| Vai trò | Path |
|---------|------|
| Guidance A/B/C | `docs/reference/architecture/_agent-lookup-vs-enum-guidance-20260907.md` |
| SSOT mapping | `docs/core/implementation-mapping.md` |
| View catalog | `docs/core/database-view-catalog.md` |
| CONSOLIDATED_MAPS | `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts` |
| Registry | `src/lib/master-data/domain-registry.ts` |
| Locked | `src/lib/master-data/locked-system-lookups.ts` |
| Hub IA | `src/lib/master-data/danh-muc-hub-catalog.ts` |
| Snapshot BK | `src/modules/giam-sat-chung/lib/gsc-bang-kiem-snapshot.ts` |
| MDM trigger seed | `supabase/migrations/20260604150000_mdm_registry_bulk_seed_and_trigger_fix.sql` |
| QLCV text-only | `supabase/migrations/20260607100000_qlcv_text_only_schema_cleanup.sql` |

---

## Phụ lục (2026-09-07): `dao_tao_cau_hinh` và `sys_roles` có gộp `sys_lookup_value`?

### Kết luận ngắn
| Đối tượng | Gộp vào lookup? | Lý do |
|-----------|-----------------|--------|
| `dao_tao_cau_hinh` | **Không** | Cấu hình đề thi (số câu, phút, quota Bloom/JSON, gắn khoa/NV, draft/published) — entity nghiệp vụ, không phải nhãn phẳng |
| `dao_tao_cau_hoi` / `dao_tao_lan_thi` | **Không** | Ngân hàng + lần thi + snapshot |
| Chủ đề NHCH (`chu_de_ma`/`chu_de_ten` nhúng trên câu hỏi) | **Có thể (tuỳ chọn sau)** đưa *chỉ chủ đề* vào lookup `DAO_TAO_CHU_DE` để đổi tên lan theo; hiện đang denormalize text |
| `sys_roles` | **Không** | Trục RBAC: nối `sys_user_roles` + `sys_role_permissions` + `sys_permissions`; đã khóa trên hub |

### Ưu nếu cố gộp (nhìn chung)
- Ít «tên bảng» hơn trên giấy.
- Một UI CRUD giống danh mục khác.

### Nhược / rủi ro thật
- **Phình `metadata` JSONB** thay cột có kiểu → khó ràng buộc, khó báo cáo, khó RLS.
- **Mất FK rõ** role↔permission; đổi nhãn nhầm thành đổi quyền.
- **Đào tạo:** cấu hình đề ≠ danh mục; gộp làm hub «danh mục» chứa cấu hình phức tạp → rối hơn.
- **View vụn hiện nay** với lookup phẳng **không tốn storage bảng** (chỉ alias). Gộp roles/cau_hinh **không** giảm view vụn — chỉ chuyển nợ sang JSON.

### Hướng tinh gọn đúng
1. Giữ 3 bảng đào tạo lean (đã cải tổ 8→3).  
2. Giữ `sys_roles` + ma trận quyền.  
3. (Tuỳ chọn) Chủ đề NHCH → `sys_lookup_value` category `DAO_TAO_CHU_DE`; câu hỏi lưu `chu_de_code`/`id`, hiển thị JOIN `name`.  
4. Hub: tách «Danh mục nhãn» vs «Cấu hình đề» vs «Phân quyền» — đừng nhét một chỗ.
