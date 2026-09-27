# Audit Soft — CSSD **Dụng cụ + ledger** logic deep — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip start `50898ff` |
| Branch | `cursor/me-sync-recall-print` |
| Neo Domain | `domain-decisions-cssd-instrument.md` D1–D10 · `quan-ly-dung-cu-luong.md` · G-P0-06 · cascade C2 |
| Phạm vi | **Ledger movements / stock·set totals / dual paths / FE↔RPC** — NOT IA-only |
| Không | push / PR / Cloud apply / Vercel / apply prod migrate |

---

## 0. Why prior CSSD Soft felt shallow

Prior W2 / cascade C2–C3 / IA doors locked **strip + reload + HISTORY labels**. They did not walk **kho↔bộ / bộ↔bộ cascade** against `fn_cssd_apply_instrument_ledger_tx` + `v_cssd_bo_dung_cu_chi_tiet_realtime`, nor QR→`ma_bo` parity for dest scan, nor orphan BOM writers. **This pass is ledger-first.**

---

## 1. Ledger decision tree (tip runtime)

```
LUAN_CHUYEN (/cssd-dung-cu tab)
  → SuCoReportForm entryMode=luan-chuyen · INSTRUMENT_MOVE
  → InstrumentMoveDualTable
      kho↔bộ  → BO_SUNG (+qty) / TRA_KHO→NHAP_KHO (−qty)
      bộ↔bộ   → DIEU_CHUYEN (−src / +dest)
  → createIncidentReport → commitInstrumentReportRpc
  → rpc_cssd_commit_instrument_report
      → fn_cssd_apply_instrument_lines_tx (idempotent su_co_id)
          → fn_cssd_apply_instrument_ledger_tx
              BO_SUNG:  kho_du_phong −= n · tx +n trên bộ
              NHAP_KHO: kho_du_phong += n · tx −n trên bộ
              DIEU_CHUYEN: assert thuc_te src · tx −n src · tx +n dest (resolve ma_bo)
              BAO_HONG/MAT: assert · tx −n · optional chi_tiet ghi_chu
          → optional touch ngay_kiem_ke_gan_nhat

Hỏng/Mất (/cssd-su-co INSTRUMENT_PHYSICAL → SET_RECONCILE)
  → cùng commit RPC · chỉ HONG/MAT (D3 reject MOVE kinds)
  → touchNgayKiemKe=true

Đề nghị danh mục (DE_NGHI)
  → cssd_catalog_de_nghi · approve MDM — **không** ghi sổ tồn
  → UPDATE loại **không** gửi so_luong_kho_du_phong (ledger-only)

KIEM_KE
  → **không tab** · touchNgayKiemKe trên RPC · Excel campaign trên tab Bộ
  → MDM form có thể ghi tay ngay_kiem_ke (park hygiene)

Đóng gói / mẻ
  → CompositionReconcilePanel scan/gate soft-warning (D8) · heat binary is_chiu_nhiet
  → **không** gọi ledger MOVE; thiếu cấu phần → đề nghị / Hỏng-Mất deep-link
```

**Tồn thực tế SSOT:** `v_cssd_bo_dung_cu_chi_tiet_realtime.so_luong_thuc_te` = `chi_tiet.so_luong + Σ(tx)`. RPC assert dùng `fn_cssd_set_thuc_te` (cùng công thức).

---

## 2. Tip vs locks — mismatch table

| # | Lock | Tip actual | Path | Severity | Disposition |
|---|------|------------|------|----------|-------------|
| 1 | G-P0-06 MOVE only on `/cssd-dung-cu` LUAN_CHUYEN | OK — su-co picker chỉ PHYSICAL; form `entryMode=luan-chuyen` embed | `page.tsx` · `SuCoReportForm` · taxonomy | OK Soft | Keep |
| 2 | D3 MOVE kinds only cửa Chuyển | OK — `rejectMoveOnlyKindsOnReconcile` + `validateInstrumentDoorLines` | `cssd-set-reconcile.ts:114–117,670–688` | OK Soft | Keep |
| 3 | kho↔bộ cascade stock | OK — BO_SUNG/NHAP_KHO cập nhật `so_luong_kho_du_phong` ± n **trong cùng TX** với dòng sổ | `20260925150000…:350–372` | OK Soft | Keep |
| 4 | bộ↔bộ cascade set totals | **Partial** — dest tx ghi OK **nếu** dest có dòng `chi_tiet` cùng loại; view FROM chi_tiet → **orphan tx invisible** khi BO_SUNG/DIEU_CHUYEN loại mới (FE `buildKhoBoMoveLines` cho phép) | view `:125–129` · `buildKhoBoMoveLines:620–630` · ledger `:430–438` | **P0 Cloud** | Park Cloud DoD — ensure/create chi_tiet hoặc reject |
| 5 | QR dest/source → composition by `ma_bo` | **Was** dest scan raw uppercase (no hub); cycle QR → `loadBoCompositionByMaBo` fail; source INSTRUMENT không map `maBo` | `SuCoReportForm` pre · hub no `maBo` | **P0 Soft** | **FIXED** hub `maBo` + form prefer + dest hub scan |
| 6 | Dual path BOM-only transfer (no ledger) | `dieuChuyenThanhPhanGiuaHaiQrAction` 0 callers — metadata.bom_lines only | `cssd-asset.actions.ts` | **P1 Soft** | **FIXED** close → `instrumentChangeRequiresIncidentResult` |
| 7 | Orphan / deprecated writers | `insertInstrumentIssueLedgerCore` direct insert; `replenishSetInstrumentCore` only specs; `applySetReconcileEngravedCodes` / `applySubmittedSetReconcile` 0 prod callers (RPC engraved+commit SSOT) | master-data · set-reconcile-ledger | **P2 Soft** | Park hygiene — không đụng engine |
| 8 | DE_NGHI vs ledger | OK — approve không đè kho; CREATE loại ghi kho ban đầu | `cssd-catalog-de-nghi-apply` · `cssd-loai-dung-cu-map` | OK Soft | Keep |
| 9 | KIEM_KE tab | Không tab (cascade C note) — touch RPC + Excel | `SetReconcileCampaignPanel` | OK Soft | Keep |
| 10 | Heat binary / đóng gói | OK separate — `is_chiu_nhiet` packaging gate; không ledger | `cssd-packaging-rules.ts` · CompositionReconcilePanel | OK Soft | Keep |
| 11 | FE vs RPC TRA_KHO | OK — kind TRA_KHO → type INSTRUMENT_RETURN_KHO → ledger NHAP_KHO | `physicalTypeIdForKind` · `mapInstrumentPresetToLedgerType` | OK Soft | Keep |
| 12 | DIEU_CHUYEN thiếu `bo_dung_cu_id_den` trên line | FE chỉ `ma_qr_den`; RPC resolve `ma_bo` — OK sau Soft maBo; vẫn thiếu id den explicit | `set-reconcile-ledger.application.ts:71` · RPC `:387–396` | **P2 Soft/Cloud** | Park — pass `bo_dung_cu_id_den` khi Cloud ensure |

---

## 3. Dual paths / FE vs RPC

| Path | Role | Drift risk |
|------|------|------------|
| `rpc_cssd_commit_instrument_report` | SSOT phiếu+sổ atomic (MOVE + Hỏng/Mất set) | Keep |
| `rpc_cssd_apply_instrument_lines` | Batch / idempotent / engraved | Keep |
| `rpc_cssd_apply_instrument_ledger` | Single-line; used by `replenishSetInstrumentCore` (facade closed) | Legacy OK |
| `insertInstrumentIssueLedgerCore` | Direct `cssd_fact_kho_giao_dich` insert | Deprecated — park delete |
| `dieuChuyenThanhPhanGiuaHaiQrAction` | BOM metadata only | **Closed Soft** |
| `applySetReconcilePhysicalLines` | Test/helper; prod = commit RPC | Park |
| Catalog DE_NGHI approve | Master write, no ledger | OK by D1/D5 |

Silent defaults: qty floor ≥1; empty note → null; DIEU_CHUYEN dest resolve fail → RPC exception (hard).

---

## 4. Soft fixes applied (this pass)

| ID | Change | Files |
|----|--------|-------|
| P0 | QR hub trả `maBo` khi có `boDungCuId` | `cssd-qr-hub.contracts.ts` · `cssd-qr-hub.ts` · `cssd-qr.actions.ts` · spec |
| P0 | INSTRUMENT scan prefer `maBo`; dest MOVE scan qua hub (reject MACHINE/BATCH) | `SuCoReportForm.tsx` |
| P1 | Đóng facade BOM-only transfer | `cssd-asset.actions.ts` |

---

## 5. Domain asks (do NOT Soft fan-out)

1. **BO_SUNG / DIEU_CHUYEN loại chưa có trên bộ đích:** giữ cho phép (hiện FE) rồi **Cloud ensure chi_tiet**, hay bắt buộc THEM_DONG / DE_NGHI trước?
2. **Chuẩn (`so_luong`) khi auto-create chi_tiet:** =0 (chỉ thuc_te từ tx) hay = qty chuyển?
3. **MDM ghi tay `ngay_kiem_ke_gan_nhat`:** giữ admin escape hay chỉ RPC touch?

---

## 6. Cloud next?

| | |
|--|--|
| Soft local | **Done** P0 QR maBo + dest hub · P1 close BOM facade |
| Cloud **needed** | **Yes** — engine ensure chi_tiet (or reject) on BO_SUNG/DIEU_CHUYEN dest thiếu dòng · optional `bo_dung_cu_id_den` on lines |
| Whitelist | `/tmp/cloud-cssd-dung-cu-dod.md` |
| Prefer Soft-first | FE unblocks cycle-QR → composition; Cloud needed for orphan stock totals |

---

## 7. Cloud DoD + whitelist

See `/tmp/cloud-cssd-dung-cu-dod.md` (Nghĩa authorized Cloud when needed). Soft **does not** apply prod.

---

## 8. UAT checklist (Nghĩa)

- [ ] `/cssd-dung-cu` tab Luân chuyển: quét **tem bộ** nguồn + đích → tải thành phần; ghi BO_SUNG → kho dự phòng giảm + thuc_te bộ tăng; HISTORY NHAP_KHO/BO_SUNG
- [ ] Quét **cycle QR** nguồn/đích → resolve về `ma_bo` (không lỗi «Không tìm thấy bộ»)
- [ ] bộ↔bộ DIEU_CHUYEN loại **đã có** hai bên → src giảm / dest tăng trên tab Bộ + LOAI `so_luong_trong_bo`
- [ ] bộ↔bộ loại **chưa có** trên đích → ghi sổ được nhưng UI có thể thiếu dòng (**known P0 Cloud** — báo Domain §5)
- [ ] Hỏng/Mất `/cssd-su-co` → tồn giảm; không thấy MOVE trên picker
- [ ] DE_NGHI tạo/sửa → duyệt admin **không** đổi kho; kho chỉ đổi qua Luân chuyển
- [ ] Đóng gói: CompositionReconcile soft-warning thiếu cấu phần; heat binary; **không** ghi ledger từ panel
- [ ] Tab Bộ/Loại sau Luân chuyển reload số (C2); HISTORY nhãn DIEU_CHUYEN/TRA_KHO (C3)

---

## 9. Soft Soft-queue

**CSSD dung-cu ledger Soft:** P0 QR/`maBo` + dest hub **DONE**; P1 close BOM facade **DONE**; orphan stock view **park Cloud**; Domain park §5.

*Dirty WT pre-existing (`AGENTS.md`, scripts, qlcv proposal) — để yên.*
