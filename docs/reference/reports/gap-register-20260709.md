# Gap register — Rà soát toàn diện (2026-07-09)

> Baseline: [audit-evidence-pack-20260709.md](./audit-evidence-pack-20260709.md) · Báo cáo: [comprehensive-review-20260709.md](./comprehensive-review-20260709.md)  
> Tiếp nối [gap-register-20260703.md](./gap-register-20260703.md) (P0/P1 khi đó = 0 — **mở lại** theo bằng chứng mới).  
> **Nguyên tắc:** 1 gap = 1 chat `/intake-nv` → `/implement` sau khi PO duyệt.

---

## Automated gates (2026-07-09)

| Gate | Kết quả |
|------|---------|
| `verify:engineering` | **PASS** |
| `audit:legacy-rpc` / `audit:views` | **PASS** |
| `verify:cssd` / `test:pilot` | **PASS** (49 / 24) |
| `layout:typography-check` | **PASS** |
| `layout:drift-check` | **FAIL** — 2 adoption |
| `dead-code:scan` | **WARN** — 5 unused files |
| `local:golden:verify` / `pilot:go-live:gate:local` | **BLOCKED** (Docker) |

**P0 mở: 0 · P1 mở: 1 (OPS-01 Docker) · P2/P3: xem bảng**

---

## Remediation 2026-07-09 (implement sau audit)

| ID | Trạng thái | Bằng chứng |
|----|------------|------------|
| DOM-07 | **Done** | `isHaiSuspectByDay3Rule` + skip spawn POA trong `giam-sat-nkbv-import.actions.ts` |
| BE-RPC-01 | **Done (migration pending apply)** | `20260709120000` REVOKE authenticated trên `fn_qlcv_update_checklist` |
| DOM-04 | **Done** | Bỏ auto `bom_kiem_dem_at` trong `cssd-scan.actions.ts` |
| DOM-08 | **Eng Done / UAT pending** | Status ưu tiên `CHO_XAC_MINH`; checklist #1 cập nhật |
| BE-RPC-02 | **Done (migration pending apply)** | Wrapper GSC analytics + revoke anon |
| BE-RPC-03 | **Done (migration pending apply)** | Wrap CSSD RPC + `fn_require_cssd_workflow_edit` |
| UI-01 | **Done** | QrCameraModal + IncidentReportModal dùng `bv103PanelChrome as UI` |
| OPS-01 | **Blocked** | Docker vẫn chặn — PO chạy `npm run mdm:migrate:local` |

**Verify session:** `verify:engineering` PASS · `verify:cssd` 49 PASS · timeline-math 25 PASS · `layout:drift-check` PASS

---

## P0 — Chí mạng (dữ liệu / bảo mật)

### DOM-07 / FEAT-NKBV-01 — Day-3 không enforce server-side khi import vi sinh — **Done**

| | |
|--|--|
| **Bằng chứng** | UI: `NkbvViSinhImportPortal.tsx` tính `isHaiSuspect` (`diffDays >= 2`) nhưng `handleImportSubmit` gửi **toàn bộ** `records`. Server: `giam-sat-nkbv-import.actions.ts` vòng L198+ tạo `nkbv_fact_su_kien` không lọc Day-3. |
| **Ảnh hưởng** | Ca POA (ngày 1–2) vào giám sát HAI → KPI nhiễm khuẩn sai chuẩn CDC. |
| **Khắc phục** | ~~Trong `importViSinhExcel`: chỉ spawn case khi Day-3~~ **Đã làm** `isHaiSuspectByDay3Rule`. |
| **Verify** | `vitest` nkbv-timeline-math · `verify:engineering` — **PASS** |
| **Effort** | M |
| **Chat** | `/intake-nv` module NKBV — «Import vi sinh chỉ tạo ca từ Day-3» |

### BE-RPC-01 — `fn_qlcv_update_checklist` GRANT authenticated không check quyền — **Done (pending migrate)**

| | |
|--|--|
| **Bằng chứng** | `20260531120000` GRANT `authenticated`; `20260607100000` REPLACE function **không** thêm `fn_sys_has_permission` / revoke authenticated. SECURITY DEFINER cập nhật checklist/% bất kỳ `qlcv_fact_cong_viec`. |
| **Ảnh hưởng** | User đã login có thể gọi PostgREST RPC trực tiếp, bypass scope app. |
| **Khắc phục** | Migration `20260709120000` — REVOKE authenticated, chỉ `service_role`. |
| **Verify** | Sau `mdm:migrate:local` — authenticated không EXECUTE |
| **Effort** | S–M |
| **Chat** | `/intake-nv` module QLCV — «Siết RPC checklist» |

---

## P1 — Cao (nghiệp vụ / bảo mật tầng RPC)

### DOM-04 — CSSD BOM auto-stamp khi quét Đóng gói — **Done**

| | |
|--|--|
| **Bằng chứng** | `cssd-scan.actions.ts` L140–148: `update bom_kiem_dem_at` khi quét, không qua `rpc_cssd_persist_bom_checkpoint`. |
| **Ảnh hưởng** | Hệ thống coi đã kiểm cấu phần chỉ vì quét QR → thiếu dụng cụ có thể vào tiệt khuẩn. |
| **Khắc phục** | ~~Bỏ auto-stamp~~ **Đã làm** — chỉ còn `rpc_cssd_assign_cycle_qr`. |
| **Verify** | `verify:cssd` PASS |
| **Effort** | M |

### DOM-08 / FEAT-NKBV-02 — NKBV UAT + trạng thái auto-case lệch checklist — **Eng Done / UAT pending**

| | |
|--|--|
| **Bằng chứng** | Checklist: kỳ vọng `CHO_XAC_MINH`; import set `DANG_GHI_NHAN`. UAT #2–#5 `[ ]` chưa ký. |
| **Khắc phục** | Map import → `CHO_XAC_MINH` (fallback DANG_GHI_NHAN). UAT #2–#5 vẫn cần PO. |
| **Verify** | Checklist #1 eng 2026-07-09 |
| **Effort** | M (code S + UAT PO) |

### BE-RPC-02 — GSC analytics RPC chưa harden như VST — **Done (pending migrate)**

| | |
|--|--|
| **Bằng chứng** | VST: `20260704110000` + `fn_require_gstt_analytics_access`. GSC: `20260630140000` GRANT rộng, chưa wrapper. |
| **Khắc phục** | `20260709120000` mirror VST cho GSC strategic / checklist detail / compare. |
| **Verify** | Sau migrate + smoke JWT |
| **Effort** | M |

### BE-RPC-03 — CSSD workflow RPC GRANT authenticated không `fn_sys_has_permission` — **Done (pending migrate)**

| | |
|--|--|
| **Bằng chứng** | `rpc_scan_workflow_station`, `rpc_cssd_persist_bom_checkpoint`, `rpc_cssd_assign_cycle_qr` — gate nghiệp vụ trong RPC nhưng thiếu permission module. |
| **Khắc phục** | `fn_require_cssd_workflow_edit` + wrap 3 RPC; service_role bypass cho admin client. |
| **Verify** | Sau migrate + `verify:cssd` |
| **Effort** | M |

### OPS-01 — Local golden / go-live gate Blocked (Docker) — **Open**

| | |
|--|--|
| **Bằng chứng** | `permission denied` docker.sock; Supabase CLI EPERM telemetry. |
| **Khắc phục** | PO mở Docker Desktop + quyền CLI; chạy `mdm:migrate:local` + `local:golden:verify` + `pilot:go-live:gate:local`. |
| **Effort** | S (ops) |

---

## P2 — Trung bình

| ID | Slice | Trạng thái |
|----|-------|------------|
| DOM-01 | Spec §2.1 VST | **Done** — domain-spec 1.2 |
| DOM-02 | TGS đọc summary VIEW | **Done** — metric-dictionary ghi ngoại lệ |
| DOM-05 | CAP_PHAT hard vs soft | **Done** — mapping + interaction-matrix soft-warning |
| DOM-10 | QLCV CHECK legacy mã | **Deferred P3** — cần audit dữ liệu trước thu hẹp CHECK |
| DB-01 | G-11 backlog 0703 | **Done** — gap-register-0703 cập nhật |
| DB-02 | RLS summary | **Done/N/A** — VIEW live; DROP policy legacy; underlying fact RLS |
| DB-03 | CSSD bao_tri/kho RLS | **Done** — `20260709130000` |
| DB-04 | = BE-RPC-02 | **Done** (P1) |
| DB-08 | NKBV fact RLS | **Done** — `20260709130000` |
| UI-01 | Layout 2 modal | **Done** |
| BE-AUTH-03/04 | Prefetch / missing env | Prefetch giữ (perf); **BE-AUTH-04 Done** — thiếu env → redirect login |
| G-12 (cũ) | unused-var boy-scout | Ongoing (không block) |
| BE-ORPHAN-01 | 5 file Pilot W3 | **Done** — đã xóa |
| DOM-03 | GSC README dual entry | **Done** |
| DOM-14 | spawn RPC tên cũ | **Done** |

---

## P3 — Thấp / roadmap

| ID | Slice | Trạng thái |
|----|-------|------------|
| DOM-03 | README GSC dual entry | **Done** (P2 batch) |
| DOM-09 | CDC baseline DB chưa dùng | MVP OK — giữ |
| DOM-10 | Thu hẹp QLCV CHECK legacy | Deferred — cần audit data |
| DOM-11 | QLCV badge màu qua MDM lookup | Giữ |
| DOM-14 | mapping spawn RPC tên cũ | **Done** |
| DB-05 | Dual naming `fact_*_summary` compat | Giữ (RPC hotpath) |
| DB-06 | mapping lệch bảng đã DROP | Giữ / boy-scout |
| DB-07 | `v_auth_user_permissions` CANDIDATE_REVIEW | Giữ |
| BE-ORPHAN-01 | 5 file Pilot W3 | **Done** |
| BE-CSSD-02 | Whitelist MDM import CSSD | Giữ |
| D-15…D-20 | Roadmap | Giữ |

---

## Hàng đợi implement (PO chọn tuần tự)

| # | Gap | Module | Effort | Trạng thái |
|---|-----|--------|--------|------------|
| 1 | DOM-07 | NKBV | M | **Done** |
| 2 | BE-RPC-01 | QLCV | S–M | **Done** (cần migrate) |
| 3 | DOM-04 | CSSD | M | **Done** |
| 4 | BE-RPC-02 | Giám sát GSC | M | **Done** (cần migrate) |
| 5 | BE-RPC-03 | CSSD | M | **Done** (cần migrate) |
| 6 | DOM-08 | NKBV UAT | M + PO tay | Eng Done — UAT #2–#5 |
| 7 | OPS-01 | Ops | S | **Open** — mở Docker + `mdm:migrate:local` |
| 8 | UI-01 | UI shell | S | **Done** |
| 9 | DOM-01 + DB-01 | Docs | S | **Done** |
| 10 | BE-ORPHAN-01 | Dashboard/QLCV | S | **Done** |
| 11 | P2 batch | Docs+RLS+proxy | M | **Done** (DOM-10 deferred) |

---

## Backlog giữ từ 2026-07-03

| ID cũ | Trạng thái mới |
|-------|----------------|
| G-12 unused-var | Vẫn P2 ongoing |
| G-11 / S-RLS-01 | **Engineering Done** (migration 0703) — residual DB-02 summary; cập nhật doc |
| G-10 NKBV UAT | Vẫn mở → gộp DOM-08 |

---

## Deliverables đợt này

1. [audit-evidence-pack-20260709.md](./audit-evidence-pack-20260709.md)
2. [comprehensive-review-20260709.md](./comprehensive-review-20260709.md)
3. Gap register này
4. Cập nhật [debt-register.md](../architecture/debt-register.md) mục Audit 2026-07-09
5. Cập nhật [README.md](./README.md) index SSOT
