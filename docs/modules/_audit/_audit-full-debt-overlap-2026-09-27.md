# Audit full — technical debt + module overlap + IA slim — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip audit | Soft **QLCV-L01/L02 verify PASS** Soft Soft-queue — `_audit-soft-qlcv-l01-l02-verify-2026-09-28.md`; Soft Soft-queue Soft Soft-queue-ready **empty** (idle until Nghĩa commit/apply or Domain L04) |
| Phạm vi | Toàn product doors + debt + overlap + perf + phased plan A/B |
| Không | push / PR / merge / Vercel / Cloud / apply migrate / DROP / rewrite lớn |
| Mandat | **Deep AUDIT + plan A/B** — chờ Nghĩa lock trước rewrite; Soft chỉ commit doc |

---

## Locked package — Nghĩa 2026-09-27 (Soft execute)

| Wave | Lock | Status |
|------|------|--------|
| **W1** | **A** hygiene | **DONE** Soft — dead writers + InstrumentDoorTabs + ChiTiet/HoaChat/KhoDungCu prune + HC CTA `?group=CHEMICAL` + entryMode comment |
| **W2** | **A** dung-cu primary Việc / secondary Tra cứu | **DONE** Soft — strip regroup; deep-link `?tab=` giữ; G-P0-06 write paths giữ; no MOVE on su-co |
| **W3** | **A** flatten CSSD báo cáo (FE) · **B** NKBV Phân tích | **A DONE**; **B N/A / already OK** Soft 2026-09-27 — survey: `/giam-sat-nkbv` đã 1 strip phẳng 5 tab (`records·cases·vi-sinh·mau-so·dashboard`); **không** có nested hub «Phân tích» như CSSD report trước W3A → không FE churn |
| **W4** | **DONE** | ME+Wave3 applied prod Soft 2026-09-28 ~00:13 ICT |
| **W5** | **A** perf CSSD eager pages | **DONE** Soft — `next/dynamic` tab panels `/cssd-dung-cu` · `/cssd-thiet-bi` · `/cssd-hoa-chat` (shell light như QLCV Perf P1); no W3/W4/W6 |
| Ops | Soft **may** `rm -rf .next` local | optional after code |
| **Không** | push / PR / merge / Vercel / Cloud / apply migrate / DROP | locked |

### Soft residual P2 — 2026-09-27 (post W1–W3/W5)

Survey Soft-feasible leftovers from this audit (local only). Evidence on tip `3ad536e`+:

| # | Item | Verdict |
|---|------|---------|
| 1 | **KhoDungCuPage** legacy export (#13 / L8) | **DONE W1** — view deleted `3ed708b`; residual dead `fetchCssdKhoDungCuList` (`cssd-kho-read.actions.ts`) **0 callers** → **deleted Soft residual** |
| 2 | Eager heavy CSSD shells beyond W5 | **N/A** — dung-cu / thiet-bi / hoa-chat / quy-trinh already `dynamic()`; su-co = write form (OK eager); report Charts already dynamic; no clear extra shell win |
| 3 | NKBV dashboard pulls while on write tabs | **N/A / already OK** — `NkbvDashboardPanel` `dynamic()`; `loadDashboard` gated `mainTab === "dashboard"`; `fetchRecords` gated `records`. **Do not** invent «Phân tích» nest. Cases list hook still mounts always — park (needs shared `enabled`, not Soft residual P2) |
| 4 | Dead-export sweep catalog paths (W1 touch) | **DONE Soft residual** — prune unused `instrument-catalog/entrypoint` re-exports (tabs + hook; dung-cu imports views/hook directly); keep `registerPhysicalBoLabelFromDmAction` |
| 5 | This audit status | Soft Soft-queue **empty** — W4 DONE prod · W6 FE closed Soft |

**Soft Soft-queue empty?** **Y Soft Soft-queue-ready** — **QLCV-L01/L02 verify PASS** Soft Soft-queue 2026-09-28 (`_audit-soft-qlcv-l01-l02-verify-2026-09-28.md`). Soft Soft **idle** until Nghĩa commit/apply Soft Soft-local WT + drafts, or Domain CSSD-L04 schema. Ops residual (not Soft Soft-queue-ready Soft Soft): W4/W6 DONE · Soft Soft-local uncommitted (NKBV 20a–f · GSC L01/L02 · CSSD L01–L07 · cho_toi 24) · drafts await Lead (checklist post-Wave3 · cho_toi · used_clinically · ledger ensure · GSC L01 RPC) · L04 `parent_bo_id` Domain · Q-14/AB-2/NGHIEM_THU DINH_KY park.

### Soft Soft-queue — CSSD-L01…L05 verify (2026-09-28)

**DONE Soft-local** — L01 Đóng gói scan-only (ẩn tách/vật liệu/BOM đề nghị trên `gateMode`; giữ đếm mỏng) · L02 soft-warn UI off + `formatTimeHmVi` · L03 SC picker whitelist (prior 23 WT) · L04 **PARK** `parent_bo_id` · L05 CAP_PHAT hard-block SC TK tip OK. L06/L07/L08 verify-only (18b / 23 / ledger draft). Detail `_audit-soft-cssd-l01-l05-verify-2026-09-28.md`. **Next Soft (closed):** **QLCV-L01/L02 verify** → DONE Soft Soft-queue (see beat below).

### Soft Soft-queue — QLCV **L01+L02 verify** Soft Soft-queue-ready (2026-09-28)

**DONE Soft Soft-queue** — tip `244ef21`: **L01 PASS** 19d gói A (ưu tiên nổi · ẩn loại · `QlcvDmAdminLinks` gone · khóa CRUD LOAI/TT) · **L02 PASS** tip FE null-TT + `fn_qlcv_transition` + migrate recreate on tip (no `qlcv_dm_*`). Residual Lead: apply `20260928021700` + Soft deep §7 smoke nếu chưa prod. **No** code change this beat. Left alone Chờ tôi 24 WT + other drafts. Detail `_audit-soft-qlcv-l01-l02-verify-2026-09-28.md`. Soft Soft-queue Soft Soft-queue-ready **empty** — Soft Soft idle overnight.

### Soft next — Quy trình / 6 trạm SSOT (2026-09-27 post residual)

Prefer order #1 after Soft Soft-queue empty: **FE-only** Kiểm bộ label digests on `/cssd-quy-trinh` shell + thin su-co residual (PROCESS_QC_FAIL + delete dead hub exports). See `_audit-soft-next-quy-trinh-tram-ssot-2026-09-27.md`. **No** migrate / W4 / W6.

### Soft next — Report/print station SSOT (2026-09-27 post Quy trình)

Parked B from Quy trình beat unlocked: thin FE digests report/print/RCA/mẻ-scan → `stationLabel` (QC → Kiểm bộ). See `_audit-soft-next-report-print-station-ssot-2026-09-27.md`. **No** migrate / W4 / W6 / non-station replace sweep.

### Soft next — GSC/TGS H2 leftover (2026-09-27 post CSSD Soft-queue empty)

Prefer GSC/TGS vs locked H2: thin FE leftover (breadcrumb `/` · RBAC copy · delete orphan `qlcv-brief` · SSOT docs). See `_audit-soft-next-gsc-h2-leftover-2026-09-27.md`. **No** invent IA / W4 / W6 / VST (no clear P0).

Prefer Soft Soft-queue next after H2 leftover: **VST / giám sát BM hub** thin — ModeNav Thống kê sidebar active (`isGiamSatNavPath` + `/thong-ke/vst|gsc`). See `_audit-soft-next-vst-bm-hub-2026-09-27.md`. **No** invent nest IA / W4 / W6.

### Soft next — ME polish FE post W4 (2026-09-28)

Survey A thin: tip **already polished** (UX 1–4 + S5 + Kiểm bộ mẻ-scan). See `_audit-soft-next-me-polish-fe-2026-09-28.md`. **N/A** — no FE churn.

### Soft Soft-queue — Quản trị hệ thống admin (2026-09-28)

**DONE Soft** — survey + P0 FE wire (Đặt lại MK / duyệt RESET / Tạo TK dialog trên `/nhan-su`) + **P1** BE: `provisionStaffAuthAccount` sync KSNK role từ `vai_tro` · `approveForgotResetRequest` fail-closed `CHO_DUYET`+RESET trước reset MK. Detail `_audit-soft-admin-he-thong-2026-09-28.md` §7. Soft Soft-queue: admin P0+P1 closed; residual P2 park (Auth ban · delete orphan files · invite-email · dual-admin).

### Soft Soft-queue — NKBV deep (data + case determination) (2026-09-28)

**DONE Soft P0 (shallow pass)** — IA/doors + PedVAP label — `_audit-soft-nkbv-deep-2026-09-28.md`.

### Soft Soft-queue — NKBV **RIT hard-stop 20a=A** (2026-09-28)

**DONE Soft** — PO locked A · DoD §3: `applyCh2RitGate` in evaluate* (BSI/UTI/PNEU/Ch.17); SSI/VAE bypass; ENDO RIT=hết admission; write sibling lookup + IWP bridge inject; vitest `nkbv-rit-hard-stop.spec.ts`. Detail `_audit-soft-nkbv-rit-20a-2026-09-28.md`. Soft Soft-queue: RIT 20a **closed Soft-local** (uncommitted). **age-null 20b → DONE Soft** (see beat below). Park: Transfer · SSI deepest · MBI ANC · APRV.


### Soft Soft-queue — NKBV **age-null 20b=A** (2026-09-28)

**DONE Soft** — PO skip → default A · DoD §3: bỏ default `age=45` bridge PNEU + `coerceAdultPatientAge`; thiếu DOB/tuổi → `NO_EVENT` / submit gate «Thiếu ngày sinh — không xác định ca»; vitest L02 null-age + gate. Detail `_audit-soft-nkbv-age-null-20b-2026-09-28.md`. Soft Soft-queue: age-null 20b **closed Soft-local** (uncommitted). **Transfer 20c → DONE Soft** (see beat below). Park: SSI deepest · MBI ANC · APRV.


### Soft Soft-queue — NKBV **Transfer multi-khoa 20c=A** (2026-09-28)

**DONE Soft** — Domain A · DoD §3: `attributeLocationOfAttribution` in `nkbv-timeline-math` — multi-khoa 24h calendar → first khoa ngày trước DOE; Transfer day/day-after → khoa chuyển đi; empty `ba_ngay_khoa` → null LOA + warn (L07); Hub hydrate clears synthetic stay. Vitest timeline-math + ba-ngay/grid. Detail `_audit-soft-nkbv-transfer-20c-2026-09-28.md`. Soft Soft-queue: Transfer 20c **closed Soft-local** (uncommitted). **SSI 20d → DONE Soft** (see beat below). Park: MBI ANC · APRV.



### Soft Soft-queue — NKBV **SSI deepest 20d=A** (2026-09-28)

**DONE Soft** — Domain A · DoD §3: `evaluateSsi` deepest met (Superficial<Deep<Organ); Organ needs Ch.17 when site has def (no invent); user nông hơn → engine + amber warn (`warnings` / SsiClinicalSubForm / DiagnosticCaseForm); `mapSsiCriteriaFlags` maps shared ticks → all depth flags; PATOS/SP/RIT/MBI/Transfer/APRV untouched. Vitest `nkbv-ssi-deepest.spec.ts` + SSI suites. Detail `_audit-soft-nkbv-ssi-20d-2026-09-28.md`. Soft Soft-queue: SSI 20d **closed Soft-local** (uncommitted). **MBI ANC 20e → DONE Soft** (see beat below). **Next Soft:** **APRV 20f** (line-check `cdc-ch10`, no invent).

### Soft Soft-queue — NKBV **MBI ANC 20e=A** (2026-09-28)

**DONE Soft** — Domain A · DoD §3: Soft Soft line-check `nkbv-sources/extracted/cdc-ch4.txt` (Table 2/5); constants <500 · ≥2d · máu±3 · diarrhea under allo HSCT only; `nkbv-mbi-ch4` + rules-engine MBI block; diarrhea-alone ≠ MBI (tip P1 fix); organism = `is_intestinal_pathogen` proxy (**G.1#5**); **flag PO G.1#1**. Vitest `nkbv-mbi-ch4.spec.ts` + BSI MBI. Detail `_audit-soft-nkbv-mbi-20e-2026-09-28.md`. Soft Soft-queue: MBI 20e **closed Soft-local** (uncommitted). **APRV 20f → DONE Soft** (see beat below).

### Soft Soft-queue — NKBV **APRV/ECMO/HFV 20f=A** (2026-09-28)

**DONE Soft** — Domain A · DoD §3: Soft Soft line-check `nkbv-sources/extracted/cdc-ch10.txt` (126-131 · 1460-1472); ECMO/HFV full-day out of VAC stretch (calendar-adjacent); APRV FiO₂-only (no PEEP-equivalent); remove whole-day `NO_EVENT` stub when daily grid ≥4; **flag PO G.1#2**. Vitest `nkbv-vae-vent-compute` + rules-engine VAE. Detail `_audit-soft-nkbv-aprv-20f-2026-09-28.md`. Soft Soft-queue: APRV 20f **closed Soft-local** (uncommitted). **GSC-L01/L02 → DONE Soft** · **CSSD-L01…L05 verify → DONE Soft** (see beat). **Next Soft (closed):** **QLCV-L01/L02 verify** → DONE Soft Soft-queue.

### Soft Soft-queue — CSSD **used_clinically 23=A / CSSD-L07** (2026-09-28)

**DONE Soft** — Domain A · DoD Soft: event actor+timestamp only (CLINICAL ca mổ / MANUAL fallback); **no** silent on print CAP_PHAT; SC picker `listBoForSuCoPickerAction` §17.3 ¬used; recall partition M-23; draft migrate `20260928024100_cssd_used_clinically_recall.sql` (await Lead). Detail `_audit-soft-cssd-used-clinically-23-2026-09-28.md`. Soft Soft-queue: used_clinically 23 **closed Soft-local** (uncommitted). **Next Soft (closed):** phiếu mẻ harden **18+18b A×6** → DONE Soft (see beat below). Park: L08 ensure-chi_tiet Lead apply · khoa/PM integration.


### Soft Soft-queue — CSSD **phiếu mẻ 18+18b A×6** (2026-09-28)

**DONE Soft** — PO A×6 · AB-1…6 locked: TN fail target · no emergency implant · BI(+) conservative all PP · Plasma/EO `CHO_BI` · PP hard-block on scan · tổ trưởng=`qc` for implant/`CHO_BI`. Harden helpers `me-tiet-khuan-ab-gates` + vitest; mirror 18/18b. Detail `_audit-soft-cssd-phieu-me-18b-2026-09-28.md`. Soft Soft-queue: phiếu mẻ 18b **closed Soft-local** (uncommitted). **Next Soft (closed):** **QLCV Chờ tôi 24** → DONE Soft (see beat below). Park: M-17 thẩm định · M-25 retention · M-28 Plasma Tyvek · M-04 chương trình catalog.


### Soft Soft-queue — GSC **L01+L02** Soft Soft-queue-ready (2026-09-28)

**DONE Soft** — Domain A (PO bỏ qua widget 14 · PO 18:51 hub VST): **L01** `deriveHinhThucGiamSat` Lock A — KSNK luôn `HT_CHUYEN_TRACH` (FE policy + header); draft RPC `fn_get_session_stype` Lock A (await Lead). **L02** hub `/giam-sat` 3 lối WHO+BM.07.02+BM.07.03 · BCTH `VeSinhTayKpiTriptych` 3 KPI tách · `shouldFetchSource(VST→GSC)` · WHO exclude picker. Vitest 36 focused. Detail `_audit-soft-gsc-l01-l02-2026-09-28.md`. Soft Soft-queue: GSC-L01/L02 **closed Soft-local** (uncommitted). **CSSD-L01…L05 verify → DONE Soft** (see beat). **Next Soft (closed):** **QLCV-L01/L02 verify** → DONE Soft Soft-queue. Park: GSC-L03 seed (PO) · L01 historical backfill.

### Soft Soft-queue — QLCV **Chờ tôi 24=A** / QLCV-L03 (2026-09-28)

**DONE Soft** — Domain A actor lens: RPC/`cho_toi` + FE `isQlcvChoToiDuyet` = DE_XUAT|CHO_DUYET ∩ (phụ trách ∨ phối hợp ∨ người giao); chip không hiện open global unrelated; vitest PH-only / outsider=0; **no** Q-14 / AB-2 / 7 TT churn. Draft migrate `20260928025300_qlcv_cho_toi_actor_lens.sql` (await Lead). Detail `_audit-soft-qlcv-cho-toi-24-2026-09-28.md`. Soft Soft-queue: cho_toi 24 **closed Soft-local** (uncommitted). **SSI/MBI/GSC/CSSD-L01…L05 → DONE Soft** (see beats). **Next Soft (closed):** **QLCV-L01/L02 verify** → DONE Soft Soft-queue.

### Soft Soft-queue — NKBV **logic** deep vs Domain SSOT adult v4.0 (2026-09-28)

**DONE Soft P0/P1 logic** — tip vs `10-NKBV-diagnosis-domain-ssot-adult.md` v4.0: POA gate in rules-engine (cấm 48h/day-3); FE/BE device enrich `??` drift; Scenario2 Secondary window; UTI clinical SBAP helper; strip dead `infantGasOk`; Transfer spec titles calendar-day. **Park Domain:** SIR. **RIT 20a + age-null 20b + Transfer 20c + SSI deepest 20d + MBI 20e + APRV 20f → DONE Soft** (see beats). Soft next = Soft-ready GSC/CSSD/QLCV verify. EENT/SST engine **present**. Detail `_audit-soft-nkbv-logic-deep-2026-09-28.md`. Soft Soft-queue: NKBV logic Soft closed; Domain P1 residual SIR · G.1#1/#2/#5 confirm.

### Soft Soft-queue — QLCV **logic** deep vs Domain 19/19c (2026-09-28)

**DONE Soft P0/P1 logic** — tip `d05275b`+ : post-Wave3 `fn_qlcv_update_checklist` still validated against dropped `qlcv_dm_trang_thai` → Soft FE writes checklist/% with null TT then `fn_qlcv_transition` SET; hủy → action `HUY`. **Draft migrate** `20260928021700_qlcv_checklist_rpc_post_wave3.sql` local — Nghĩa/W4/Cloud apply. **cho_toi 24=A → DONE Soft** (actor lens; see beat). **Park Domain:** Q-14 kỳ RPC · AB-2 duyệt cuối · NGHIEM_THU SQL block DINH_KY. Detail `_audit-soft-qlcv-logic-deep-2026-09-28.md`. Soft Soft-queue: QLCV logic Soft closed; migrate apply + Domain park residual.

### Soft Soft-queue — CSSD **Dụng cụ + ledger** logic deep (2026-09-28)

**DONE Soft P0/P1 logic** — tip `50898ff`+: QR hub `maBo` when SET resolve (cycle→catalog); INSTRUMENT scan prefer `maBo`; LUAN_CHUYEN dest scan via hub (reject MACHINE/BATCH); close orphan `dieuChuyenThanhPhanGiuaHaiQrAction` (BOM-only no ledger). **Approach A ensure chi_tiet** — local migrate `20260928023000_cssd_ledger_ensure_chi_tiet_on_move.sql` (CREATE OR REPLACE `fn_cssd_ensure_chi_tiet_for_ledger` + `fn_cssd_apply_instrument_ledger_tx`; BO_SUNG + DIEU_CHUYEN dest; `so_luong=0`; lock loai→chi_tiet→tx; TRA_KHO/BAO_* unchanged). Soft **does not** apply prod — Lead applies after Nghĩa confirm project `cvzwslpxwgqiugzzhqej`. **Park Domain:** so_luong 0 vs qty · THEM_DONG-only reject path. Detail `_audit-soft-cssd-dung-cu-logic-deep-2026-09-28.md`. Soft Soft-queue: CSSD orphan **closed Soft-local**; prod apply residual.






DoD W1: tsc + vitest taxonomy/routes/catalog xanh; 0 caller dead writers.
DoD W2: UAT tạo đề nghị + luân chuyển + xem BO không lệch `?tab=`.

Liên quan (cùng ngày / tip):

- `_audit-ia-direct-doors-2026-09-27.md` — A **LOCKED + applied** (`a068e6e`)
- `_audit-cascade-crud-2026-09-27.md` — C1–C3 fixed; C6–C8 park
- `_audit-qlcv-cssd-me-2026-09-27.md` — F1–F3 doors/BOM done; F4/F5 park migrate
- `_audit-code-vs-mdm-2026-09-26.md` — Strategy B CODE vs MDM
- `docs/core/domain-decisions-cssd-instrument.md` — D1–D10
- `docs/modules/qlcv/_proposal-qlcv-type-vs-priority-2026-09-26.md` — untracked WIP (để yên); neo applied = `19d-QLCV-LOAI-UU-TIEN-20260926.md`

---

## 0. Executive — vì sao «quá nhiều cửa / chậm / chồng»

| Triệu chứng Nghĩa | Nguyên nhân gốc trên tip `a068e6e` | Đã cắt? |
|-------------------|-------------------------------------|---------|
| Nhiều cửa / không trực tiếp | Lịch sử hub 2 tầng (An toàn/Biến động) + tab strip trộn tra cứu+ghi + analytics lồng | Su-co **đã** flatten A; dung-cu / report / NKBV **còn** |
| Module overlap | CSSD ops ↔ MDM admin; su-co form embed LUAN_CHUYEN; BCTH phụ lục CSSD ↔ `/cssd-erp/report`; lịch sử/thống kê GS tách route nhưng ModeNav dialect | Một phần Domain-đúng (D5) nhưng **IA chưa teach** |
| Chậm load | `.next/dev` ~207M; 2 `next-server`; một số page CSSD **eager** (dung-cu/thiet-bi/hoa-chat); NKBV page 1173 dòng; `v_qlcv_*` vẫn JOIN dm (DUAL DB) | Perf P1 QLCV+OfflineSync **done**; residual P2 |
| Không neo core ops | Menu sidebar đã mỏng; **trong module** còn tab/analytics/legacy export | Cần north-star strip + cut redundancy tuần tự |

**Khuyến nghị chiến lược:** không mega-PR. Waves mỏng tuần tự; mỗi wave 1–2 cửa hoặc 1 hygiene PR; Nghĩa lock IA trước khi Soft đụng strip.

---

## 1. Core idea map — SHOULD (Nghĩa) vs IS (tip)

### 1.1 North-star nghiệp vụ (locked — không reopen)

| Domain | Ý Nghĩa (cửa đúng) | Cascade |
|--------|--------------------|---------|
| **CSSD chu trình** | 6 trạm TN→LS→QC(**Kiểm bộ**)→Đóng gói(**scan-only**)→TK(**via phiếu mẻ**)→Cấp phát | Scan advance / mẻ RPC → status + waiting + report |
| **CSSD sự cố** | **5 cửa trực tiếp:** Hỏng/Mất · QT · HC · Máy · Khác | incident + ledger (PHYSICAL) / recall (batch) |
| **CSSD dụng cụ** | LUAN_CHUYEN + DE_NGHI (+ tra cứu BO/LOAI + HISTORY) — **không** embed form module khác | ledger RPC → tồn / HISTORY |
| **QLCV** | assignee / progress / deadline / priority; close cần result; **không** MDM loai/TT admin | transition RPC → board + gate + nhật ký |
| **CODE vs MDM** | Strategy B; LOAI_NKBV lock+allowlist **giữ FK** | — |
| **Local-first** | OfflineSync CSSD-path + supervision-path; không sync admin | — |

### 1.2 Sidebar IS (tip) — đã gần north-star

Evidence: `src/lib/nav/sidebar-nav-groups.ts` + `sidebar-admin-nav-groups.ts`.

| Group | Items (href) | Khớp core? |
|-------|--------------|------------|
| Điều hành KSNK | Báo cáo chính thức → `/bao-cao-tong-hop` | OK (hub đọc) |
| Giám sát | Giám sát → `/giam-sat` (hub write-first) | OK |
| Vận hành nội bộ | Công việc `/quan-ly-cong-viec` · Thi KSNK `/dao-tao` | OK |
| CSSD · Vận hành | Quy trình `/cssd-quy-trinh` · **Sự cố** `/cssd-su-co` | OK (rename A done) |
| CSSD · Tra cứu | Dụng cụ · Thiết bị · Hóa chất | OK label; dung-cu còn **write tabs** trong «Tra cứu» |
| Sửa danh mục | Quản trị hệ thống `/quan-tri-he-thong` | OK (1 cổng) |

**Kết luận:** sidebar **không** phải nguồn bloating chính. Bloating = **trong-module tabs / dual routes / dead writers / unapplied migrates / analytics nested**.

### 1.3 Product doors inventory — SHOULD vs IS

| Door | SHOULD | IS tip `a068e6e` | Gap |
|------|--------|------------------|-----|
| `/cssd-quy-trinh` | Chu trình · Mẻ · Truy vết | 3 tab + dynamic panels; `?tab=kho` → redirect dung-cu | OK |
| `/cssd-su-co` | 5 chip cửa trực tiếp | `IncidentGroupPicker` `data-testid=incident-direct-doors` · 5 `DIRECT_INCIDENT_DOORS` | **OK (A applied)** |
| `/cssd-dung-cu` | Việc ghi rõ + tra cứu phụ | Strip ngang: **BO · LOAI · DE_NGHI · LUAN_CHUYEN · HISTORY** | P2 trộn lookup+write |
| `/cssd-thiet-bi` | Danh sách · Bảo dưỡng | 2 tab + «Xem thêm» VAN_HANH | OK/P3 |
| `/cssd-hoa-chat` | Kho HC + CTA sự cố HC | Page kho; sự cố CHEMICAL ở su-co | P2 copy/CTA |
| `/cssd-erp/batch` | Không cần cửa riêng | **redirect** → `quy-trinh?tab=batch` | OK thin legacy |
| `/cssd-erp/report` | Báo cáo CSSD phẳng | **W3A DONE** — 1 strip: Vận hành · Sự cố · Sản lượng · Bộ · Máy · NV · Trách nhiệm | OK |
| `/thong-ke/cssd` | Mirror report | Mirror → report | OK |
| `/quan-ly-cong-viec` | Điều hành · Nhiệm vụ · Định kỳ · Báo cáo | 4 tab + **dynamic** panels (Perf P1) | OK Domain 19 |
| `/giam-sat` | Hub VST·GSC·NKBV write | Hub CTAs + quiet lịch sử/thống kê | OK |
| `/giam-sat-vst` `/giam-sat-chung` | Form only; history/analytics redirect | Redirect `?tab=history|analytics` | OK |
| `/giam-sat-nkbv` | Write-first; flat strip | **W3B N/A** — đã phẳng: records · cases · vi-sinh · mau-so · dashboard (`KsnkSupervisionTabList`); default `records` | OK flatten; residual P2 mix write+analytics (khác W3B) |
| `/bao-cao-tong-hop` | Báo cáo chính thức | KPI+VST+GSC default; more collapsed (CSSD appendix) | OK/P2 polish |
| `/quan-tri-he-thong` | MDM admin · duyệt DE_NGHI · RBAC | Hub jobs 4 + tabs DANH_MUC/PHAN_QUYEN/IT | OK; dễ nhầm vs dung-cu DE_NGHI |
| `/dao-tao` | Thi KSNK | Hub + admin dynamic | OK peripheral |
| `/` | Redirect BCTH | redirect | OK |

### 1.4 CSSD stations SSOT (tip)

`cssd-stations.ts`: TN · LS · QC=**Kiểm bộ** · Đóng gói · TK · Cấp phát; `SCAN_STATIONS` excludes TIET_KHUAN; `nextIsMeHandoff` → phiếu mẻ. **Khớp lock.**

---

## 2. Overlap matrix — module × module (business leak)

Ký hiệu: **OK** Domain-tách đúng · **LEAK** cửa/IA lẫn · **DUAL** hai đường viết/đọc · **TEACH** đúng Domain nhưng UI chưa nói rõ.

|  | CSSD su-co | CSSD dung-cu | CSSD quy-trinh/mẻ | CSSD report | QLCV | GSC/VST | NKBV | MDM/QT | BCTH |
|--|------------|--------------|-------------------|-------------|------|---------|------|--------|------|
| **CSSD su-co** | — | **TEACH** LUAN_CHUYEN link; **DUAL-UI** `entryMode=luan-chuyen` reuse form | batch-recall entry PROCESS | INCIDENT tab đọc cùng taxonomy | — | — | — | LOAI_SU_CO lookup | phụ lục CSSD |
| **CSSD dung-cu** | Hỏng/Mất out; DE_NGHI create | — | đóng gói **không** đề nghị BOM (F2 done) | HISTORY vs report volume | — | — | — | **TEACH** admin duyệt DE_NGHI / hard CRUD | — |
| **Quy-trình/mẻ** | recall RPC | composition gate | — | station counts | — | — | QR/trace? | TRAM_CSSD locked HYBRID | — |
| **CSSD report** | filter group | — | overview tồn | — | — | — | — | — | **LEAK nhẹ** phụ lục vs full report |
| **QLCV** | — | — | — | — | — | — | — | **DUAL DB** qlcv_dm JOIN; FE CODE; **no** MDM admin loai/TT | — |
| **GSC/VST** | — | — | — | — | — | hub OK; `/lich-su` `/thong-ke` tách | — | bang-kiem MDM | sections VST/GSC |
| **NKBV** | — | — | — | — | — | hub «Khác» | — | LOAI_NKBV **B lock+FK** | section NKBV |
| **MDM/QT** | — | approve queue | — | — | Wave3 park DROP dm | bang-kiem | LOAI lock | — | — |
| **BCTH** | — | — | — | appendix | — | primary sections | more | — | — |

### 2.1 Top leaks (ưu tiên)

| # | Leak | Sev | Fix hướng |
|---|------|-----|-----------|
| L1 | Dung-cu strip trộn tra cứu (BO/LOAI) + việc (DE_NGHI/LUAN_CHUYEN) + HISTORY | P2 | Regroup primary/secondary (wave) |
| L2 | Su-co form vẫn là write path LUAN_CHUYEN (embed dung-cu) — đúng thin, dễ hiểu nhầm «còn MOVE trên su-co» | P1 copy / P2 optional tách component | Doc + banner; optional extract MoveForm |
| L3 | MDM duyệt DE_NGHI vs ops tạo DE_NGHI — 2 mặt D5 | P2 | Banner 1 dòng hai phía (đã partial) |
| L4 | Report nested analytics dưới «Vận hành» | — | **DONE W3A** flat strip |
| L5 | NKBV 5 tab write+analytics ngang hàng | P2 residual | **W3B flatten N/A** (đã phẳng); group «Phân tích» = đề xuất *khác* (nest) — park, không làm dưới W3B |
| L6 | BCTH phụ lục CSSD vs `/cssd-erp/report` full | P3 | Quiet link «Báo cáo CSSD đầy đủ» |
| L7 | QLCV DB JOIN dm vs FE hardcode | P1 park | Nghĩa apply Wave3 draft |
| L8 | `KhoDungCuPage` / ChiTiet / HoaChat exports | — | **DONE W1** + Soft residual: dead `cssd-kho-read` deleted; entrypoint tabs unexported |
| L9 | Dead writers `reportInventoryIssue` / `recordInstrumentTransaction` | — | **DONE Soft Soft Soft-local** (0 `src`; see `_audit-soft-hygiene-debt-2026-09-28.md`) — overlap body was stale vs WT |
| L10 | NKBV module size 2.2M / 1173-line page — gravity well | P2–P3 | Split views đã partial dynamic; tiếp tục |

---

## 3. Redundant doors / tabs / dual entry

Build on `_audit-ia-direct-doors` §5 — **verify tip `a068e6e`:**

| # | Item | Tip status | Sev | Thin fix |
|---|------|------------|-----|----------|
| 1 | Su-co family An toàn/Biến động | **GONE** (A applied) | — | done |
| 2 | Nav «Sự cố & biến động» | **→ «Sự cố»** | — | done |
| 3 | Dung-cu 5-tab mixed | **Còn** | P2 | regroup |
| 4 | Quy-trình 3 cửa | OK | — | giữ |
| 5 | Thiết bị VAN_HANH ẩn | OK/P3 | — | giữ |
| 6 | Hóa chất vs su-co CHEMICAL | TEACH | P2 | CTA deep-link `?group=CHEMICAL` |
| 7 | Report nested analytics | **GONE** (W3A flat strip) | — | done |
| 8 | QLCV 4 cửa | OK | — | giữ; type-vs-priority proposal riêng |
| 9 | Giám sát hub | OK | — | giữ |
| 10 | NKBV nested «Phân tích» hub (flatten như W3A) | **N/A / already flat** (W3B Soft) | — | no FE; residual mix P2 park |
| 11 | QT hub 3 khu | OK | — | giữ |
| 12 | MDM dung-cu vs ops DE_NGHI | TEACH | P2 | banner |
| 13 | `/cssd-erp/batch` dual URL | redirect OK | P3 | giữ alias hoặc eventual drop bookmark |
| 14 | `InstrumentDoorTabs` khi INSTRUMENT chỉ 1 preset | **GONE Soft Soft Soft-local** (0 `src`) | — | **DONE Soft Soft Soft-local** — `_audit-soft-hygiene-debt-2026-09-28.md` (origin tip still stale) |
| 15 | `entryMode=luan-chuyen` trong module su-co | intentional reuse | P1 | comment + optional extract |
| 16 | SAFETY_INCIDENT_GROUPS / hubOfIncidentGroup | `@deprecated` còn code | P3 | giữ tới hết bookmark report; rồi xóa |
| 17 | CHI_TIET / HOA_CHAT catalog tab types | legacy type + unused views | P2 | prune |
| 18 | BCTH many sections | more collapsed **đã có** | P3 | polish default |
| 19 | `/lich-su` `/thong-ke` root redirect VST | OK dialect | — | giữ |
| 20 | QlcvDmAdminLinks (proposal) | proposal uncommitted | P1 Domain | Nghĩa lock proposal A |

**Dual write paths (cùng nghiệp vụ):**

| Nghiệp vụ | Path A (SSOT) | Path B (redundant/legacy) |
|-----------|---------------|---------------------------|
| Inventory instrument lines | `createIncidentReport` → ledger RPC | Path B **GONE Soft Soft Soft-local** (0 `src`; `_audit-soft-hygiene-debt-2026-09-28.md`) |
| Luân chuyển | dung-cu tab + `entryMode=luan-chuyen` → cùng submit | (không dual RPC — OK) |
| Đề nghị DM | ops create → QT approve | hard CRUD QT (ADMIN) — **đúng D5**, không dual approve |
| Mẻ TK | `/cssd-quy-trinh?tab=batch` | `/cssd-erp/batch` redirect |
| Báo cáo CSSD | `/cssd-erp/report` | `/thong-ke/cssd` mirror + BCTH appendix |

---

## 4. Tech debt inventory

### 4.1 Dead / unused code

| Item | Evidence | Action |
|------|----------|--------|
| `reportInventoryIssue` | Soft Soft Soft WT `src` **0** | **DONE Soft Soft Soft-local** — `_audit-soft-hygiene-debt-2026-09-28.md` (origin tip still stale) |
| `recordInstrumentTransaction` | Soft Soft Soft WT `src` **0** | **DONE Soft Soft Soft-local** — same hygiene audit |
| `CSSDCatalogChiTietTab` | Soft Soft Soft WT **0** file / export | **DONE Soft Soft Soft-local** (L8) — hygiene audit |
| `CSSDCatalogHoaChatTab` | Soft Soft Soft WT **0** file / export | **DONE Soft Soft Soft-local** (L8) — hygiene audit |
| `InstrumentDoorTabs` live path | Soft Soft Soft WT `src` **0** | **DONE Soft Soft Soft-local** (L14/#14) — hygiene audit |
| `KhoDungCuPage` as embedded | **deleted W1** (`3ed708b`); dead `fetchCssdKhoDungCuList` **deleted Soft residual** (0 callers) | done |
| SAFETY hub helpers | deprecated after A | Keep short; delete when report filters stop using |

### 4.2 Dual writers / DUAL DB

| Item | State | Gate |
|------|-------|------|
| QLCV FE labels CODE | done (`qlcv-labels.ts`) | — |
| `v_qlcv_cong_viec_full` JOIN `qlcv_dm_*` | **live** (last rewrite pre-draft) | **Nghĩa apply** `20260926053300_…` |
| TRAM_CSSD HYBRID | CODE `STATION_LABEL` + UUID persist; hub locked | keep; optional later CODE-only persist |
| LOAI_NKBV | Strategy B lock+allowlist; FK keep | **không DROP** |

### 4.3 Unapplied migrations (local only — **không apply trong slice**)

| File | Purpose | Owner |
|------|---------|-------|
| `20260925090000` … `20260925150000` | ME-S* batch integrity / QC release / recall / filter / ledger atomic | **Nghĩa** apply + UAT |
| `20260926053300_qlcv_wave3_drop_dm_loai_trang_thai.sql` | CASE view · DROP façade dm · soft-deactivate lookup | **Nghĩa** sau UAT FE |

### 4.4 JOIN still on dm (hot path)

- Live SQL view QLCV vẫn `LEFT JOIN qlcv_dm_loai_cong_viec` / `qlcv_dm_trang_thai_cong_viec` (evidence migrations through `20260802140000` + weekly plan views).
- FE `.from('qlcv_dm_*')` = **0** hot path.
- Draft Wave3 replaces with CASE — parked.

### 4.5 Heavy / large surfaces

| Surface | Size / note |
|---------|-------------|
| `giam-sat-nkbv/` | **2.2M** · 141 files under `lib/` |
| `GiamSatNkbvPage.tsx` | **1173** lines (secondary tabs already `dynamic`) |
| `quan-tri-he-thong/` | 1.2M |
| `cssd-erp/` | 1.2M |
| `QuanLyCongViecPage.tsx` | 643 lines · panels dynamic |
| `.next/dev` | **~207M** (Turbopack cache) |
| `node_modules` | ~829M |
| Processes | `next-server` ksnk từ ~5:01 ICT; thêm next-server project khác — RAM cạnh tranh |

### 4.6 TODOs / @deprecated (mẫu)

- Taxonomy: `@deprecated` SAFETY / SuCoHub (sau A).
- NKBV: nhiều `@deprecated` aliases clinical/timeline — **không** xóa ồ ạt (clinical compat); hygiene theo PR nhỏ khi touch file.
- Dao-tao softDelete deprecated — peripheral.

### 4.7 Dirty WT (không đụng)

`AGENTS.md` modified · `_run_move_*.sh` · CSV · qlcv proposal untracked — **để yên** trừ khi Nghĩa bảo.

---

## 5. Perf hotspots (evidence)

### 5.1 Done (P1) — không reopen

| Item | Evidence |
|------|----------|
| QLCV lazy panels | `QuanLyCongViecPage` `dynamic()` Operations/Nhiệm vụ/Định kỳ/Báo cáo/forms |
| Kanban parallel | `useQlcvKanban` `Promise.all([getCongViecListForBoard(), pendingPromise])` |
| OfflineSync scope | `offline-sync-scope.ts` — CSSD prefixes + supervision paths only; layout conditional mount |
| Quy-trình tab panels | dynamic lifecycle / batch / QR history |
| Dao-tao / BCTH / NKBV route | dynamic page wrappers |
| BCTH sections | dynamic chart sections + `moreSectionsOpen` |

### 5.2 Residual hotspots

| Hotspot | Evidence | Sev | Wave |
|---------|----------|-----|------|
| `/cssd-dung-cu` eager imports all tabs + SetComposition + History | **DONE W5** — `dynamic()` per tab + SetComposition/Reconcile | — | W5 done |
| `/cssd-thiet-bi` eager Fleet+Maintenance+VanHanh | **DONE W5** — `dynamic()` Fleet/Maintenance/VanHanh | — | W5 done |
| `/cssd-hoa-chat` sync import chemical page | **DONE W5** — client `dynamic()` + metadata giữ | — | W5 done |
| VST/GSC form pages | server page + form view (OK for write) | — | — |
| NKBV records fetch on tab + cases table hook | dashboard gated; records gated; cases hook still always-on | P3 park | Soft residual N/A |
| QLCV list still via view with dm JOIN | DB round-trip extra joins | P1 park | Nghĩa migrate |
| ME RPC UAT blocked | migrate unapplied | P1 park | Nghĩa |
| Dev cache `.next/dev` 207M + long-lived next-server | observable | P3 ops | Soft: `rm -rf .next` khi Nghĩa OK local |
| RPC waterfall risk | CSSD waiting / board counts đã batch RPCs (migrations 0907/0910); watch new sequential awaits in catalog reload | P3 | observe |

### 5.3 Offline sync scope (tip)

```
CSSD: /cssd-quy-trinh|/dung-cu|/su-co|/thiet-bi|/hoa-chat|/cssd-erp*
Supervision: /giam-sat*|/giam-sat-vst|/giam-sat-chung|/giam-sat-nkbv|/qr*
```
**Không** gắn QLCV/QT/login — đúng Perf P1.

---

## 6. Phased plan — Waves W0–Wn (A/B, recommended)

### Principles

1. **Không** «rewrite everything» mega-PR.
2. Mỗi wave: 1 chủ đề · DoD kiểm được · rollback = revert commit.
3. Soft làm hygiene/perf **không** đổi IA strip trừ khi Nghĩa lock.
4. Migrate apply / DROP = **chỉ Nghĩa**.

### W0 — Lock & freeze (Nghĩa) · **no code**

| | |
|--|--|
| **A (rec)** | Lock north-star IA sketch §7 + chọn W1–W3 scope trong sprint |
| **B** | Chỉ lock su-co (đã xong) — trì hoãn dung-cu/NKBV |
| **DoD** | Nghĩa trả lời widget options §8 |
| **Risk** | Thấp |
| **Ai** | Nghĩa |

### W1 — Hygiene thin (Soft alone sau W0 ACK «hygiene OK»)

| | |
|--|--|
| **A (rec)** | (1) Xóa dead writers C7 · (2) bỏ call `InstrumentDoorTabs` dead · (3) unexport/prune CHI_TIET + HoaChat catalog tab nếu grep sạch · (4) comment `entryMode` dual-shell · (5) CTA hóa chất → `?group=CHEMICAL` copy |
| **B** | Chỉ docs + comment, không xóa code |
| **DoD** | tsc + vitest taxonomy/routes/catalog xanh; 0 caller dead writers |
| **Risk** | Thấp (delete unused) |
| **Ai** | Soft |
| **Migrate?** | Không |
| **Safe thin P0** | **Có** — đây là P0 an toàn nhất không cần IA lock lớn |

### W2 — Dung-cu strip regroup · **cần Nghĩa lock**

| | |
|--|--|
| **A (rec)** | Primary strip: **Đề nghị · Luân chuyển**; secondary/quiet: Bộ · Loại · Lịch sử (2 cụm copy) |
| **B** | Giữ 5 tab ngang + divider label «Việc» / «Tra cứu» |
| **DoD** | UAT tạo đề nghị + luân chuyển + xem BO không lệch deep-link `?tab=` |
| **Risk** | Bookmark tab; mobile density |
| **Ai** | Soft sau lock |
| **Migrate?** | Không |

### W3 — CSSD report flatten **hoặc** NKBV Phân tích · **PO pick 1**

| | Report | NKBV |
|--|--------|------|
| **A** | Một strip phẳng 6–7 tab | Default records; group «Phân tích» = dashboard (+ optional vi-sinh) |
| **B** | OVERVIEW landing + link cards (không nested strip) | Giữ 5 tab; chỉ reorder + nhãn |
| **Rec** | Nghĩa chọn **một** trong sprint (tránh 2 IA cùng lúc) | |
| **DoD** | Deep-link `?tab=` cũ vẫn resolve | |
| **Migrate?** | Không | |

**Status 2026-09-27 (Soft):** **W3 A DONE** — FE only trên `/cssd-erp/report`: bỏ nested «Phân tích» + strip phụ; một strip phẳng Vận hành · Sự cố · Sản lượng · Bộ · Máy · NV · Trách nhiệm. Mirror `/thong-ke/cssd` + `cssdReportAnalyticsHref` nhận thêm `accountability`.

**W3 B NKBV — N/A / already OK (Soft 2026-09-27):** Survey `GiamSatNkbvPage.tsx` `MAIN_TABS` + `supervisionTabs` + `KsnkSupervisionTabList` — **một** strip phẳng 5 cửa (Hàng đợi BA · Danh sách phiếu · Cổng Vi sinh LIS · Nộp Mẫu số · Thống kê); default `records`; deep-link `?tab=` đã resolve. **Không** có nested hub «Phân tích» + strip phụ (khác CSSD report pre-W3A). Options weighed: (1) invent nest rồi flatten = churn vô nghĩa; (2) audit A «group Phân tích» = *thêm* nest, ngược spirit flatten W3A; (3) **doc-only N/A** ← pick. **No FE change.** Residual «mix write+analytics» (L5/P2) park riêng — không thuộc W3B flatten.

### W4 — Migrates (Nghĩa only)

| Order | Migrate | DoD |
|-------|---------|-----|
| 4a | ME-S* (+ ledger atomic) | UAT mẻ complete/recall/remove |
| 4b | QLCV Wave3 draft | list/Kanban/create màu khớp; grep JOIN sạch |

**A:** apply staging → UAT → prod. **B:** park thêm sprint. **Rec A** khi Nghĩa sẵn sàng Cloud — Soft **không** apply.

### W5 — Perf P2 eager CSSD pages (Soft) · **DONE**

| | |
|--|--|
| **A (rec)** | `dynamic()` tab panels dung-cu / thiet-bi giống quy-trình — **applied** (+ hoa-chat thin) |
| **B** | Chỉ dung-cu (nặng nhất) |
| **DoD** | First paint strip nhanh; tab content skeleton — **met** (local tsc + vitest) |
| **Risk** | Thấp |
| **Migrate?** | Không |
| **Tip** | Soft local commit on `cursor/me-sync-recall-print` — no push |

### W6 — QLCV type-vs-priority · **DONE Soft 2026-09-28**

| | |
|--|--|
| **Lock** | Proposal **A** (khuyến nghị; Lead default 19d khi PO không chọn) |
| **FE prior** | `5a447e1` 19d — priority nổi · ẩn QlcvDmAdminLinks · không chọn Khẩn · LOAI khóa |
| **Wave3** | DROP dm views **DONE** prod (W4 Soft) — FE hardcode `qlcv-labels` |
| **Thin polish Soft** | Filter «Đột xuất» (bỏ «/ khẩn cấp») · toast hạn gọn · lock comment Wave3 DONE · mẫu legacy `KHAN_CAP` ưu tiên → «Cao · legacy» |
| **Migrate?** | Không |
| **Residual Domain** | Taxonomy chủ đề nghiệp vụ (P1 / L-05) — park; không enum mới MVP |

### W7 — Optional deeper (chỉ nếu UAT còn đau)

- Extract `LuanChuyenForm` khỏi `SuCoReportForm` (hết embed cross-module shell).
- NKBV split `GiamSatNkbvPage` thành route-level tabs.
- Delete `/cssd-erp/batch` alias sau ≥1 sprint.
- TRAM persist code-only (lớn — **park**).

### Wave dependency sketch

```
W0 lock ─┬─► W1 hygiene (Soft) ─► W5 perf CSSD
         ├─► W2 dung-cu (lock) 
         ├─► W3 report XOR NKBV (lock)
         ├─► W4 migrates (Nghĩa)
         └─► W6 QLCV priority (DONE Soft — 19d A + thin polish)
```

---

## 7. North-star IA sketch — thin menu (core only)

### Sidebar (giữ gần tip)

- **Báo cáo chính thức**
- **Giám sát** (hub)
- **Công việc**
- **Thi KSNK** *(peripheral — giữ nếu viện dùng)*
- **CSSD · Quy trình**
- **CSSD · Sự cố**
- **CSSD · Dụng cụ**
- **CSSD · Thiết bị**
- **CSSD · Hóa chất**
- **Sửa danh mục** → Quản trị

### Trong module (ideal)

| Module | Strip lý tưởng |
|--------|----------------|
| Quy trình | Chu trình · Mẻ · (quiet) Truy vết |
| Sự cố | 5 cửa: Hỏng/Mất · QT · HC · Máy · Khác |
| Dụng cụ | **Việc:** Đề nghị · Luân chuyển · **Tra cứu:** Bộ · Loại · Lịch sử |
| Thiết bị | Danh sách · Bảo dưỡng · (more) Lịch sử mẻ |
| Hóa chất | Kho (+ CTA Báo sự cố HC) |
| QLCV | Điều hành · Nhiệm vụ · Định kỳ · Báo cáo |
| Giám sát hub | VST · GSC · NKBV · quiet Lịch sử/Thống kê |
| NKBV | **Hiện tại (W3B N/A):** Hàng đợi BA · Phiếu · Vi sinh · Mẫu số · Thống kê (phẳng). *Đề xuất group «Phân tích»* trong sketch cũ = nest — **không** apply dưới W3B |
| Báo cáo CSSD | Phẳng: Vận hành · Sự cố · Sản lượng · Bộ · Máy · NV · Trách nhiệm |
| BCTH | KPI · VST · GSC · (More…) |
| Quản trị | Việc ngày · Phân quyền · IT |

**Không** đưa lại: hub An toàn/Biến động · MOVE trên su-co · BOM đề nghị trên Đóng gói · MDM loai/TT QLCV · scan tay TIET_KHUAN · Command Center «Việc hôm nay» trên `/`.

---

## 8. Widget-ready — hỏi Nghĩa lock tiếp

Trả lời ngắn (A/B) cho Soft:

1. **W1 hygiene** (xóa dead writers + prune catalog dead tabs + InstrumentDoorTabs): **Cho Soft làm ngay?** `A=yes` / `B=đợi`
2. **W2 dung-cu strip:** `A=primary Việc + secondary Tra cứu` / `B=giữ 5 tab + divider` / `C=park`
3. **W3 chọn 1:** `A=flatten CSSD report` / `B=NKBV group Phân tích` / `C=park cả hai`
4. **W4 migrate ưu tiên:** `A=ME-S* trước` / `B=QLCV Wave3 trước` / `C=park`
5. **W6 QLCV priority proposal:** `A=approve proposal A` / `B=proposal B` / `C=park`
6. **Dev `.next` purge** khi máy nặng: `A=cho Soft rm .next local` / `B=Nghĩa tự làm`

---

## 9. Top 15 findings (priority)

| # | Finding | Sev | Owner next |
|---|---------|-----|------------|
| 1 | Su-co 5 direct doors **done** (`a068e6e`) — không reopen | — | — |
| 2 | Dung-cu 5-tab trộn lookup+write | P2 | Nghĩa lock W2 |
| 3 | Report nested analytics | P2 | Nghĩa lock W3 |
| 4 | NKBV 5-tab write+analytics; module 2.2M | P2 | Nghĩa lock W3 |
| 5 | Dead inventory writers (C7) | — | **DONE Soft Soft Soft-local** — hygiene audit |
| 6 | Dead/unused catalog ChiTiet + HoaChat tab views | — | **DONE Soft Soft Soft-local** (L8) — hygiene audit |
| 7 | `InstrumentDoorTabs` dead branch (1 preset) | — | **DONE Soft Soft Soft-local** (L14) — hygiene audit |
| 8 | `entryMode=luan-chuyen` embed su-co shell | — | **DONE Soft Soft Soft-local** teach comment on `SuCoReportForm`; W7 extract **PARK** |
| 9 | QLCV Wave3 migrate unapplied — DUAL DB JOIN dm | P1 | Nghĩa W4 |
| 10 | ME-S* migrates unapplied — UAT mẻ park | P1 | Nghĩa W4 |
| 11 | Eager cssd-dung-cu/thiet-bi pages | — | **DONE W5** Soft |
| 12 | MDM vs ops DE_NGHI dual door (D5 đúng, IA mơ) | P2 | copy W1/W2 |
| 13 | KhoDungCuPage legacy export sau redirect kho | — | **DONE W1** + Soft residual dead `cssd-kho-read` prune |
| 14 | `.next/dev` ~207M + long-lived next-server | P3 ops | Soft/Nghĩa |
| 15 | QLCV type-vs-priority | **DONE** Soft | 19d A + thin polish 2026-09-28 |

---

## 10. Recommended W0–W2 (Soft đề xuất)

| Wave | Chọn | Việc |
|------|------|------|
| **W0** | A | Nghĩa trả lời §8 (đặc biệt Q1–Q3) — **locked** |
| **W1** | **A DONE** Soft | Hygiene: dead writers + dead tabs + InstrumentDoorTabs + CTA HC + comments |
| **W2** | **A DONE** Soft | Dung-cu primary Việc / secondary Tra cứu |
| **W5** | **A DONE** Soft | `dynamic()` dung-cu / thiet-bi / hoa-chat shells |
| **W3** | **A DONE** Soft (report flatten); **B N/A / already OK** Soft (NKBV đã phẳng — audit note only) | — |
| **W4** | **DONE** | ME+Wave3 prod |
| **W6** | **DONE** Soft | 19d A + thin FE polish |

Sau đó: W3 **đóng** → Soft residual P2 **empty** → W4 **DONE** prod → W6 **DONE** Soft (19d A + thin polish). Soft Soft-queue empty.

---

## 11. Non-goals slice này

- Không push / PR / merge / Vercel / CloudAgent.
- Không apply migrate / DROP.
- Không bắt đầu W2+ rewrite strip trước lock.
- Không gộp Hỏng/Mất vào PROCESS.
- Không đưa LUAN_CHUYEN lại picker su-co.
- Không đụng dirty WT ngoài audit doc.

---

## 12. Evidence index

- Nav: `src/lib/nav/sidebar-nav-groups.ts` · `sidebar-admin-nav-groups.ts`
- Su-co doors: `cssd-incident-taxonomy.ts` `DIRECT_INCIDENT_DOORS` · `SuCoReportFormFields.IncidentGroupPicker`
- Stations: `cssd-stations.ts`
- Routes: `src/lib/cssd-routes.ts`
- Offline: `src/lib/offline-sync-scope.ts` · `ClientLayoutWrapper.tsx`
- Dead writers: `cssd-write.actions.ts`
- Report tabs: `CSSDReportPage.tsx` `ANALYTICS_TABS` / `isAnalyticsTab`
- NKBV tabs: `GiamSatNkbvPage.tsx` `MAIN_TABS`
- Migrates: `supabase/migrations/20260925*.sql` · `20260926053300_*.sql`
- Prior audits: `_audit-ia-direct-doors` · `_audit-cascade-crud` · `_audit-qlcv-cssd-me` · `_audit-code-vs-mdm`

---

*End audit — Soft Delivery Lead · local commit only.*
