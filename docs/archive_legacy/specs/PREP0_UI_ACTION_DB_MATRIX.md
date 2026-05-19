# Pre-P0 — Ma tran UI ↔ Action ↔ DB (khoi tao)

> **Neo:** [`AGENTS.md`](../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](./READ_MINIMUM_BY_CHANGE.md) + [`10-bv103-implementation-mapping.md`](./10-bv103-implementation-mapping.md) khi dien ten bang/cot.

Cap nhat: 02/05/2026

Muc tieu: Mat bang dong bo schema gate — mo rong dan theo sprint. Cot “Rui ro” can xu ly khi doi ten cot hoac nullable.

## Ky hieu

- **FK**: UUID tham chieu bang master / nghiep vu.
- **Gate quyen**: co `verifyPermission` hoac wrapper quan tri tuong duong tai tang action exposed cho UI.

---

## 1) `cssd-erp`

| Luong/UI | Action (server) | Bang / cot chinh | Gate quyen | Rui ro / ghi chu |
|----------|----------------|------------------|------------|-------------------|
| Quet tram / workflow | `cssd-write.actions.ts` (`recordStationScan`, rollback, incident…) | `quy_trinh`, `nhat_ky_quet`, `su_co`, … | `CSSD_WORKFLOW`, `BAO_SU_CO` | Cot optional schema (`is_red_alert`, FK `quy_trinh_id`) — code co probe runtime |
| Kho / import QR | `importCSSDData` | `quy_trinh` | `CSSD_KHO_DUNGCU` IMPORT | Mapping `ma_vach_qr`, `trang_thai_hien_tai` (Station) |

---

## 2) `giam-sat-vst`

| Luong/UI | Action | Bang / cot chinh | Gate quyen | Rui ro |
|----------|--------|------------------|------------|--------|
| Luu phien | `saveVSTSession` | `giam_sat_vst_sessions`, `giam_sat_vst` | `GIAM_SAT_VST` create | Chi tiet chi tiet session_id; `created_at` tu `ngay_giam_sat`; khong log full payload prod |
| Import | `importVSTData` | Cung bang tren | `GIAM_SAT_VST` import | FK `khu_vuc` DM |
| Soft delete nhieu | `deleteVSTSessions` | `is_active` session | `GIAM_SAT_VST` delete | |

Export flat: dong bo `EXPORT_CONTRACT_VST.md`.

---

## 3) `giam-sat-chung`

| Luong/UI | Action | Bang / cot chinh | Gate quyen | Rui ro |
|----------|--------|------------------|------------|--------|
| Luu phien + ket qua | `saveGiamSatChung` | `giam_sat_chung_sessions`, `giam_sat_chung_results` | `GIAM_SAT_CHUNG` create | `khoa_id` SSOT `dm_khoa_phong`; mode hinh/cach normalization |
| Soft delete nhieu | `deleteGiamSatChungSessions` | `is_active` session (`giam_sat_chung_sessions`) | `GIAM_SAT_CHUNG` delete | Dong bo flatten export + lich su (an khoi danh sach) |
| Import | `importGiamSatChungData` | Cung bang | `GIAM_SAT_CHUNG` import | Chi action server — UI khong keo nhap truc tiep theo SYNC_AUDIT |

---

## 4) `quan-ly-cong-viec`

| Luong/UI | Action | Bang / cot chinh | Gate quyen | Rui ro |
|----------|--------|------------------|------------|--------|
| Tao / sua task | `cong-viec-write.*` | `cong_viec` | `CONG_VIEC` | `payload` Record — can tiep tuc thay `unknown` bang type cho truong chinh |
| Binh luan | `postComment` | `cong_viec_comments` | `CONG_VIEC` edit | Ghep `ho_so_nhan_vien` theo email/user |
| `validateCongViecDanhMuc` | Truoc insert/update | `dm_khoa_phong`, `dm_to_cong_tac` (TO_CONG_TAC) | (goi trong action da verify) | `to_id` can FK string coercion |

---

## 5) `quan-tri-he-thong/danh-muc`

| Luong/UI | Tang | Bang vi du | Gate quyen (mong muon) | Ghi chu Pre-P0 |
|----------|------|-------------|-------------------------|-----------------|
| Trung tam Danh muc (tile + route tung `dm_*`) | Server | `dm_*` theo `domain-registry` | `DANH_MUC` + module chi tiet (`LOAI_DC`, …) | Co `verifyPermission`; khong con hub |
| Gateway master supervision | `master-data-gateway.actions.ts` | `dm_khoa_phong`, bundle | `GIAM_SAT_VST`/`GIAM_SAT_CHUNG`/`DANH_MUC`/`NHAN_SU` view | Context `vst`/`gsc`/`admin` |
| CRUD granular **`loai-dung-cu.actions`** | Admin + `verifyPermission` | `dm_loai_dung_cu` | `LOAI_DC` | Da gate. |
| CRUD granular **`khoa-phong.actions`** | Admin + `verifyPermission` | `dm_khoa_phong`, `dm_khoi_khoa` | `KHOA_PHONG` | Da gate. |
| **`bo-dung-cu.actions`** | Admin + `verifyPermission` | `dm_bo_dung_cu` | `BO_DC` | Da gate (list/save/toggle/delete). |
| **`dung-cu-chi-tiet.actions`** | Admin + `verifyPermission` | `dm_bo_dung_cu_chi_tiet` | `DC_LE` | Da gate. |
| **`thiet-bi.actions`** | `listMasterRows` + `verifyPermission` | `dm_thiet_bi` | `THIET_BI` | Da gate. |
| **`hoa-chat.actions`** | + `verifyPermission` | `dm_hoa_chat` | `HOA_CHAT` | Da gate. |
| **`smart-import.actions.ts`** | Admin sau `verifyPermission` | Theo `tableName` | Map `master-table-permission-map.ts` + `import` | Da gate. |
| **`export.actions.ts`** (`getMasterDataExport`) | `createAdminSupabaseClient` + gate | Theo `tableName` | Map cung file + **`view`** (dong bo lieu xuat voi quyen doc danh muc) | Da gate. |

---

## 6) Cot de track (lech ten / kieu / nullability)

Lap danh moi khi Sprint cham module:

| Module | Truong hay lech |
|--------|-----------------|
| CSSD | `quy_trinh.is_red_alert`, `su_co.quy_trinh_id`, ten cot log quet vs UI |
| VST/GSC | `khoa_id` vs ten hien thi; `created_at` session vs ngay nhap |
| Cong viec | `khoa_thuc_hien_id`, `to_id`, tien do / trang thai |
| dm_* | SSOT: chi `dm_*`; hub da sunset — chi track lech ten cot / FK moi |

---

## 7) Kiem verify nhanh (Pre-P0 exit)

1. Tao / sua 1 dong moi module chinh; kiem tra list + FK hien thi.
2. User khong co role: moi action gated phai tra loi tu choi hoac redirect — **luu y** `verifyPermission` hien tra som khi khong login; can roadmap “chan khach” dong bo.
3. `npm run build` sau doi mapping bat ky.
