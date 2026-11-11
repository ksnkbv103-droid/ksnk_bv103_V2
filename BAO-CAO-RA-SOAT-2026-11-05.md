# Báo cáo rà soát tổng hợp KSNK BV103 — 2026-11-05

Nhánh `chore/code-vs-ai-phase1`, 242 file đổi chưa commit. Chỉ rà soát, **chưa sửa file nào**. 15 agent đọc chỉ-đọc (đợt 1: 8, đợt 2: 7), cộng `tsc` và `lint` chạy thật.

## 1. Kết luận

- Không thấy lỗi phá vỡ khóa PO (VST ≤2 mốc, bỏ sót = 1, xóa mềm, màu ô chọn; Đào tạo nộp trễ không đạt; công thức NKBV RIT/IWP/SBAP đúng SSOT).
- Có **nhóm lỗ hổng quyền** ở server action/RPC mới: hành động dùng admin client hoặc RPC SECURITY DEFINER mà không kiểm quyền/khoa. Đây là việc phải làm trước khi đưa module mới vào pilot.
- Build chưa sạch: **1 lỗi tsc, 2 lỗi lint** (nguyên văn ở mục 3).
- Độ phủ: mỗi agent bị giới hạn ≤8 file nên chỉ đọc một phần mỗi module. Mục «Chưa phủ» ở §6. Phần lớn finding là «đọc code», chỉ 2 mục được tái hiện bằng lệnh (đánh dấu **[đã tái hiện]**) và 1 mục tôi tự đọc lại (đánh dấu **[tự xác minh]**).
- Agent không chạy được `git diff` nên «mới do thay đổi này» và «Pre-existing» chưa phân biệt được ở đa số mục.

## 2. Số lượng theo mức

| Mức | Số |
|---|---|
| Nghiêm trọng/Cao (quyền, dữ liệu) | 17 |
| Trung bình | ~20 |
| Thấp / UX / a11y / doc | ~30 |

## 3. Dữ liệu thật từ lệnh

`npx tsc --noEmit` (exit 2):
```
src/modules/dashboard/views/bao-cao-tong-hop-page.tsx(309,28): error TS2322: Type '"bc-waste-linen"' is not assignable to type 'ReportSectionId'.
```
`npm run lint` (exit 1): `✖ 61 problems (2 errors, 59 warnings)`
```
src/modules/giam-sat-nkbv/lib/nkbv-clinical-rationale.ts
  215:7  error  'step4Verdict' is never reassigned. Use 'const' instead  prefer-const
  216:7  error  'step4Summary' is never reassigned. Use 'const' instead  prefer-const
```
Warning đáng chú ý: nhãn «&» thay «và» ở `RBACMatrixView.tsx:237`, `StaffAuthTableSection.tsx:60`.

## 4. Finding theo mức (Cao trước)

### P0 — Quyền / toàn vẹn dữ liệu

| # | Vị trí | Vấn đề | Cách sửa tối thiểu |
|---|---|---|---|
| 1 | `src/modules/chat-thai-do-vai/actions/chat-thai-do-vai.actions.ts:320-362` (`getThongKeKyAction`) **[tự xác minh]**; thêm 5 read action dòng 37,108,204,242,303 | `"use server"`, admin client, **không `verifyPermission`**, không zod. Ai gọi được endpoint đều đọc thống kê. `saveSoCanNgay` (62-93) chỉ kiểm «create» nhưng upsert = sửa | Thêm `verifyPermission(HAU_CAN_MOI_TRUONG,…)` + zod cho mọi action; đăng ký quyền vào `permission-registry.ts` (đang thiếu) |
| 2 | `supabase/migrations/20261104180000_cssd_apply_bom_plan_tx.sql:98` | `fn_cssd_apply_bom_plan_tx` DEFINER + `GRANT … TO authenticated`, không kiểm quyền. **[đã tái hiện]** BEGIN…ROLLBACK local: role `authenticated` gọi RPC → `{"success": true, "applied_count": 1}`, trong khi UPDATE trực tiếp `UPDATE 0`. Dòng 37-56 không kiểm FOUND; `EXCEPTION WHEN OTHERS` mất SQLSTATE | Migration mới: `REVOKE` authenticated, chỉ `GRANT service_role` (caller duy nhất dùng admin client `cssd-catalog-de-nghi-apply.ts:470`) |
| 3 | `20261105110000_ctyt_dovai_lean_ledger_and_stats.sql:188-334` | `rpc_ctyt_dovai_thong_ke_ky` DEFINER, GRANT authenticated, không `fn_sys_has_permission`. Không nơi nào trong `src` gọi; TS `computeThongKeKyHauCan` tính lại KPI (hai nguồn công thức) | Thêm kiểm quyền hoặc revoke; chọn một nguồn công thức |
| 4 | `cssd-scan.actions.ts:90-168` (nhánh issuanceOnly/CAP_PHAT) | UPDATE `cssd_fact_quy_trinh` bằng admin client, **bỏ qua** `rpc_scan_workflow_station`, `assertMergeGateForCapPhat`, `ket_qua_test`, `validateStationAdvance`; `assertLedgerDuChoCapPhat` chạy **sau** khi ghi; thiếu `.is("thoi_gian_cap_phat", null)` (race) | Đi qua RPC trạm hoặc đưa các gate lên trước khi ghi |
| 5 | `cssd-lifecycle.actions.ts:12-28` | `verifyCanManageLifecycle` fallback sang `CSSD_KHO_DUNGCU:view` → người chỉ xem ghi được sổ. Nhánh KHO_LE (212-243) 3 bước không nguyên tử | Chỉ cho quyền ghi; gói RPC như nhánh BO_DUNG_CU |
| 6 | `giam-sat-nkbv-import.actions.ts:278-280` `importBenhAnExcel` | Không `getNkbvKhoaRestriction`, admin client. `:89` `importViSinhExcel` chỉ kiểm khoa khi có `khoa_yeu_cau_id`; `:43-47` preview chỉ cần view, không lọc khoa | Gọi guard khoa như các action NKBV khác |
| 7 | `giam-sat-nkbv-ba-analysis.actions.ts:449,498,551` | `markNkbvViSinhKhongDuTc`, `clearNkbvViSinhAnalysisDisposition`, `skipNkbvViSinhAnalysis`: admin client, không `isNkbvBenhAnInScope`, không uuid/zod | Thêm scope + zod |
| 8 | `giam-sat-nkbv-ba-ngay.actions.ts:45-48,57-77` | `khoa_id` từ client không kiểm tồn tại/phạm vi. `:57-66,79-84` xóa ô khoa không reset `khoa_dieu_tri_id` → BA vẫn hiện | Validate khoa theo phạm vi; reset cột khi xóa |
| 9 | VST/GSC: `saveVSTSession`, `rpc_vst_save_session` (`20261005180000_…sql`), `giam-sat-chung-write.actions.ts:366` | **Không có idempotency key.** Mất mạng sau khi server đã lưu → flush hàng đợi offline (`offline-pending-supervision-save.ts:95`) tạo phiên trùng. Làm lệch KPI đang dùng thật | Migration thêm `client_request_id` unique + RPC upsert. **Cần PO duyệt** (migration) |
| 10 | `src/lib/admin-audit.ts:48-84` | `logAdminAction` fail-open: thiếu actorId thì return im lặng, lỗi insert chỉ `console.warn`; audit ghi sau DB write; throttle BREAK_GLASS bằng Map RAM. `rbac.actions.ts:254` chỉ log `roleIds`, không before/diff | Fail-closed cho hành động quyền/RBAC; log diff |
| 11 | `smart-import.actions.ts:541-548`, `:125,501-519` | Không `revalidateMasterDataRowCacheTag` sau import → dropdown cũ tới 15 phút; `softDeleteMissing` (tắt hàng loạt) chỉ cần quyền «import» | Revalidate; tách quyền cho softDeleteMissing |
| 12 | `dinh-ky.actions.ts:164,176-180,192-208` (QLCV) | `upsertDinhKyMau`(update)/`setDinhKyMauActive`/`deleteDinhKyMau` chỉ `ensureQlcvKsnkAccess("edit")`, thao tác theo `id`, không scope khoa. Phụ thuộc RLS (chưa kiểm) | `assertQlcvRowInListScope` hoặc xác nhận RLS bảng `qlcv_fact_cong_viec_dinh_ky` |
| 13 | `20261104120000_qlcv_board_counts_…sql:99-120` | `my_tasks`/`watching` đếm trên `base` thay `active` → tính cả hàng xóa mềm (lane NULL) và TỪ_CHỐI; thẻ «theo dõi» hiện 1 nhưng danh sách rỗng | Migration **mới** thêm `AND b.lane IS NOT NULL` |
| 14 | `recall-followup-nkbv.application.ts:29-40,80-86` | Dựng `.or()` PostgREST từ chuỗi tự do (`ma_ca.ilike.%…%`): vỡ khi có `, ( )`, khớp quá rộng, không giới hạn thời gian; ghi đè `lo_tiet_khuan_id`; race đọc-sửa-ghi `clinical_notes`; nuốt `updErr` | Dùng `.eq`/`.in`, bắt lỗi, ghi nguyên tử |
| 15 | `nkbv-clinical-rationale.ts:177-218` | POA/HAI suy từ `cdcMetrics?.haiStatus`; null thì hiện «POA, ngày #1», có thể in «#undefined»; tóm tắt mâu thuẫn bước 4; nhãn «Ngày lấy mẫu (Index Date)» dùng `ngay_phat_hien` (`:78,86`); `:121` «IWP mở rộng viêm nội tâm mạc ±10 ngày» chưa thấy nguồn SSOT. **Đây là nội dung lâm sàng hiển thị** | Đối chiếu SSOT trước khi sửa (cần PO) |
| 16 | `cssd-catalog-de-nghi-apply.ts:477-482` | Fallback chỉ bắt `42883`/«does not exist», không bắt `PGRST202` → thiếu RPC thì phiếu kẹt `APPLY_FAILED`; fallback mất nguyên tử | Bắt thêm PGRST202; bỏ fallback |
| 17 | `bao-cao-tong-hop.actions.ts:249-265` | Phụ lục chất thải/đồ vải không có cổng quyền riêng, không theo `lockNetwork`. `:218` `fetchCssdAnalyticsBundle({station:"ALL"})` không truyền khoa — **chưa xác minh** có lộ toàn viện cho user mạng lưới | Đọc `fetchCssdAnalyticsBundle`, thêm gate |

Ghi chú xác minh: nghi vấn «NKBV nhận `f.khoa_ids` thay `effectiveKhoaIds`» (`bao-cao-tong-hop.actions.ts:204`) — agent analytics kết luận **không lộ** vì `giam-sat-nkbv-dashboard.actions.ts:74-80` tự ép khoa; vẫn nên truyền `effectiveKhoaIds` (defense in depth, Thấp).

### P1 — Trung bình

- `offline-pending-supervision-save.ts:126,171`: flush ghi đè hàng đợi, có thể mất mục vừa xếp hàng; `:13,50` `slice(-20)` bỏ mục cũ im lặng, `localStorage.setItem` không try/catch.
- `giam-sat-chung-write.actions.ts:176-178`: `thoi_gian_ghi_nhan = new Date()` lúc flush, không phải lúc quan sát.
- `vst-constants.ts:121-124` `clampMomentsForAction` giữ mốc **đầu**, còn `VSTForm.tsx:238` dùng `clampMomentsKeepNewest` (giữ mới nhất) — hai luật cắt khác nhau cho cùng khóa PO.
- `vst-write-delete.actions.ts:97-106` UPDATE thiếu `.eq("is_active", true)`; `:78` mã chết. `vst-write-save-session.actions.ts:208-212` đọc `gstt_fact_vst` cũ không lọc `is_active`; `:90-106` `firstObs` có thể undefined.
- `su-co-report.actions.ts:93` `.parse()` ném ZodError thô; `:419-428` `getIncidentForPrint(id)` chỉ giới hạn bằng quyền in, không uuid/scope (cần PO); `:453` `(incident as any)`.
- `cssd-scan.actions.ts`: `khoa_nhan_id`, `rpc_cssd_assign_cycle_qr` chạy sau RPC ngoài transaction; `maQR`/`extraPayload` không zod. `cssd-register-label.actions.ts:76-92` không kiểm uuid `boDungCuId`, 3 truy vấn quyền tuần tự.
- `giam-sat-nkbv-dashboard.actions.ts:167,183` vs `:118`: badge «chờ XN» lọc `khoa_ghi_nhan_id` còn dashboard lọc LOA; `:87` `parseISO` không validate, `filters` không zod.
- `nkbv-timeline-math.ts:375,402`: `poaOrHai` trả `doeForRit` nhưng `calculateCdcMetrics` bỏ qua → RIT và HD lệch khi DOE trước ngày nhập viện. **PO chốt (2026-11-05): DOE trước ngày nhập viện thì quy về ngày nhập viện, áp dụng cho cả RIT và HD.**
- `nkbv-chrono-precedence.ts:35-44`: slice trên `ngay` null ném lỗi; luật «không nhảy cóc» chỉ ở client (`Workspace.tsx:820-833`), server không kiểm lại.
- `vi-sinh-store`: `isViSinhInUse` bỏ sót XN dùng làm bằng chứng RIT; `:217-220` thiếu guard Invalid Date, lệch múi giờ.
- `catalog-de-nghi-approve.actions.ts:75-212`: không `logAdminAction` khi duyệt/từ chối; phiếu có thể kẹt APPLYING; `id`/`reason` không zod.
- `rbac.actions.ts:204-248`: fallback khi thiếu RPC không nguyên tử, regex `/404|rpc_save_rbac_matrix/` quá rộng; `:195-198` bỏ qua lỗi `allPerms`. Chưa thấy leo thang quyền; user nhiều vai trò có thể có kẽ hở (chưa kiểm).
- QLCV: `setDinhKyMauActive(id,true)` bỏ luật «bật phải có phụ trách» (`dinh-ky.actions.ts:174-181`; RPC `CONTINUE` im lặng); `xacNhanHoanThanh`/`tuChoiHoanThanhCongViec` (`cong-viec.actions.ts:417-480,524-566`) đọc-kiểm-gọi RPC không khóa, `pct` cũ có thể ghi đè; `updateCongViec` kiểm «đã đóng» trên bản đọc cũ (224-410 chưa đọc); `dexuat.actions.ts:54` dùng `create` — **PO chốt đúng** (nhân sự KSNK quyền create), bỏ khỏi lỗi; `:101-105,165-169` duyệt theo id bằng admin client không `resolveQlcvListScope`; `:195-216` `extraFields` ghi trước transition, không rollback.
- `SearchableSelect.tsx:221-222,259-260` + `SearchableMultiSelect.tsx:112-113,149-150`: Esc đóng cả dropdown lẫn Dialog (Select dùng `document`, Multi dùng `window`).
- `HAU_CAN_MOI_TRUONG` chưa đăng ký ở `permission-registry.ts:29-33`; `docs/` không nhắc chat-thai-do-vai / `ctyt_dovai_*`.
- `chat-thai-do-vai.actions.ts:350-356`: trộn ngày UTC và local.

### P2 — Thấp / UX / a11y / doc

- Analytics: biểu đồ `supervision-charts-*.tsx` không `role="img"`/`aria-label` (Trung bình a11y); `return null` khi rỗng (`:294,379,412`); `toLocaleString()` không locale (`core:343,346`, `shared:117`) → nguy cơ hydration mismatch; tuần gán trọn vào tháng theo `min_date` (`supervision-trend.ts:85-96`); bỏ tuần `tong=0` làm đường trend nối qua tuần trống (`:45,61`); `withCountsPercent` (`vst-analytics-data.ts:5-12`) có thể ghi đè tỷ lệ RPC thành 0% khi thiếu `da_tuan_thu`; `bao-cao-tong-hop.actions.ts:186-197` nhánh `gscVeSinhTay` nuốt lỗi; `:204` NKBV bỏ qua khối/khu vực/nghề nghiệp; `:323-329` chú thích «khác cơ cấu» có thể lệch phạm vi. Công thức/chia 0: đã kiểm, đúng (`rateFromTotals` trả null khi mẫu 0).
- `ComprehensiveWasteLinenAppendix.tsx`: trùng `id="bc-waste-linen"` (nguyên nhân lỗi tsc), icon thiếu aria-hidden, `animate-pulse` bỏ qua reduced-motion, `toLocaleString()` không vi-VN, đỏ/xanh không kèm chữ, ngưỡng 20%/10% hard-code chưa có trong metric-dictionary. `bv103-analytics-default-range.ts:14` giảm mặc định 12→3 tháng (không lỗi, ít dữ liệu hơn).
- `NkbvClinicalRationaleCard.tsx`: accordion thiếu aria-expanded/controls, icon chỉ dùng màu, chữ 10-11px, trích dẫn ẩn trên mobile.
- `dialog.tsx` thiếu `aria-describedby` mặc định; `danh-muc-hub-catalog.ts:115,216` hai thẻ trỏ cùng `/quan-tri-he-thong/nhan-su`.
- `cssd-kho-hoa-chat-fefo.ts:79` thông điệp «Hủy hoặc điều chỉnh tồn qua kiểm kê» mâu thuẫn khóa PO «HC không sửa số tồn» (FEFO logic đúng).
- QLCV: `qlcv-dinh-ky-schedule.ts:11-15` `2026-02-31` tràn sang 03/03 không NaN; `qlcv-import-parse.ts:64-70` serial Excel có phần thập phân báo sai, không giới hạn độ dài; `dinh-ky.actions.ts:57-172` validate tay, không zod; bù kỳ cố định 7 ngày (migration 177,194) — cron chết >7 ngày thì thiếu kỳ vĩnh viễn; `QlcvGateStats.tsx:72` nhận `actorStaffId` từ client (chưa xác minh server có tự lấy actor), fallback khi RPC lỗi đổi nghĩa mà không báo; `CongViecForm.tsx` label thiếu `htmlFor`/`aria-required`, chip thiếu `aria-pressed`.
- `set-reconcile-approve.actions.ts`: từ chối không ghi người từ chối.
- Nghiệp vụ: BM.27.01 và BM.27.02 cùng map KSNK.QT.31.BM.01 (CAUTI gộp) — xác nhận chủ ý.
- `vst-write-save-session`/`cssd-scan`: không có spec cho cssd-scan, cssd-register-label, dinh-ky.actions, smart-import, catalog-de-nghi-approve, hoa-chat-nhom, khoa-phong, revalidate-master-data-tags, các picker.

## 5. Đã kiểm và ổn

Login không open-redirect; `staff-login` trả cùng thông điệp cho sai/khóa (chưa thấy rate-limit phía server); QR resolve thuần, không IDOR; logic void đúng; cap VST ≤2 và bỏ sót=1 thống nhất giữa `vst-constants.ts:110-118`, zod `giam-sat-vst.validations.ts:55`, RPC `20261008225611_…sql:29-33`; ô chọn `#026f17` (`globals.css:8`); xóa mềm VST có owner-check + cửa sổ 30 phút; Đào tạo nộp trễ không đạt + khóa lạc quan (`dao-tao-attempt.actions.ts:498-534`; có thể thiếu test cho 30s ân hạn); RIT=DOE+13, IWP=Index±3, SBAP lâm sàng=[Index−3, DOE+13], SSI SBAP 17 ngày, HAI khi HD≥3; `getNkbvKhoaRestriction`/`isNkbvBenhAnInScope` fail-closed; 28 file `*.actions.ts` của quan-tri-he-thong đều có kiểm quyền (grep); `actor-auth-server.ts`, `actor-ksnk-scope-server.ts`, `quan-tri-access.ts:84`, `supabase-server.ts:19` không thấy vấn đề; thứ tự timestamp 3 migration mới ổn; anon bị từ chối ở RPC thống kê.

## 6. Chưa phủ (đề xuất đợt 3)

QLCV: `qlcv-transition-rpc.ts`, Kanban/`useQlcvKanban`, `cong-viec-read.actions.ts`, `cong-viec.actions.ts:224-410`; analytics: `bao-cao-tong-hop-core.ts`, `fetchCssdAnalyticsBundle`, đối chiếu metric-dictionary; master-data `gateway.ts`/`validation.ts`/routing; `RBACMatrixView`, bang-kiem, `tai-khoan-nhan-su`; `staff-session`/`staff-password`; component sự cố; `entity-qr-core.ts`; GSC session-meta + hub; `cssd-bo-bootstrap`, `cssd-workflow-resolve`; `ba-analysis` dòng 1-445; trigger `trg_cssd_guard_cap_phat_khong_ghi_de` (chưa xác nhận tồn tại); `scripts/`, `package.json`, `vitest.config.ts` thay đổi; trang `src/app/chat-thai-do-vai` (client, không guard server); các migration còn lại trong diff; chưa chạy `npm test`.

## 7. Câu hỏi cho PO (SSOT im)

Trả lời PO 2026-11-05:
1. `resolveNkbvKhoaRestriction` trả `all` cho user không thuộc mạng lưới — **chờ PO xác nhận** (nếu KSNK xem toàn viện là chủ ý thì không sửa).
2. Chuyển BA sang khoa khác trên lưới ngày: do nhân viên KSNK làm. Chỉ cần kiểm `khoa_id` tồn tại và trong phạm vi (#8), không đổi nghiệp vụ.
3. DOE trước ngày nhập viện: **quy về ngày nhập viện** (CDC), cho cả RIT và HD.
4. `getIncidentForPrint`: khoa nào in khoa đó, KSNK in tất cả → thêm kiểm khoa (Trung bình; không phải sự cố đang xảy ra, chỉ là thiếu chặn khi biết mã).
5. Đề xuất QLCV: quyền `create` — đúng, bỏ khỏi lỗi.
6. `client_request_id` VST/GSC (migration): PO chưa trả lời, giữ ở Lát B.
7. «IWP viêm nội tâm mạc ±10 ngày»: mã dùng IWP 21 ngày (`nkbv-ch17-criteria.ts:29`); **cần kiểm** với tài liệu dự án, chưa kết luận lỗi.

## 8. Kế hoạch sửa đề xuất (theo thứ tự, mỗi lát verify riêng)

- **Lát A (quyền, không migration):** #1, #4, #5, #6, #7, #8, #12, #17 → `verify:engineering`.
- **Lát B (migration, cần duyệt):** #2, #3 (REVOKE/GRANT), #13 (board_counts), #9 (idempotency VST/GSC) → `mdm:migrate:local` + `verify:mdm:local`.
- **Lát C (toàn vẹn):** #10, #11, #14, #15 (sau khi PO chốt), #16.
- **Lát D (build sạch):** lỗi tsc + 2 lỗi lint (đổi `id` trùng, `let`→`const`).
- **Lát E (P1/P2):** hàng đợi offline, a11y, locale, đăng ký quyền + docs cho chat-thai-do-vai, bổ sung spec.

---

## 9. Kết quả thực hiện kế hoạch sửa (cập nhật 2026-11-06)

Commit trên nhánh `chore/code-vs-ai-phase1`, chưa push, chưa apply prod.

| Lát | Commit | Nội dung | Kiểm chứng |
|---|---|---|---|
| A1 | `789d84b0` | chat-thai-do-vai: quyền view, zod, `HAU_CAN_MOI_TRUONG` | tsc + spec |
| A2 | `5b33c6f0` | CSSD scan/lifecycle/register-label: gate trước ghi, zod | tsc + spec |
| A3 | `42ff680e` | NKBV import/phân tích/BA ngày, QLCV định kỳ, báo cáo tổng hợp, in sự cố | tsc + spec |
| B1 | `a6a72672` | Thu quyền RPC BOM về service_role, kiểm quyền thống kê chất thải, board counts loại lane NULL | review độc lập: Go |
| B2 | `52a083b3` | Idempotency `client_request_id` VST/GSC + hàng đợi offline | tsc + 19 test |
| B3 | `c7bd5347` | RPC nguyên tử: quét trạm, cấp phát, hủy kho lẻ | tsc + 28 test |
| C1 | `fec700c8`, `7bc6b1e4` | Fallback RPC đúng mã, audit fail-closed + diff phân quyền, duyệt đề nghị, smart-import, recall, isViSinhInUse | review: No-go → sửa 3 finding |
| C2 | `24e2be14` | DOE trước nhập viện = ngày nhập viện (RIT/HD), chrono null, badge chờ XN, CSSD bundle theo lockNetwork | tsc + test |
| C3 | `5530bf63` | QLCV (đóng, actor board counts), VST (clamp, xóa phiên) | 252 test |
| D/E | `752ddeb6` | Esc picker/dialog, catch sổ cân; bỏ id trùng `bc-waste-linen` (file chưa track) | tsc + verify:quick |

Kiểm chứng cuối: `tsc` 0 lỗi; `test:cssd` 389 file / 2307 test pass; `verify:engineering` exit 0; `eslint` 0 error / 59 warning; `layout:drift-check` exit 1 (70 khớp, có sẵn, ngoài phạm vi).

### Còn lại / cần PO
1. **Migration chờ PO áp prod** (thứ tự): 20261104120000 → 20261104180000 → 20261105110000 → 20261105120000/100/200 → 20261105130000 → 20261105140000. Mỗi file có SQL kiểm chỉ đọc. Prod phải có đủ hàm/trigger phụ thuộc.
2. **Câu hỏi PO**: SBAP và RIT theo ngày lấy mẫu (`grid-engine`, `ket-luan-smart`) có áp "DOE = ngày nhập viện"? (Q1, Q7 ENDO ±10 chưa chốt); gán quyền `HAU_CAN_MOI_TRUONG` cho vai trò; khoa của sự cố = khoa người báo (giả định).
3. **Hoãn (cần migration/thiết kế)**: audit phân quyền trong cùng transaction RPC; trạng thái riêng cho phiếu đã ghi danh mục + UI chốt thủ công; server re-check chrono-precedence; recall ghi đè `lo_tiet_khuan_id`; `nkbv_fact_labid_event.vi_sinh_id` trong `isViSinhInUse`; `setDinhKyMauActive`, duyệt `dexuat` không scope; `vst-write-save-session` đọc phiên cũ không lọc `is_active`.
4. **Chưa kiểm**: RPC VST/GSC và 3 RPC CSSD chưa chạy tích hợp từ TS với DB local; test tay ca quét TIEP_NHAN; Esc picker chưa test trên trình duyệt; tên constraint 23505 của GSC ở `message` hay `details`.
5. **Hoãn UX**: 14 nhãn «&»→«và» (9 file), 59 warning unused vars, `layout:drift-check` 70 khớp.
