# BV103 CSSD — Deep domain audit vs PCI / QT BM / HĐ 31/07

> Draft 2026-09-04 · Nguồn: domain-specification §2.2, reform-plan, `/workspace/ipc-iso/source/QT-{18,21,24,38}`, HĐKSNK 31/07, trạng thái local WIP (trước khi Mac offline).  
> **Code evidence cột «Code» cần re-verify khi Mac reconnect** — một số dòng dựa trên audit/UX pass trước đó trên `Desktop/ksnk_bv103` @ `wip/mac-20260903`.

## Chú giải trạng thái
- **OK** — đã có trong code/docs và khớp SOP
- **PARTIAL** — có khung nhưng thiếu enforce / UI / dữ liệu
- **GAP** — chưa có hoặc lệch rõ

---

## A. Lộ trình 6 trạm + mẻ (PCI.03 / QT.18–23)

| # | Yêu cầu | Code / docs evidence (ước lượng) | Status | Fix now? |
|---|---|---|---|---|
| A1 | 6 trạm: TN→LS→QC→ĐG→Mẻ→CP | `domain-specification.md` §2.2; shell quy trình | OK | — |
| A2 | QT.18 POU lau máu / làm ẩm tại nguồn | BM.02 mục 1; UI tiếp nhận chưa bắt buộc tick POU | PARTIAL | P1 capture POU trên phiếu giao nhận |
| A3 | QT.18 Spaulding + chịu nhiệt khi tiếp nhận | Cột Spaulding trên `cssd_dm_loai`; thiếu rule engine đóng gói (reform B2) | PARTIAL | P1 `cssd-packaging-rules` |
| A4 | QT.18 Enzyme 30–45°C, ngâm, lòng ống | Chưa thấy bắt buộc lot enzyme / nhiệt độ trên trạm LS | GAP | P1 lot hóa chất gắn mẻ LS |
| A5 | QT.19 QC trạm ≠ QC mẻ | Spec tách rõ; UI QC trạm vs panel QC mẻ | OK/PARTIAL | Verify UI labels |
| A6 | QT.20 Đóng gói + đếm cấu phần; thiếu = cảnh báo không chặn | Soft-warning Q2; panel biến động bộ | OK | — |
| A7 | QT.20 Nhãn / Cycle QR có số mẻ | Dual-coding + Cycle QR trong spec | PARTIAL | Verify print template |
| A8 | QT.21 BD mẻ đầu ngày steam | Spec: steam ⇒ BD đạt mới nạp; cần verify enforce code | PARTIAL | **P0** harden gate |
| A9 | QT.21 BI/CI vị trí khó; Tyvek Plasma; EO aeration | QC mẻ 3 cấp; Plasma/EO rules | PARTIAL | P1 checklist gates |
| A10 | QT.21/22 Gói ướt = BẨN; không cấp phát | Spec recall/ướt; **thiếu field wet trên release?** | PARTIAL/GAP | **P0** helper + block CAP_PHAT |
| A11 | QT.22 Cấm gói hết hạn / rách / hỏng | PCI.03.02 HĐ; FEFO kho sạch | PARTIAL | **P0** expiry check cấp phát |
| A12 | QT.23 QC mẻ không đạt → rollback + HOLD_QC | Spec; implant CHO_BI | PARTIAL | Verify paths |
| A13 | Tab Kho FEFO ≠ trạm quét | Spec | OK | — |

## B. Sự cố / thu hồi (QT.24) + 3 cửa dụng cụ

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| B1 | Thu hồi theo mẻ (BI+/máy/gói ướt) + khoa đang giữ | Spec recall `lo_tiet_khuan_id`; BM.01 | PARTIAL | **P0** entry thu hồi rõ |
| B2 | 3× BI(−) trước chạy lại máy | Spec chưa auto mở máy sau 3× BI(−) | GAP | P1 |
| B3 | 3 cửa: đổi DM→ADMIN; Chuyển; Hỏng/Mất ngay | WIP local rejectMoveOnly + master-write | OK/PARTIAL | Verify RO gates (đã ẩn phiếu RO) |
| B4 | BOM 1 bộ×1 loại=1 dòng | WIP merge + draft unique migration | PARTIAL | Apply migration khi được phép |
| B5 | Cấm 1 bộ vô khuẩn dùng chung nhiều NB | HĐ; chưa thấy hard rule multi-patient | GAP | P1 domain + UI |
| B6 | SUD cấm tái xử lý mặc định | HĐ; HLD/SUD out of scope spec | GAP (documented) | Không mở QT.25/SUD trừ lệnh |

## C. Hóa chất QT.38

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| C1 | FEFO toàn chuỗi + thẻ kho XNT + cận date (BM.02) | Kho hóa chất module | PARTIAL | **P0** verify sort/cảnh báo cận date |
| C2 | Nhật ký T°C / RH kho (BM.01) | ? | GAP | P1 |
| C3 | MEC strip trước mỗi mẻ HLD (BM.03) | HLD out of scope | GAP (OK skip) | — |
| C4 | Clo pha ≤24h; tách Cồn khỏi Clo/H2O2 | ? | GAP | P1 storage rules |

## D. Bảng kiểm CSSD (Drive danh mục BM.18–22)

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| D1 | Seed BM.18.02 / 20.02 / 20.03 / 21.04 / 22.04 trong `gstt_dm_bang_kiem` | Cần grep seed khi Mac online | ? | P1 đối chiếu seed |
| D2 | BangKiem UI Dialog (list+detail) | WIP local | OK | — |

## E. UX / IA (đã làm đợt trước — không regress)

| # | Mục | Status |
|---|---|---|
| E1 | Dialog Bộ/Loại/BangKiem/composition | OK |
| E2 | RO ẩn Rà soát/phiếu; «Thêm» click-outside | OK |
| E3 | suppressShell CTA Kho + Báo sự cố | OK |
| E4 | KPI walls gọn | OK partial |
| E5 | QLCV drawer 100dvh | backlog |

## F. Hàng đợi P0 khi Mac reconnect

1. Harden **BD đầu ngày** steam trước nạp mẻ  
2. **Gói ướt / hết hạn / hỏng** chặn hoặc hard-warn `CAP_PHAT` + helper domain  
3. **FEFO / cận date** hóa chất (QT.38 BM.02)  
4. Entry **thu hồi theo mẻ** (QT.24 BM.01) rõ trên UI  
5. Thay UI «nhiễm trùng» → «nhiễm khuẩn» (CSSD/KSNK)  
6. Copy audit file vào `docs/modules/cssd/_agent-deep-audit-20260904.md` và re-verify cột Code bằng grep thực tế  

## G. P1 backlog (đợt sau)

- POU bắt buộc trên giao nhận; lot enzyme gắn LS  
- Spaulding packaging rules (reform B2)  
- 3× BI(−) machine resume  
- Multi-patient sterilized set ban  
- Bảng kiểm seed vs Drive catalog  
- QT.38 BM.01 môi trường kho  

---
*Mac offline lúc soạn draft — không sửa code trong file này.*

---

## P0 applied (same day)

| Item | Result |
|------|--------|
| Pack issuance CAP_PHAT | `src/lib/domain/cssd-pack-issuance.ts` wired in `cssd-workflow-application.ts` + `cssd-scan.actions.ts` (issuanceOnly) — blocks expired / wet·torn·damaged / HONG·MAT / red-alert |
| Steam BD đầu ngày | `src/lib/domain/cssd-steam-daily-bd.ts` on create + chốt nạp — `specs.bd_dau_ngay_ket_qua=KHONG_DAT` blocks; missing → warning only (`requireRecorded` reserved P1) |
| Plasma cellulose | `assertPlasmaPackMaterialAllowed` in `cssd-packaging-rules.ts` |
| RO / reconcile / FEFO / BOM unique | Verified already OK — no code change |
| Docs | Short bullets in domain-specification §2.2, domain-overview #13, quan-ly-dung-cu-luong changelog |
| Tests | vitest pack-issuance + steam-bd + packaging-rules + fefo + set-reconcile: pass; `tsc --noEmit`: 0 errors |
| Not done | No commit/push; no migration; no HLD; BD record UI; POU/multi-patient/IUSS/SUD |
