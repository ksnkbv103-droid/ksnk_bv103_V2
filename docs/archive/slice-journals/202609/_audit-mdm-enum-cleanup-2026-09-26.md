# Audit MDM / enum — dọn «admin danh mục» thừa (2026-09-26)

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-26 (Asia/Saigon) |
| Nhánh | `cursor/me-sync-recall-print` · tip commit `5a447e1` (19d A) |
| Phạm vi | READ-ONLY inventory · **không** migrate / deploy / xóa prod |
| Neo | `locked-system-lookups.ts` · `domain-registry.ts` · `master-crud-core.ts` CONSOLIDATED_MAPS · `lookup-vs-enum-guidance.md` · 19d |
| Phân loại | **A** Giữ CRUD · **B** Enum/CHECK — gỡ hub (CRUD hại) · **C** Hybrid khóa mutate · **D** Cần Domain/PO |

---

## 1. Tóm tắt quyết định đề xuất

1. **QLCV `LOAI_CONG_VIEC` + `TRANG_THAI_CONG_VIEC`:** đúng tầng A (enum/CHECK). Fact đã TEXT+CHECK (`20260607100000`); form 19d không chọn loại; hub đã **khóa** + **ẩn mặc định**. Wave 1 = **code-only**: xóa file orphan `QlcvDmAdminLinks`, bỏ fetch dropdown loại chết, hardcode nhãn/màu nếu muốn; **không** DROP view/lookup rows.
2. **Không «dọn sạch DB ngay»:** view `qlcv_dm_*` vẫn JOIN trên `v_qlcv_*` (`lc.ma` / `ts.ma` → `ten_loai_cong_viec`, `trang_thai_mau_sac`). DROP view hoặc xóa seed = gãy list/Kanban màu + mọi RPC đọc view.
3. **Giữ lookup CRUD thật:** khoa, tổ, chức vụ/danh, nghề, khu vực/hình thức/cách thức GS, loại dụng cụ (TABLE), loại máy, loại sự cố, loại NKBV (nhãn ca), master dedicated (bộ/máy/hóa chất/nhân sự/bảng kiểm).
4. **Đã khóa đúng hướng (giữ C):** `TRAM_CSSD`, `TRANG_THAI_NKBV_CA`, `VAI_TRO_HE_THONG_KSNK` (+ mới `LOAI_CONG_VIEC`).
5. **Perf:** gỡ UI admin + bỏ 1 query options loại trên form = nhỏ; thắng thật nếu sau này bỏ JOIN lookup trên mọi list (hardcode `mau_sac`/`ten`) — không phải xóa vài dòng `sys_lookup_value`.

**Đếm đề xuất (registry + dedicated liên quan hub):**

| Đề xuất | Số | Ghi chú |
|---------|----|---------|
| **Giữ** (A) | **17** | 12 registry lookup/master + 5 dedicated (khoa/NS/bảng kiểm/bộ/TB/HC đã kể trong bảng) |
| **Khóa** (C) | **3** | `TRAM_CSSD`, `VAI_TRO_HE_THONG_KSNK`, `TRANG_THAI_NKBV_CA` (giữ view/FK, không CRUD) |
| **Gỡ hub** (B) | **2** | `LOAI_CONG_VIEC` + `TRANG_THAI_CONG_VIEC` — đã khóa+ẩn; wave 1 gỡ orphan/UI chết; **giữ view** tới wave 3 |
| **Gỡ DB** | **0** ngay | Ứng viên **sau** rewrite JOIN/hardcode — không wave 1 |
| **Unclear** (D) | **1** | `LOAI_NKBV` — CRUD nhãn OK nhưng cổng BA gắn mã cứng |

---

## 2. Bảng toàn project (mỗi danh mục 1 hàng)

Nguồn: `domain-registry` ENTRIES + dedicated hub (`danh-muc-hub-catalog`) + CONSOLIDATED_MAPS.

| Tên (loai / hub) | Bảng/view | Loại DB | Dùng thật? | CRUD hub? | Đề xuất | Rủi ro nếu gỡ sớm | Effort |
|------------------|-----------|---------|------------|-----------|---------|-------------------|--------|
| Khoa phòng | `mdm_dm_khoa_phong` | **TABLE** | Có — mọi module | Dedicated CRUD | **Giữ** A | Phá org chart | — |
| Hồ sơ nhân sự | `mdm_nhan_su` | TABLE | Có | Dedicated | **Giữ** A | — | — |
| Khối khoa | `mdm_dm_khoi_khoa` | VIEW→lookup | Có (org) | Lookup | **Giữ** A | Nhãn org | S |
| Tổ công tác | `mdm_dm_to_cong_tac` | VIEW | Có — QLCV form | Lookup | **Giữ** A | Form QLCV | S |
| Chức vụ | `mdm_dm_chuc_vu` | VIEW | Có — NS | Lookup | **Giữ** A | — | S |
| Chức danh | `mdm_dm_chuc_danh` | VIEW | Có — NS | Lookup | **Giữ** A | — | S |
| Nghề nghiệp | `mdm_dm_nghe_nghiep` | VIEW | Có — GSTT | Lookup | **Giữ** A | — | S |
| Vai trò HT KSNK | `sys_roles` | TABLE | Có — RBAC | **Khóa** | **Khóa** C | Đổi name = gãy quyền | — |
| Khu vực GS | `gstt_dm_khu_vuc_giam_sat` | VIEW | Có | Lookup | **Giữ** A | — | S |
| Hình thức GS | `gstt_dm_hinh_thuc_giam_sat` | VIEW | Có | Lookup | **Giữ** A | — | S |
| Cách thức GS | `gstt_dm_cach_thuc_giam_sat` | VIEW | Có | Lookup | **Giữ** A | — | S |
| Mẫu bảng kiểm | `gstt_dm_bang_kiem` | TABLE | Có | Dedicated | **Giữ** A | — | — |
| Loại dụng cụ | `cssd_dm_loai_dung_cu` | TABLE | Có | Dedicated/trung tâm | **Giữ** A | — | — |
| Bộ dụng cụ | `cssd_dm_bo_dung_cu` | TABLE | Có | Dedicated | **Giữ** A | — | — |
| Thiết bị / máy | `cssd_dm_thiet_bi` | TABLE | Có | Dedicated | **Giữ** A | — | — |
| Hóa chất VT | `cssd_dm_hoa_chat` | TABLE | Có | Dedicated | **Giữ** A | — | — |
| Loại máy TK | `cssd_dm_loai_may` | VIEW | Có — lô TK | Lookup | **Giữ** A | — | S |
| Loại sự cố CSSD | `cssd_dm_loai_su_co` | VIEW | Có — sự cố | Lookup | **Giữ** A | — | S |
| Trạm CSSD | `cssd_dm_tram` | VIEW | Có — workflow + `STATION_LABEL` cứng UI | **Khóa** | **Khóa** C | Thêm mã lệch station graph | M nếu hardcode hết |
| Loại công việc | `qlcv_dm_loai_cong_viec` | VIEW | Nhãn JOIN + options chết trên form | **Khóa+ẩn hub** | **Gỡ hub** B · giữ view C | DROP view → gãy `ten_loai` JOIN | Wave1 S / DB XL |
| Trạng thái CV | `qlcv_dm_trang_thai_cong_viec` | VIEW | **mau_sac** list/Kanban + canonical 7 mã code | **Khóa+ẩn** | **Gỡ hub** B · giữ view C tới khi hardcode màu | DROP → mất màu board | Wave1 S / DB XL |
| Loại NKBV | `nkbv_dm_loai` | VIEW | Có — tạo ca / BA gate theo mã | Lookup mở | **D / Giữ tạm** | Xóa mã BA dùng → fail cổng | PO chốt |
| TT phiếu NKBV | `nkbv_dm_trang_thai_ca` | VIEW | Có — **FK id** write path | **Khóa** | **Khóa** C | NKBV chưa TEXT+CHECK như QLCV | L nếu enum-hóa |

`LOCKED_SYSTEM_LOOKUP_LOAI` hiện tại: `LOAI_CONG_VIEC`, `TRANG_THAI_CONG_VIEC`, `TRANG_THAI_NKBV_CA`, `TRAM_CSSD`, `VAI_TRO_HE_THONG_KSNK`. Hub mặc định ẩn các loại này (`isDefaultVisibleHubRow`).

---

## 3. Chi tiết QLCV

### 3.1 Hiện trạng (sau `5a447e1` / 19d A)

| Thành phần | Vai trò | Ghi chú |
|------------|---------|---------|
| CHECK `loai_cong_viec` | `DINH_KY` \| `DOT_XUAT` \| `KHAN_CAP` | Zod + domain spawn định kỳ |
| CHECK `trang_thai` | 7 mã canonical (`trang-thai-canonical.ts`) | Kanban / nghiệm thu |
| `muc_do_uu_tien` | `THAP` \| `TRUNG_BINH` \| `CAO` | Form tạo **nổi**; không chọn KHAN loại |
| View `qlcv_dm_loai_cong_viec` | Lookup nhãn 3 mã | CONSOLIDATED → `sys_lookup_value` `LOAI_CONG_VIEC` |
| View `qlcv_dm_trang_thai_cong_viec` | Nhãn + `mau_sac` + `thu_tu` | JOIN mọi `v_qlcv_*` gần đây theo **`ma`** |
| FK `loai_cong_viec_id` / `trang_thai_id` | **Đã DROP** `20260607100000` | Trigger sync FK cũng DROP — không còn sync id |
| `QlcvDmAdminLinks` | File còn · **0 import** trang | Orphan sau khi gỡ khỏi page |
| `getLoaiCongViecOptions` | Vẫn gọi trong `getQlcvFormCatalog` | Form không còn bind `catalog.loaiCongViec` |
| `getTrangThaiMauSacMap` | Page + Detail vẫn gọi | Đọc view mau_sac |

### 3.2 Tham chiếu code chính

- Registry: `src/lib/master-data/domain-registry.ts` (ENTRIES + labels)
- CRUD map: `master-crud-core.ts` CONSOLIDATED + allowlist
- Lock: `locked-system-lookups.ts` (+ spec)
- Hub ẩn: `quan-tri-hub-jobs.ts` `isDefaultVisibleHubRow`
- Read: `cong-viec-read.actions.ts` (`getLoaiCongViecOptions`, `getTrangThaiMauSacMap`)
- Orphan UI: `components/QlcvDmAdminLinks.tsx`
- Import Excel template: `import-export-template.ts` (2 key qlcv_dm_*)
- Gợi ý MDM: `MdmSuggestionApproveModal.tsx` vẫn liệt kê LOAI/TRANG_THAI
- Permission: `master-table-permission-map.ts`
- SQL sống: `v_qlcv_*` JOIN `lc.ma` / `ts.ma` (vd. `20260802140000_…`)

### 3.3 Phá gì nếu xóa?

| Xóa | Hậu quả |
|-----|---------|
| `QlcvDmAdminLinks.tsx` | **An toàn** — không còn import |
| Registry rows + CRUD maps (chỉ) | Hub/generic DM path 404; import Excel key lỗi; **view DB vẫn sống** |
| View `qlcv_dm_*` / rows lookup | **Gãy** JOIN list (`ten_loai_cong_viec`, `trang_thai_mau_sac`); `getTrangThaiMauSacMap` lỗi |
| Seed mã lệch CHECK | Insert fact fail CHECK; Kanban/normalize lệch |
| Trigger sync FK | **Không còn** (đã DROP 2026-06-07) — không phải rủi ro hiện tại |

### 3.4 Pha cleanup an toàn

| Pha | Việc | Migrate? |
|-----|------|----------|
| **P0 code-only** | Xóa `QlcvDmAdminLinks.tsx`; bỏ `getLoaiCongViecOptions` khỏi catalog (hoặc hardcode 3 nhãn); gỡ 2 option khỏi `MdmSuggestionApproveModal`; optional bỏ key import-export; comment SSOT «enum không CRUD» | **Không** |
| **P1** | Hardcode map `mau_sac` + `ten` trong TS; bỏ query view trên hot path; tạo migration **chỉ** khi đã grep sạch `.from('qlcv_dm_…')` và rewrite `v_qlcv_*` không JOIN | Có — sau verify |
| **NEVER (chưa rewrite)** | DROP view / DELETE `sys_lookup_value` category QLCV / gỡ CONSOLIDATED mà vẫn JOIN | — |

---

## 4. Kế hoạch đợt cải tổ (wave 1 / 2 / 3)

### Wave 1 — QLCV code (không migrate) — khuyến nghị làm ngay

1. `src/modules/quan-ly-cong-viec/components/QlcvDmAdminLinks.tsx` — **delete**
2. `src/modules/quan-ly-cong-viec/actions/cong-viec-read.actions.ts` — bỏ `getLoaiCongViecOptions` + field `loaiCongViec` khỏi `QlcvFormCatalog` (cập nhật `qlcv-form-options.ts` + callers/spec)
3. `src/modules/quan-tri-he-thong/components/MdmSuggestionApproveModal.tsx` — bỏ LOAI/TRANG_THAI khỏi dropdown gợi ý (tránh seed lệch CHECK)
4. `src/lib/import-export-template.ts` — bỏ hoặc đánh dấu non-import cho 2 qlcv_dm_* (locked)
5. Spec/docs: khẳng định lock + orphan đã gỡ (19d DoD)

*Không đụng:* CONSOLIDATED_MAPS / domain-registry (giữ đọc nhãn qua generic DM nếu admin deep-link) · views SQL.

### Wave 2 — Toàn project «enum giả danh mục»

1. Rà `TRANG_THAI_NKBV_CA`: roadmap TEXT+CHECK giống QLCV **hoặc** giữ FK + khóa vĩnh viễn (PO).
2. `TRAM_CSSD`: thống nhất `STATION_LABEL*` vs lookup — một SSOT nhãn.
3. `LOAI_NKBV`: PO — CRUD thêm loại HAI được không, hay mã cổng BA cố định → lock.
4. Hub IA: nhóm đã có; không thêm ô CRUD cho mã quy trình.

### Wave 3 — Tùy chọn schema (chỉ sau hardcode + grep sạch)

1. Rewrite `v_qlcv_*`: bỏ JOIN `qlcv_dm_*` (màu/ten từ expression/`CASE` hoặc cột denorm).
2. Khi đó mới cân nhắc DROP view façade / deactivate lookup rows.
3. **Không** bắt buộc «gom bảng» — đã nằm trong `sys_lookup_value`.

---

## 5. Việc Nghĩa chốt

- [ ] Wave 1 code cleanup QLCV — **OK làm** (không migrate)?
- [ ] Giữ view + seed `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` chỉ để nhãn/màu — **đến wave 3**?
- [ ] Hardcode `mau_sac` 7 TT trong code (bỏ phụ thuộc metadata lookup) — có / hoãn?
- [ ] `LOAI_NKBV`: **Giữ CRUD** hay **Khóa** như TT phiếu?
- [ ] `TRANG_THAI_NKBV_CA`: giữ FK+khóa hay dự án TEXT+CHECK riêng?
- [ ] Cấm tuyệt đối «DROP lookup DB ngay» trên prod — xác nhận?

---

## 6. Không tự migrate

Agent audit **không** chạy migration, không DELETE `sys_lookup_value`, không DROP VIEW, không push. Mọi thay đổi DB chỉ sau khi PO chốt + Lead viết migration có verify grep + UAT list/Kanban QLCV.

---

## 7. Perf — thẳng thắn

Gỡ UI admin thừa và 1 round-trip `getLoaiCongViecOptions` trên form chỉ giảm nhiễu và vài ms — **không** đổi cảm giác list. Thắng đo được nằm ở **bỏ LEFT JOIN lookup trên mọi row** `v_qlcv_*` (và tránh N+1 màu), không phải xóa vài dòng danh mục rỗng trong `sys_lookup_value`.

---

## 8. Top «rườm» ngoài lookup (nhanh — có evidence)

1. **Orphan `QlcvDmAdminLinks`** — file còn, 0 import (`components/QlcvDmAdminLinks.tsx`).
2. **Catalog fetch thừa `loaiCongViec`** — `getQlcvFormCatalog` vẫn query view trong khi `CongViecForm` không bind (`cong-viec-read.actions.ts` + form).
3. **Dual khái niệm KHAN** — `loai=KHAN_CAP` vs `muc_do_uu_tien=CAO` (19d đã tách UI; legacy mã còn).
4. **Denorm JOIN nhãn trên mọi list** — `ten_loai_cong_viec` + `trang_thai_mau_sac` từ view lookup (`v_qlcv_*` migrations 20260802…).
5. **NKBV vẫn FK trạng thái** trong khi QLCV đã TEXT+CHECK — hai dialect (`giam-sat-nkbv-write.helpers.ts` vs ADR QLCV).
6. **Trạm CSSD: lookup khóa + map nhãn cứng UI** — `STATION_LABEL_MAP` / `STATION_LABEL` song song `cssd_dm_tram`.
7. **Module folder `cssd-erp` vs route `cssd-*`** — tên «erp» vs IA sản phẩm (`src/modules/cssd-erp`, `src/app/cssd-dung-cu`).
8. **`tai-khoan-nhan-su` path module** vs route `/quan-tri-he-thong/tai-khoan` — rename IA chưa flatten folder.
9. **Hub labels `BO_DUNG_CU` / `DC_LE_CHI_TIET`** trong `DM_HUB_LABELS` không nằm ENTRIES registry — dễ hiểu nhầm còn ô lookup.
10. **`dead-code:scan` unusedExports** (debt-register WARN) — tín hiệu rác export còn lại sau batch.

---

## 9. Nguồn đã đọc

- `src/lib/master-data/locked-system-lookups.ts` (+ spec)
- `src/lib/master-data/domain-registry.ts`, `danh-muc-hub-catalog.ts`, `quan-tri-hub-jobs.ts`
- `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts` (CONSOLIDATED_MAPS)
- `docs/reference/architecture/lookup-vs-enum-guidance.md`, `adr-qlcv-text-check-deferred.md`, `debt-register.md`
- `docs/modules/qlcv/19d-QLCV-LOAI-UU-TIEN-20260926.md`, proposal type-vs-priority
- `docs/core/database-view-catalog.md`, migrations `20260602180000`, `20260607100000`, `20260802140000`
- App QLCV: `cong-viec-read.actions.ts`, `CongViecForm.tsx`, `QlcvDmAdminLinks.tsx`, `trang-thai-canonical.ts`

---

## 10. Wave 3 Applied (2026-09-26 Asia/Saigon) — local only, migrate **not** applied

| Mục | Kết quả |
|-----|---------|
| Nhánh | `cursor/me-sync-recall-print` (build on Wave 1 `c5f1772`) |
| Hardcode | `qlcv-labels.ts`: `QLCV_LOAI_CONG_VIEC_LABELS` + `QLCV_TRANG_THAI_MAU_SAC` / `TEN` (màu khớp prod seed 2026-09-26) |
| Hot path | `getTrangThaiMauSacMap` / catalog / Page / Detail **không** còn `.from('qlcv_dm_*')`; badge fallback SSOT |
| List select | Bỏ cột `trang_thai_mau_sac` khỏi `qlcv-root-list-select` (UI dùng map cứng) |
| Registry/CRUD | Gỡ `qlcv_dm_loai_cong_viec` + `qlcv_dm_trang_thai_cong_viec` khỏi domain-registry ENTRIES, CONSOLIDATED_MAPS, allowlist, permission-map |
| Migrate draft | `supabase/migrations/20260926053300_qlcv_wave3_drop_dm_loai_trang_thai.sql` — CREATE OR REPLACE `v_qlcv_*` CASE (no JOIN) → DROP 2 dm views → soft-deactivate lookup rows. **Chưa** `db push` / MCP apply |
| LOAI_NKBV | **BLOCKED** — giữ CRUD + FK `loai_nkbv_id` + BA gate + write validate `nkbv_dm_loai` (evidence §10.1). Không DROP / không lock thêm |

### 10.1 LOAI_NKBV blockers (file:line)

- `src/lib/validations/giam-sat-nkbv.validations.ts:45` — `loai_nkbv_id` required UUID
- `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-write.helpers.ts:29` — `.from("nkbv_dm_loai")` validate
- `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-write.actions.ts:52,234-241` — create/update + resolve id by code
- `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-ba-analysis.actions.ts:227-238` — BA gate requires MDM row
- `src/modules/giam-sat-nkbv/components/NkbvCaseEditor.tsx:301` — select loai CRUD
- FK `nkbv_fact_su_kien.loai_nkbv_id` → `sys_lookup_value` (baseline) — clinical classification live

PO chưa chốt «Khóa như TT phiếu» hay TEXT+CHECK — Wave 3 **không** phá NKBV.

### 10.2 UAT localhost (Nghĩa)

1. `/quan-ly-cong-viec` list + Kanban: badge màu 7 TT (MOI slate, DANG_LAM blue, CHO_DUYET amber, HOAN_THANH emerald, TU_CHOI rose, QUA_HAN red, DA_HUY gray)
2. Chi tiết phiếu: badge + nhãn loại (Định kỳ / Đột xuất / Khẩn cấp legacy)
3. Tạo DOT_XUAT + spawn định kỳ DINH_KY vẫn OK
4. Hub MDM: không còn ô/CRUD `qlcv_dm_*` (đã khóa+ẩn; registry gỡ)
5. NKBV: tạo/sửa ca + BA analysis **không** đổi (LOAI_NKBV còn)
6. **Không** chạy migrate draft trên prod cho đến khi UAT xanh

### 10.3 Parked

- Apply migrate `20260926053300_…` (PO)
- Wave 2: TRANG_THAI_NKBV_CA TEXT+CHECK / TRAM_CSSD SSOT / LOAI_NKBV PO lock
- DELETE hẳn `sys_lookup_value` rows QLCV (hiện chỉ soft-deactivate trong draft)

