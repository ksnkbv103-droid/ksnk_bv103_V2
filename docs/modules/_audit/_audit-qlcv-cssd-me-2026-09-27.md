# Audit QLCV + CSSD dụng cụ / sự cố + Mẻ TK — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip audit start | `645acdc` (ahead 28 vs origin) · Perf P1 on tip |
| Phạm vi | QLCV `/quan-ly-cong-viec` · CSSD `/cssd-dung-cu` · `/cssd-su-co` · phiếu mẻ `/cssd-erp/batch` + `?tab=batch` |
| Không | push / PR / merge / Vercel / CloudAgent / apply migrate / DROP / xóa data |

## 1. Module map (tip)

| Module | Route | Entry / hooks | RPCs / write | Docs neo |
|--------|-------|---------------|--------------|----------|
| QLCV | `/quan-ly-cong-viec` | `views/QuanLyCongViecPage.tsx` · `useQlcvKanban` / `useQlcvTable` · `qlcv-labels.ts` | `fn_qlcv_transition` · checklist · spawn · `rpc_qlcv_board_counts` (wired 47ac706) | `19`/`19b`/`19c`/`19d` · Wave3 `qlcv_wave3_drop_dm_loai_trang_thai` **DONE** @ `20260927171305` (prod `cvzwslpxwgqiugzzhqej`) |
| CSSD dụng cụ | `/cssd-dung-cu` | `app/cssd-dung-cu/page.tsx` · `useCssdCatalogPage` · tabs BO/LOAI/DE_NGHI/HISTORY | catalog đề nghị · inventory history | `quan-ly-dung-cu-luong.md` · TRAM SSOT |
| CSSD sự cố | `/cssd-su-co` | `SuCoBaoCaoPage` · `SuCoReportForm` · taxonomy | `createIncidentReport` · batch recall `rpc_cssd_me_thu_hoi` | ME-S3 · incident taxonomy |
| Mẻ TK | `/cssd-erp/batch` · `quyTrinh?tab=batch` | `MeTietKhuanPage` · `use-me-tiet-khuan-workflow` | ME-S1…S5 + ledger_atomic **DONE** on prod | `me-s2`/`me-s3` · `_audit-me-recall-2026-09-25` |

## 2. Findings (evidence → A/B/C → chọn)

### F1 · P0 Domain — cửa dụng cụ lẫn trên `/cssd-su-co`

| | |
|--|--|
| **Evidence** | Tip `cssd-incident-taxonomy.ts` INSTRUMENT presets = Hỏng/Mất **+** Chuyển kho·bộ. Page meta: «Hỏng/Mất · Chuyển». **Không** có tab `LUAN_CHUYEN` trên `/cssd-dung-cu`. |
| **Lock** | Mandate: sự cố chỉ Hỏng/Mất trên `/cssd-su-co`; LUAN_CHUYEN trên dung-cu. |
| **Prior art** | Commit `44aeb25` trên `cursor/cssd-three-doors-ia-61f4` (**không** ancestor tip; tip ahead 37) đã tách 3 cửa + `CSSDCatalogLuanChuyenTab`. |
| **A** | Port/re-apply three-doors lên tip: su-co picker chỉ PHYSICAL; tab Luân chuyển trên dung-cu; deep-link MOVE → `cssdLuanChuyenHref`; giữ tip `STATION_LABEL` SSOT (không mang dual map «Kiểm tra chất lượng (QC)» từ bản cũ 44aeb). |
| **B** | Giữ MOVE trên su-co; chỉ đổi copy «Chuyển = luân chuyển» — **vi phạm lock**. |
| **C** | Park chờ Nghĩa cherry-pick cả branch — chậm; lock đã chốt. |
| **Chọn** | **A** — Domain lock + prior art đã review. Risk: UX regress nếu user bookmark `?type=INSTRUMENT_MOVE` trên su-co → phải redirect dung-cu (cố ý). |

### F2 · P0 Domain — BOM / đề nghị danh mục trên trạm Đóng gói

| | |
|--|--|
| **Evidence** | `CompositionReconcilePanel.tsx:205–214` link «Đề nghị sửa thành phần danh mục» vẫn hiện khi `gateMode` (đóng gói). Copy gate lại bảo biến động không ghi trên trạm. Branch `cursor/cssd-dong-goi-process-only-bc51` (`69dc4e9`/`58f668d`) **không** trên tip. |
| **Lock** | Đóng gói scan-only; BOM/đề nghị không thuộc cửa đóng gói. |
| **A** | Ẩn link đề nghị BOM khi `gateMode`; giữ bảng cần/thực tế + plasma pack material + nút chuyển bước. Đề nghị BOM chỉ từ `/cssd-dung-cu` (SetCompositionCard / DE_NGHI). |
| **B** | Gỡ hẳn CompositionReconcilePanel khỏi đóng gói (chỉ QR → advance) — mạnh hơn; có thể mất gate đếm cần/thực tế + plasma. |
| **C** | Cherry-pick nguyên branch dong-goi — conflict với tip heat/plasma. |
| **Chọn** | **A** — đúng «scan + đối chiếu + chuyển», bỏ cửa đề nghị. Risk UX thấp. |

### F3 · P1 UX — copy su-co / đóng gói còn nói «Chuyển» như cửa sự cố

| | |
|--|--|
| **Evidence** | `app/cssd-su-co/page.tsx` description; form labels «Chuyển kho·bộ»; panel đóng gói: «Biến động … làm tại Sự cố». |
| **A** | Đồng bộ copy với F1/F2 khi port doors. |
| **B** | Chỉ sửa docs. |
| **Chọn** | **A** (đi kèm F1/F2). |

### F4 · P1 QLCV — Wave3 draft chưa apply (DUAL DB) → **W4 DONE**

| | |
|--|--|
| **Evidence** | `20260926053300_qlcv_wave3_…sql` local; FE 0 `.from('qlcv_dm_*')`; live view vẫn JOIN dm. |
| **A** | Không đụng — chờ Nghĩa apply. FE giữ hardcode `qlcv-labels`. |
| **B** | Apply migrate — **cấm** mandate. |
| **Chọn** | **A** park. |
| **W4 2026-09-28 00:13 ICT** | Prod `cvzwslpxwgqiugzzhqej`: `qlcv_wave3_drop_dm_loai_trang_thai` applied (`20260927171305`; duplicate stamp `20260927171313` idempotent). `qlcv_dm_*` = null; lookup LOAI/TRANG_THAI active_rows=0. FE tip grep `.from('qlcv_dm')` clean; hardcode `qlcv-labels` SSOT. |

### F5 · P1 Mẻ — migrate ME-S* chưa apply remote → **W4 DONE**

| | |
|--|--|
| **Evidence** | `_audit-me-recall-2026-09-25.md`; files `20260925090000`→`20260925150000` local. |
| **A** | Park UAT nhả/thu hồi tới khi Nghĩa apply. Không invent FE bypass. |
| **Chọn** | **A** park. |
| **W4 2026-09-28 00:13 ICT** | Already on prod: `cssd_me_batch_integrity_rpc`, `cssd_me_s2_qc_release`, `cssd_me_s3_batch_recall`, `cssd_me_s5_filter_remove`, `cssd_ledger_atomic`. Smoke: `rpc_cssd_me_thu_hoi` + `rpc_cssd_me_ket_luan_dat` exist. |

### F6 · OK trên tip (không reopen)

| Mục | Tip |
|-----|-----|
| QLCV Nhiệm vụ tab + nhãn | `mainTabs` có NHIEM_VU / DINH_KY / BAO_CAO (`QuanLyCongViecPage`) |
| 19d ưu tiên nổi / không chọn Khẩn / không QlcvDmAdminLinks | CongViecForm + locked lookups |
| TRAM 6 stations + QC=Kiểm bộ SSOT | `cssd-stations.ts` + hub LOCKED |
| Perf P1 | `645acdc` lazy panels + Kanban Promise.all + OfflineSync CSSD-path |
| TIET_KHUAN via phiếu mẻ (không scan station map) | `SCAN_STATIONS` excludes TIET_KHUAN; `nextIsMeHandoff` |

### F7 · P2 hygiene

| | |
|--|--|
| PROCESS_QC_FAIL label | Taxonomy SSOT «Không đạt Kiểm bộ tại khâu»; Soft W4 aligned policy.spec fixture. |
| Dirty WT không liên quan | `AGENTS.md`, scripts/csv — **để yên**. |

## 3. Priority order (Phase 2)

1. **F1** three-doors port (correctness / Domain lock)
2. **F2** đóng gói ẩn BOM đề nghị khi gateMode
3. **F3** copy sync
4. Park F4/F5

## 4. Anti-bias beat (tóm tắt)

- F1: A thắng vì lock + commit đã có trên sibling branch; B vi phạm lock; C trì hoãn không lý do Domain.
- F2: A thắng vì giữ gate đếm/plasma hữu ích; B quá cắt; C conflict nặng.


## 5. Steering khóa thêm (Nghĩa 2026-09-27 13:41 ICT) — áp vào chọn A/B/C

1. **Tối ưu:** phương án đơn giản nhất vẫn đúng Domain; không abstraction/UI dư.
2. **Tách nghiệp vụ:** mỗi cửa một việc; không embed luồng module A vào shell B theo nghĩa **chồng cửa** (BOM trong Đóng gói; điều chuyển trong picker sự cố; quét tay TIET_KHUAN).
3. **Không phức tạp / dual path:** một SSOT; xóa dual; park nếu fix rối hơn.
4. **CRUD cascade:** mutate → status / tồn / set counts / board / báo cáo khớp.

### Beat F1 (cập nhật)

- **A (chọn):** Port three-doors `44aeb25` tinh gọn lên tip — bỏ MOVE khỏi picker `/cssd-su-co`; tab `LUAN_CHUYEN` trên `/cssd-dung-cu`; deep-link MOVE → dung-cu; `entryMode="luan-chuyen"` khóa form cùng write path hiện có (không dual RPC).  
  - Đúng lock · tách cửa trên IA · **ít file nhất** (reuse `SuCoReportForm` + flag, không viết form chuyển mới) · cascade ghi sổ giữ nguyên.  
  - «Embed» ở đây = tái dùng write path đã có trong **shell cửa đúng** (dung-cu), không phải chồng MOVE trong picker sự cố — khác anti-pattern steering §2.
- B giữ MOVE trên su-co → vi phạm §2.
- C viết component Move riêng trên dung-cu → dual UI / nhiều file hơn → thua A theo §1+§3.
- D chỉ gỡ MOVE, không cửa luân chuyển → thủng CRUD nghiệp vụ (§4).

### Beat F2 (giữ A)

- Ẩn link đề nghị BOM khi `gateMode` — 1 chỗ, không gỡ panel đếm/plasma (vẫn cần cho chuyển bước đúng). Không cherry-pick cả branch dong-goi (conflict/nhiều hơn cần).


## 6. Phase 2 applied (local tip)

| Finding | Commit | Kết quả |
|---------|--------|---------|
| F1 three doors | `77e7b63` | su-co picker chỉ Hỏng/Mất; tab LUAN_CHUYEN + deep-link redirect |
| F2 đóng gói BOM | `2380628` | `gateMode` ẩn link đề nghị BOM |
| F3 copy | trong `77e7b63` | meta/page/modal/admin panel đồng bộ |
| F4 Wave3 migrate | Soft W4 | **DONE** prod `20260927171305` (`qlcv_wave3_drop_dm_loai_trang_thai`) |
| F5 ME migrate | Soft W4 | **DONE** prod (ME-S1/S2/S3/S5 + ledger_atomic already) |

Verify: `npx tsc --noEmit` OK · vitest routes+taxonomy+stations+packaging 23/23.

Tip after Phase 2: `2380628` · branch `cursor/me-sync-recall-print` · ahead 31 · **không push**.

## 7. W4 migrate + đồng bộ (Soft · 2026-09-28 ~00:13 ICT)

| Mục | Kết quả |
|-----|---------|
| Target | **ksnk-bv103-prod** `cvzwslpxwgqiugzzhqej` only |
| ME-S1…S5 + ledger | **already applied** (skip re-apply) |
| Wave3 QLCV | **applied** `qlcv_wave3_drop_dm_loai_trang_thai` @ `20260927171305` (+ duplicate stamp `20260927171313`, idempotent DDL) |
| Smoke | `qlcv_dm_loai`/`qlcv_dm_trang_thai` = null · lookup active=0/12 · `rpc_cssd_me_thu_hoi`/`ket_luan_dat` true |
| FE residual | 0× `.from('qlcv_dm…')` on tip · `normalizeQlcvDmFields` = local TEXT normalize only |
| Soft follow-up | Align `PROCESS_QC_FAIL` fixture copy → «Không đạt Kiểm bộ tại khâu» (F7 residual) |
| Push / Vercel | **không** |

Tip after W4 Soft: see git HEAD after commit · branch `cursor/me-sync-recall-print` · **không push**.
