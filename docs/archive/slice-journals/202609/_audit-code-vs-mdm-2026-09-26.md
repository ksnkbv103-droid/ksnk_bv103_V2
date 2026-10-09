# Audit CODE vs MDM — quyết định hardcode / danh mục (2026-09-26)

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-26 (Asia/Saigon) |
| Máy | Nghĩa Mac · `machineId` `6bad1c57-…` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Nhánh | `cursor/me-sync-recall-print` · tip `05ca78a` (Wave 3 FE hardcode QLCV) |
| Phạm vi | Decision matrix + **W3d/W6 Strategy B code applied 2026-09-26** · **không** migrate apply / push / PR |
| Supersedes | [`_audit-mdm-enum-cleanup-2026-09-26.md`](./_audit-mdm-enum-cleanup-2026-09-26.md) (giữ làm lịch sử Wave 1–3; doc này = decision matrix chuẩn) |
| Neo | `locked-system-lookups.ts` · `domain-registry.ts` · `master-crud-core.ts` CONSOLIDATED_MAPS · `danh-muc-hub-catalog.ts` · `lookup-vs-enum-guidance.md` · draft `20260926053300_qlcv_wave3_…sql` |

---

## 1. Principles (1 trang)

### Công thức (dùng nguyên văn khi tranh luận)

```
Đổi giá trị có phá workflow / quyền / BA gate / Kanban / spawn / báo cáo cứng?
  → Có  → CODE (const + TEXT/CHECK; deploy = đổi set)
  → Không, chỉ đổi tên / thêm mục nhãn theo viện?
       → Có thuộc tính/quan hệ phức tạp?
            → Có  → MDM TABLE dedicated (form chuyên)
            → Không → MDM sys_lookup_value + VIEW façade *_dm_*
```

### CODE (hardcode / const / CHECK only)

Áp dụng khi **TẤT CẢ**:

1. Tập đóng, hữu hạn, owned bởi product/process (workflow states, binary heat, station codes).
2. Admin viện **không** cần thêm/đổi mã mà không có release.
3. Đổi set buộc sửa validation / transition / UI branch → deploy anyway.
4. Không kỳ vọng vocabulary tăng theo site.

**Hệ quả:** nhãn/màu trong TS (hoặc `CASE` trên view); **không** hub CRUD; **không** JOIN lookup trên hot path.

### MDM (sys_lookup / danh mục + admin CRUD)

Áp dụng khi **BẤT KỲ**:

1. Viện thêm/đổi nhãn không cần release (khoa, tổ, nghề, loại máy, loại sự cố…).
2. Vocabulary site-specific / multi-tenant.
3. Ops đổi set thường xuyên hơn engineers.

**Hai tầng MDM (đã có sẵn):**

| Tầng | Khi nào | Ví dụ |
|------|---------|--------|
| **B. Lookup phẳng** | mã+tên (+metadata nhẹ) | `sys_lookup_value` + VIEW `mdm_dm_chuc_vu`… |
| **C. Master TABLE** | nhiều cột / quan hệ / số lượng lớn | `mdm_dm_khoa_phong`, `cssd_dm_bo_dung_cu`, `gstt_dm_bang_kiem` |

### HYBRID — hiếm; ưu tiên loại bỏ (kiểu Wave 3)

Code owns mã cho phép (CHECK/enum); MDM chỉ còn metadata hiển thị **nếu vẫn cần**. Với set nhỏ & ổn định → **CASE/const**, bỏ JOIN (Wave 3 QLCV).

### Cờ kỹ thuật (bắt buộc ghi trên bảng)

| Cờ | Nghĩa |
|----|--------|
| **DUAL** | CHECK/const **và** lookup/view cùng sống → nợ |
| **DEAD** | Orphan code / 0 `.from` FE / category đã DELETE seed |
| **LIVE RISK** | FK/JOIN/validate còn nóng trên write path |

### Gate DROP (không thương lượng)

> **Không DROP** view / soft-delete / DELETE `sys_lookup_value` cho đến khi: (1) grep sạch `.from('…_dm_…')` trên hot path, (2) mọi `v_*` / RPC không còn JOIN façade, (3) UAT list/Kanban/create/BA xanh, (4) PO/Lead ký apply migrate. Soft-deactivate trước; DELETE cứng sau ≥1 sprint quan sát.

---

## 2. Hiện trạng neo (sau Wave 3 FE)

| Thành phần | Trạng thái |
|------------|------------|
| `qlcv-labels.ts` | CODE: nhãn loại + màu/tên 7 TT (+ legacy alias) |
| FE `.from('qlcv_dm_*')` | **0** ref hot path |
| Registry / CONSOLIDATED / hub | QLCV 2 loại **đã gỡ** ENTRIES |
| `LOCKED_SYSTEM_LOOKUP_LOAI` | QLCV 2 key **giữ khóa** tới W3c migrate; **+ `LOAI_NKBV`** (Strategy B lock+allowlist) |
| `repository.ts` CONSOLIDATED_LOAIS | **W3d done** — đã gỡ `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` |
| Draft migrate `20260926053300_…` | CASE rewrite `v_qlcv_*` → DROP 2 view → soft-deactivate · **CHƯA apply** |
| Live SQL | `v_qlcv_cong_viec_full` **vẫn JOIN** `qlcv_dm_*` (migration cuối `20260802140000`) → **DUAL** DB cho đến apply |
| LOAI_NKBV | **Strategy B applied (code)** — lock hub + allowlist CDC; FK/`nkbv_dm_loai` **giữ**; không DROP |

---

## 3. Full decision table

Ký hiệu đề xuất: **CODE** · **KEEP MDM** · **HYBRID→CODE** · **PARK** · cộng cờ **DUAL** / **DEAD** / **LIVE RISK**.

### 3.1 Registry lookup (`sys_lookup` + VIEW) + dedicated master

| # | Tên (loai / hub) | Storage hiện tại | Consumers (mẫu) | JOIN/FK hot? | Admin CRUD? | Đề xuất | Cờ |
|---|------------------|------------------|-----------------|--------------|-------------|---------|-----|
| 1 | Khoa phòng | TABLE `mdm_dm_khoa_phong` | 38× `.from` · mọi module | Có | Dedicated | **KEEP MDM** | — |
| 2 | Hồ sơ nhân sự | TABLE `mdm_nhan_su` | 69× | Có | Dedicated | **KEEP MDM** | — |
| 3 | Mẫu bảng kiểm | TABLE `gstt_dm_bang_kiem` | 39× | Có | Dedicated | **KEEP MDM** | — |
| 4 | Loại dụng cụ | TABLE `cssd_dm_loai_dung_cu` | 24× | Có | Dedicated/trung tâm | **KEEP MDM** | — |
| 5 | Bộ dụng cụ (+ chi tiết) | TABLE | 42× + 29× BOM | Có | Dedicated | **KEEP MDM** | — |
| 6 | Thiết bị / máy | TABLE `cssd_dm_thiet_bi` | 18× | Có | Dedicated | **KEEP MDM** | — |
| 7 | Hóa chất VT | TABLE `cssd_dm_hoa_chat` | 7× | Có | Dedicated | **KEEP MDM** | — |
| 8 | Khối khoa | VIEW→lookup `KHOI_KHOA` | 5× | Org | Lookup | **KEEP MDM** | — |
| 9 | Tổ công tác | VIEW `TO_CONG_TAC` | 5× · QLCV form | Có | Lookup | **KEEP MDM** | — |
| 10 | Chức vụ | VIEW `CHUC_VU` | 3× · NS enrich | Có | Lookup | **KEEP MDM** | — |
| 11 | Chức danh | VIEW `CHUC_DANH` | 5× | Có | Lookup | **KEEP MDM** | — |
| 12 | Nghề nghiệp | VIEW `NGHE_NGHIEP` | 5× · GSTT | Có | Lookup | **KEEP MDM** | — |
| 13 | Khu vực GS | VIEW `KHU_VUC_GIAM_SAT` | 5× | Có | Lookup | **KEEP MDM** | — |
| 14 | Hình thức GS | VIEW `HINH_THUC_GIAM_SAT` | 2× write-helpers | Có | Lookup | **KEEP MDM** | — |
| 15 | Cách thức GS | VIEW `CACH_THUC_GIAM_SAT` | 1× | Có | Lookup | **KEEP MDM** | — |
| 16 | Loại máy TK | VIEW `LOAI_MAY_TIET_KHUAN` | 1× direct + nhiều embed thiet_bi | Có (lô TK) | Lookup | **KEEP MDM** | — |
| 17 | Loại sự cố CSSD | VIEW `LOAI_SU_CO` | `su-co-report.application` `sys_lookup_value` | Có | Lookup | **KEEP MDM** | — |
| 18 | Vai trò HT KSNK | TABLE `sys_roles` | 16× · RBAC | Có | **Khóa** hub | **KEEP MDM** (RBAC TABLE; không enum hóa) | locked |
| 19 | Trạm CSSD | VIEW `TRAM_CSSD` | `cssd-tram-persist.ts:7` + UI `STATION_LABEL*` | Persist id + code graph | **Khóa** | **HYBRID→CODE** | **DUAL** |
| 20 | TT phiếu NKBV | VIEW `TRANG_THAI_NKBV_CA` | 8× write/read/BA | **FK id** write | **Khóa** | **HYBRID→CODE** (dự án TEXT+CHECK) hoặc giữ FK khóa vĩnh viễn | **LIVE RISK** · locked |
| 21 | Loại NKBV / HAI | VIEW `LOAI_NKBV` | 3× + BA + editor | **FK `loai_nkbv_id`** | **Khóa** hub + allowlist | **KEEP MDM** + **lock+allowlist (B)** | **LIVE RISK** mitigated · **DUAL** labels |
| 22 | Loại CV QLCV | VIEW `qlcv_dm_loai` + lookup | FE 0×; SQL view JOIN còn | JOIN list (DB) | Đã gỡ registry | **CODE** (đã FE) → apply draft | **DUAL** DB · FE **DEAD** |
| 23 | TT CV QLCV | VIEW `qlcv_dm_trang_thai` | FE 0×; SQL JOIN còn | JOIN mau_sac (DB) | Đã gỡ | **CODE** (đã FE) → apply draft | **DUAL** DB · FE **DEAD** |
| 24 | KPI mục tiêu | TABLE `ksnk_dm_muc_tieu_kpi` | dashboard actions | Có | (không hub registry) | **KEEP MDM** (config số) | ngoài hub |
| 25 | `KHOA_KSNK_CONFIG` | lookup seed baseline | fn SQL config | Thấp | Không hub | **PARK** audit sống/chết trên prod | nghi **DEAD** ops |
| 26 | `NGUYEN_NHAN_LOI` / `HANH_DONG_CAN_THIEP` | Đã DELETE `20260606100000` | 0 app | Không | — | **DEAD** (đã dọn) | **DEAD** |

### 3.2 Enum / CHECK đã (hoặc nên) CODE — không cần MDM

| # | Mã / tập | Storage | FE SSOT | Đề xuất | Ghi chú |
|---|----------|---------|---------|---------|---------|
| 27 | `loai_cong_viec` | TEXT+CHECK 3 mã | `qlcv-labels.ts` | **CODE** | Wave 3 done FE |
| 28 | `trang_thai` CV | TEXT+CHECK 7+legacy | `trang-thai-canonical.ts` + labels | **CODE** | |
| 29 | `muc_do_uu_tien` | CHECK THAP/TB/CAO/(KHAN legacy) | `formatMucDoUuTienLabel` | **CODE** | Không bao giờ là hub; 19d UI ưu tiên |
| 30 | `ma_chu_ky` định kỳ | CHECK DAILY…YEARLY | domain spawn | **CODE** | |
| 31 | `loai_hoat_dong` nhật ký | CHECK | — | **CODE** | |
| 32 | CSSD `WORKFLOW_STEPS` / Station | TS const + persist qua `cssd_dm_tram` | `cssd-stations.ts` · `STATION_LABEL` | **HYBRID→CODE** | Đồng bộ §19 |
| 33 | Spaulding CRITICAL/SEMI/NON | CHECK trên `cssd_dm_loai_dung_cu` | map D-16 | **CODE** | Thuộc tính master, không lookup |
| 34 | PP tiệt khuẩn STEAM_134… | CHECK | packaging-rules | **CODE** | |
| 35 | `phan_loai` PHAU_THUAT/THU_THUAT | CHECK | — | **CODE** | |
| 36 | `is_chiu_nhiet` | boolean | heat-split / batch-heat | **CODE** | Binary — không dm |
| 37 | Mẻ `phuong_phap` HOI_NUOC/PLASMA/EO | CHECK | — | **CODE** | |
| 38 | `loai_phieu` bảo trì | CHECK DINH_KY/SUA_CHUA | — | **CODE** | |
| 39 | Kho GD / HC loai_giao_dich | CHECK | — | **CODE** | |
| 40 | GSTT BK attrs (`cach_tinh_diem`, `doi_tuong`, `loai_giam_sat`, `phan_loai_chuyen_mon`) | CHECK trên TABLE | validations | **CODE** | Không tách lookup |
| 41 | NKBV checklist type BSI/UTI/SSI/VAE/VAP/HAP/CH17 | **const labels** + MDM rows | `nkbv-loai-labels.ts` | **PARK** / hybrid xem §5 | Không CODE-only khi còn FK |
| 42 | VAE/PNEU tier VAC…PNU3 | const | labels | **CODE** | Không phải loại ca MDM |
| 43 | Đào tạo loai_cau / trang_thai_ky / che_do | CHECK + `dao-tao/labels.ts` | CODE | **CODE** | Mẫu Wave 3 |
| 44 | NKBV wound class / ASA / device CVC… | CHECK | — | **CODE** | |
| 45 | BA `analysis_mode` CDC/MANUAL | CHECK | — | **CODE** | |

### 3.3 Đếm (decision items trong bảng trên)

| Bucket | Số | Gồm |
|--------|----|-----|
| **CODE** (đã hoặc chỉ CODE) | **18** | #27–40, #42–45 (+ QLCV #22–23 FE) |
| **KEEP MDM** | **18** | #1–18, #21 (tạm), #24 |
| **HYBRID debt → CODE** | **3** | #19 TRAM · #20 TT NKBV · #22–23 DB dual QLCV (gộp DB dual = 1 wave) → đếm **3** dòng chiến lược: TRAM, TT_NKBV, QLCV-DB |
| **DEAD** | **2** | #26 đã xóa · FE qlcv_dm 0 ref (CONSOLIDATED QLCV debt **cleared W3d**) |
| **PARK** (chờ Domain/PO) | **3** | #21 seed-audit Domain · #20 FK vs TEXT+CHECK · #25 KHOA_KSNK_CONFIG · apply Wave3c migrate |

*Lưu ý:* «18 CODE» gồm CHECK/const sẵn có (không phải 18 migrate mới). Thắng slim DB thực sự = DROP façade QLCV + (sau này) bỏ dual TRAM/TT_NKBV.

---

## 4. Chi tiết nóng

### 4.1 QLCV — mẫu chuẩn Wave 3

| Layer | SSOT |
|-------|------|
| Write | TEXT + CHECK trên `qlcv_fact_cong_viec` |
| UI | `qlcv-labels.ts` / canonical |
| DB view | Vẫn JOIN dm (**DUAL**) đến khi apply `20260926053300` |
| Hub | Registry gỡ; LOCKED còn (vô hại nếu không CRUD) |

**Không DROP** cho đến UAT + grep sạch JOIN trong mọi `v_qlcv_*` / RPC.

### 4.2 TRAM_CSSD — DUAL điển hình

- Code: `WORKFLOW_STEPS`, `STATION_LABEL` / `STATION_LABEL_MAP` (flow map, sự cố print).
- MDM: VIEW `cssd_dm_tram` · `cssd-tram-persist.ts` resolve `id` theo `ma_tram` · locked hub.
- **Khuyến nghị:** CODE owns 6 mã; persist **mã TEXT** (hoặc giữ id nhưng nhãn chỉ từ const). Sau rewrite → soft-deactivate lookup / DROP façade. **Không** cho admin thêm trạm lệch graph.

### 4.3 TRANG_THAI_NKBV_CA

- FK `trang_thai_id` → lookup; validate mọi write; BA đổi TT.
- Đã **khóa** CRUD (đúng).
- Hai lựa chọn PO: (A) dự án TEXT+CHECK giống QLCV — slim + nhất quán; (B) giữ FK khóa vĩnh viễn — ít migrate, DUAL nhãn nếu sau này hardcode màu.
- **Mặc định đề xuất audit:** hướng A khi có bandwidth NKBV; **không** làm chung wave với LOAI_NKBV.

### 4.4 LOAI_NKBV — xem §5

### 4.5 Leftover nhẹ (code hygiene, không migrate)

- `repository.ts` CONSOLIDATED_LOAIS — **đã gỡ** 2 key QLCV (W3d).
- `LOCKED_SYSTEM_LOOKUP_LOAI` còn 2 loại QLCV (ok như «defense in depth» đến khi DROP row).
- `QlcvDmAdminLinks` — **đã xóa** (Wave 1).

---

## 5. LOAI_NKBV — stance (một đoạn)

**Strategy B locked 2026-09-26 (code):** Giữ MDM rows + FK `loai_nkbv_id` (không DROP / không TEXT+CHECK trong wave này). Hub **khóa CRUD** (`LOAI_NKBV` ∈ `LOCKED_SYSTEM_LOOKUP_LOAI`); server reject upsert/toggle/soft-delete/import; gỡ option duyệt MDM. UI/labels + write gate dùng allowlist từ `nkbv-loai-labels.ts` (`NKBV_MDM_CODE_CANDIDATES` → `NKBV_ALLOWED_MDM_LOAI_CODES` / `isAllowedNkbvMdmLoaiCode`); form bundle lọc dropdown. BA gate vẫn resolve row `nkbv_dm_loai`. **A (DROP MDM → CODE-only) = reject** (gãy BA). **C (leave open CRUD) = reject**. TEXT+CHECK rewrite = draft riêng sau Domain-ready — chưa thêm file migrate apply. Pediatric strip skill riêng — không gộp.

---

## 6. Strategies A / B / C

| | **A — Aggressive CODE-first** | **B — Pragmatic waves (khuyến nghị)** | **C — Lock-only / giữ MDM** |
|--|------------------------------|----------------------------------------|------------------------------|
| Scope | Mọi workflow enum → TEXT+CHECK+const; DROP hầu hết façade locked | Tiếp Wave 3: QLCV migrate → TRAM SSOT → TT NKBV project → LOAI_NKBV PO | Chỉ ẩn/khóa hub; không DROP; DUAL sống mãi |
| DB slim | Cao nhất | Trung bình–cao theo wave | Thấp (gần 0) |
| Risk | Cao (NKBV FK, CSSD persist id) | Kiểm soát được; gate DROP rõ | Thấp nhất |
| Effort | XL (1–2 quý) | M theo wave (ngày→tuần) | S (đã gần xong) |
| Khoa học / đúng | Tốt cho process codes; **nguy** nếu ép LOAI_NKBV | Khớp CDC: process=CODE, vocab viện=MDM | An toàn vận hành; để nợ DUAL/JOIN |
| Anti-bias | Tránh «xóa hết lookup cho vui» — LOAI_NKBV & master TABLE **không** thuộc A | Tránh vừa sợ migrate vừa không bao giờ bỏ JOIN | Tránh «an toàn = không bao giờ dọn» — perf list QLCV vẫn trả JOIN thừa |

### Khuyến nghị: **B**

1. **Đã chứng minh** trên QLCV (Wave 1+3): hardcode FE trước, migrate DROP sau, LOAI_NKBV untouched — đúng thứ tự an toàn × slim.
2. **Phân tầng khoa học:** process/finite = CODE; org/catalog/CDC row ids = MDM — không đánh đồng.
3. **Anti-bias:** không chọn A vì «sạch schema» (phá BA); không chọn C vì «sợ đụng DB» (để mãi DUAL + JOIN trên mọi list).

---

## 7. Recommended sequence (waves) — **no auto-apply**

| Wave | Việc | Migrate? | Gate |
|------|------|----------|------|
| **W3b** | UAT FE QLCV hardcode (list/Kanban/badge/create) | Không | Nghĩa sign-off |
| **W3c** | Apply draft `20260926053300` (CASE view → DROP 2 dm → soft-deactivate) | **Có — sau UAT** | grep JOIN sạch · rollback plan |
| **W3d** | Hygiene: gỡ QLCV khỏi `repository` CONSOLIDATED_LOAIS; **KEEP** LOCKED 2 key tới W3c | **DONE 2026-09-26** (giữ LOCKED) | — |
| **W4** | TRAM_CSSD: một SSOT nhãn const; quyết định persist `ma_tram` TEXT vs giữ id; khóa vĩnh viễn | Có nếu đổi cột | CSSD scan/mẻ UAT |
| **W5** | TRANG_THAI_NKBV_CA → TEXT+CHECK **hoặc** tuyên bố «FK khóa vĩnh viễn» | Có nếu chọn TEXT | NKBV write + BA |
| **W6** | LOAI_NKBV: lock+allowlist (B) — **DONE code**; **không** DROP FK; TEXT rewrite = later draft | Code done; migrate N/A | Domain seed audit còn |
| **W7+** | DELETE cứng rows soft-deactivated ≥1 sprint; audit `KHOA_KSNK_CONFIG` | Có | Quan sát prod |

### «Không DROP cho đến…» (checklist)

- [ ] Không còn `.from('qlcv_dm_loai_cong_viec'|…trang_thai…')` trong `src/`
- [ ] Mọi `CREATE VIEW v_qlcv_*` / RPC không `JOIN qlcv_dm_*`
- [ ] Localhost UAT: list, Kanban màu 7 TT, chi tiết loại, spawn DINH_KY, DOT_XUAT
- [ ] NKBV create/BA **không** đổi
- [ ] PO/Lead approve file migrate cụ thể
- [ ] Soft-deactivate trước; DELETE cứng sau quan sát

---

## 8. Top 10 next actions (DB slimness × safety)

1. **UAT + apply** `20260926053300` QLCV (slim JOIN list — thắng đo được lớn nhất / risk đã mitigat FE).
2. Xác nhận prod không còn client đọc `qlcv_dm_*` (grep + optional SQL `pg_views` definition).
3. ~~Gỡ leftover QLCV CONSOLIDATED_LOAIS~~ **DONE W3d**.
4. TRAM: thống nhất `STATION_LABEL*` → một module const; hub giữ khóa.
5. Đo/ghi quyết định persist trạm: TEXT `ma_tram` trên fact vs UUID (doc ADR ngắn).
6. PO chốt TRANG_THAI_NKBV_CA: TEXT+CHECK roadmap **hoặc** FK forever.
7. ~~PO chốt LOAI_NKBV lock+allowlist~~ **DONE code (B)**; còn Domain seed-audit prod.
8. Audit sống `KHOA_KSNK_CONFIG` trên prod (SELECT count) → DEAD cleanup hoặc KEEP.
9. Hub IA: đảm bảo locked rows không deep-link mutate (đã `isDefaultVisibleHubRow`).
10. Sau ≥1 sprint soft-deact QLCV: DELETE cứng rows lookup (tuỳ chọn — ít giá trị slim hơn DROP view).

---

## 9. Việc cần Domain / PO lock trước code

| # | Câu hỏi | Block gì |
|---|---------|----------|
| 1 | Apply migrate Wave 3c QLCV trên môi trường nào trước (local → staging → prod)? | W3c |
| 2 | LOAI_NKBV: admin **được** thêm mã ngoài BSI/UTI/SSI/VAE/VAP/HAP/CH17 không? | Lock hub vs KEEP CRUD |
| 3 | TRANG_THAI_NKBV_CA: dự án TEXT+CHECK Q4 hay khóa FK vĩnh viễn? | W5 scope |
| 4 | TRAM_CSSD: có bao giờ thêm trạm thứ 7 không? (nếu không → CODE cứng 6) | W4 |
| 5 | `muc_do` còn giá trị `KHAN_CAP` trên CHECK định kỳ — giữ legacy hay siết 3 mức? | Optional CHECK tighten |

---

## 10. Nguồn đã đọc / grep

- Prior: `_audit-mdm-enum-cleanup-2026-09-26.md` §10 Wave 3
- `src/lib/master-data/{locked-system-lookups,domain-registry,danh-muc-hub-catalog,quan-tri-hub-jobs,repository,categories-by-type}.ts`
- `master-crud-core.ts` ALLOWLIST + CONSOLIDATED_MAPS (13 lookup maps)
- `qlcv-labels.ts`, `trang-thai-canonical.ts`, `nkbv-loai-labels.ts`, `cssd-stations.ts`, `dao-tao/labels.ts`
- Consumers: python count `.from` trên `src/` (khoa 38, ns 69, bang_kiem 39, qlcv_dm 0, nkbv_dm_loai 3, nkbv_dm_trang_thai_ca 8, cssd_dm_tram 1…)
- Migrations: `20260604120000`, `20260607100000`, `20260709140000`, `20260802140000` (JOIN còn), `20260926053300` (draft), `20260606100000` (DELETE NGUYEN_NHAN…)
- Guidance: `docs/reference/architecture/lookup-vs-enum-guidance.md`

---

## 11. Không tự làm trong pass này

Pass 2026-09-26 tối: đã refactor runtime **an toàn** (lock+allowlist + W3d hygiene). Vẫn **không** apply migrate / DROP / push / PR. Skip commit `AGENTS.md` + CSV junk.


---

## 12. Changelog agent 2026-09-26 (Strategy B continue)

**Pick A/B/C for LOAI_NKBV:** **B** — lock hub + CODE allowlist; keep FK/rows. Reject A (DROP) and C (leave open).

| Item | Result |
|------|--------|
| W3d QLCV | Removed `LOAI_CONG_VIEC`/`TRANG_THAI_CONG_VIEC` from `repository.ts` CONSOLIDATED_LOAIS; **kept** in `LOCKED_SYSTEM_LOOKUP_LOAI` until W3c migrate applied |
| LOAI_NKBV lock | Added to `LOCKED_SYSTEM_LOOKUP_LOAI`; hub hide + GenericDmMasterPage read-only; server reject on generic upsert/toggle/delete/import |
| Allowlist | `NKBV_ALLOWED_MDM_LOAI_CODES` + `isAllowedNkbvMdmLoaiCode` / `filterAllowedNkbvLoaiRows` in `nkbv-loai-labels.ts`; write validate + form bundle filter |
| MDM modal | Removed `LOAI_NKBV` (+ TT) from approve category options |
| Still blocked / needs Nghĩa | Apply draft `20260926053300` QLCV Wave3c; Domain/prod seed audit allowlist vs live `sys_lookup_value`; optional later TEXT+CHECK draft |
| Not done | No DROP `nkbv_dm_loai`; no push/PR/Vercel; no pediatric strip conflation |
