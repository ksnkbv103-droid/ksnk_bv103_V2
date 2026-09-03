# Implementation roadmap NKBV — SSOT v2.0 (W0–W2)

> Neo: [`hai-surveillance-domain-ssot-20260804.md`](hai-surveillance-domain-ssot-20260804.md)  
> ADR: [`adr-nkbv-domain-ssot-alignment-20260804.md`](../../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md)  
> Gap W2: [`gap-catalog-harden-w2-20260804.md`](gap-catalog-harden-w2-20260804.md)  
> **Phạm vi khóa:** W0–W2. W3 backlog. **W4–W6 tạm dừng** — trừ lát 1 NK-W46 (2026-08-26): mã CDC Location trên khoa; SIR vẫn thô.

## Ma trận SSOT → runtime

| SSOT | Runtime hiện có | Gap | Sóng |
|------|-----------------|-----|------|
| §0 Meta / từ điển thời gian | Comment rải file | Documented in ADR | W0 |
| §1 Schema / Device Registry | Form `device_placed_date` trên ca | Không entity Registry | **W1** |
| §1.7 Patient/Device days | `nkbv_fact_mau_so_daily` nhập tay | Không sinh từ Registry | **W1** (song song) |
| §2 State machine | App domain-spec + write actions | OK pilot | — |
| §3 Timeline IWP/DOE/RIT | `nkbv-timeline-math.ts` | VAE/SSI còn dùng IWP±3 chung; thiếu ma trận non-apply | **W1** |
| §4 Secondary BSI | Flags trên form + nhánh BSI/SSI/UTI | Chưa package canonical (match/ban) | **W1** |
| §5 Metrics / forms | Forms + dashboard KPI | — | — |
| §6 CLABSI | `evaluateBsiClabsi` + `BsiClinicalSubForm` | Xem gap catalog P0 | **W2** |
| §7 CAUTI | `evaluateUtiCauti` + UTI form | Gap catalog | **W2** |
| §8 VAE | `evaluateVaeVap` + vent compute | Gap catalog | **W2** |
| §9 PedVAE | — | Deferred W5 | Dừng |
| §10 PNEU | pathway PNEU | Gap catalog | **W2** |
| §11 SSI | `evaluateSsi` | Gap catalog | **W2** |
| §12–13 IAB/ENDO | — | Deferred W5 | Dừng |
| §14 LabID | — | W3 backlog | — |
| §15 CLIP | — | W3 backlog | — |
| §16–18 AU/Loc/Dash | mau_so + RPC thô | Deferred W4/W6 | Dừng |

## DoD theo sóng

### W0

- [x] ADR + roadmap + gap catalog + README
- [x] W4–W6 ghi **tạm dừng** (không “làm ngay”)

### W1

- [x] Lib: `nkbv-shared-timeline`, `nkbv-shared-secondary-bsi`, `nkbv-shared-device-days` + tests
- [x] Migration `nkbv_fact_device_registry` + RLS
- [x] UI đăng ký dụng cụ trên stay / bệnh án
- [x] Wire `evaluate*` + timeline shared helpers
- [x] Preview mau_so từ Registry (giữ nhập tay)
- [x] `verify:engineering` pass (2026-08-04)

### W2

- [x] Đóng **P0** gap catalog (P1 còn lại ghi nhận)
- [x] Tests + UAT checklist delta
- [x] Cập nhật coverage-audit cột SSOT v2 W2

## Chiến lược mẫu số

1. **Giữ** tab «Nộp mẫu số» nhập tay (không breaking pilot SIR thô).
2. **Thêm** `previewMauSoFromDeviceRegistry(khoa, from, to)` — so sánh với số đã nộp.
3. Chỉ khi PO tin số Registry mới xem xét deprecate nhập tay (ngoài W0–W2).

## Rủi ro

| Rủi ro | Giảm thiểu |
|--------|------------|
| Refactor Shared đổi classification | Spec tests trước; không đổi string classification public ngoài P0 |
| Registry trống → mau_so preview = 0 | UI cảnh báo “chưa đăng ký dụng cụ” |
| Migration RLS lệch quyền | Copy pattern `GIAM_SAT_NKBV` từ bảng `nkbv_fact_*` hiện có |

## Engine contract (W1)

| Helper | Input → Output |
|--------|----------------|
| Timeline | index/DOE/admission/type → IWP? SBAP window, POA/HAI, RIT end; VAE/SSI flags non-IWP |
| Secondary BSI | primary site + blood isolate + SBAP → secondary yes/no + reason |
| Device days | registry row + calendar range → count; CL dùng first-access |
