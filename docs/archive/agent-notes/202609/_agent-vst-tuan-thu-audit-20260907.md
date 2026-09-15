> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/giam-sat/README.md`](../../../modules/giam-sat/README.md). Tra cứu lịch sử được.

# Giám sát VST (WHO) + Tuân thủ KSNK (GSC) — audit 2026-09-07

> Máy: Mac BV103 (`machineId` 6bad1c57-…) · Path: `/Users/drnghia/Desktop/ksnk_bv103`  
> Read-first · **LOCAL ONLY** — không commit/push/cloud · Không sửa runtime lớn trong pass này  
> Bar tham chiếu: `docs/modules/quan-tri-he-thong/_agent-admin-auth-review-20260907.md`

---

## A. Bản đồ hiện trạng (routes · module · luồng)

### A1. Route sống (function-based, 2026-06)

| Chức năng | Vệ sinh tay (VST) | Tuân thủ KSNK (GSC `TUAN_THU`) | Ghi chú |
|-----------|------------------|--------------------------------|--------|
| **Form nhập** | `/giam-sat-vst` | `/giam-sat-chung/tuan-thu` | Hub `/giam-sat` trỏ đúng hai cổng này |
| **Lịch sử** | `/lich-su/vst` | `/lich-su/gsc` (± `?loai=`) | Layout lịch sử còn **hai** dải tab (ModeNav + VST/GSC) |
| **Thống kê** | `/thong-ke/vst` | `/thong-ke/gsc` (± `?loai=`) | Layout thống kê: ModeNav + tab VST/GSC |
| **Hub giám sát** | `/giam-sat` | cùng hub | Viết: VST / tuân thủ / NKBV; Đọc: lịch sử VST·GSC (không CTA thống kê trực tiếp) |
| **GSC tổng hợp** | — | `/giam-sat-chung` | Form **không** lọc loại — khác cổng `tuan-thu` |

**Redirect bookmark cũ** (`next.config.ts`):  
`/giam-sat-vst/{lich-su,thong-ke}` → `/lich-su/vst`, `/thong-ke/vst`;  
`/giam-sat-chung/{loai}/thong-ke` → `/thong-ke/gsc?loai=TUAN_THU|NHAT_KY_VAN_HANH|DANH_GIA_HE_THONG`;  
`/giam-sat-chung/{loai}/lich-su` → `/lich-su/gsc` (**không** kèm `?loai=`).  
Form còn redirect `?tab=history|analytics`.

### A2. Code map

| Lớp | VST | GSC tuân thủ |
|-----|-----|--------------|
| App | `src/app/giam-sat-vst/*`, `thong-ke/vst`, `lich-su/vst` | `src/app/giam-sat-chung/tuan-thu`, `thong-ke/gsc`, `lich-su/gsc` |
| Module | `src/modules/giam-sat-vst/{actions,components,hooks,lib,views,types}` | `src/modules/giam-sat-chung/**` (shared 3 loại; cổng `initialLoaiGiamSat="TUAN_THU"`) |
| Header chung | `GiamSatHeader*` + `useGiamSatHeader` | cùng |
| ModeNav | `SupervisionModeNav` module=`vst` | module=`gsc` + `gscThongKeHref` / `gscLichSuHref` |
| Khóa sổ | `sys_module_locks` VST · `use-vst-module-lock` · banner | GSC tương tự |
| Offline queue | `enqueueOfflineVstSave` | `enqueueOfflineGscSave` (cùng `offline-pending-supervision-save`) |
| Scoring / KPI | Classifier hành động + RPC `rpc_dashboard_vst_strategic_analytics` | `giam-sat-scoring.ts` + `gsc-score-display.ts` |
| DB | `gstt_fact_vst_sessions` + `gstt_fact_vst` | `gstt_fact_chung_sessions` + `results_jsonb` + snapshot BK |

### A3. Luồng nghiệp vụ (tóm tắt)

**VST:** Header (khoa/khu vực/hình thức/cách thức) → tối đa 3 đối tượng → mỗi người nhiều **cơ hội** (thời điểm WHO → hành động → đánh giá) → «Ghi nhận cơ hội» (collapse) → «Lưu phiên» (hoặc queue offline) → lịch sử / thống kê. Khóa theo `ngay_giam_sat`. Mạng lưới khóa khoa. Sửa phiên: cửa sổ 30 phút + chủ phiên.

**GSC tuân thủ:** Chọn mẫu BK (`loai` trống hoặc `TUAN_THU`) → header + danh sách tiêu chí dài → Đạt / Không đạt / NA (+ nhật ký số nếu mẫu khác) → preview % → Lưu (snapshot mẫu, scoring engine, offline) → lịch sử / thống kê. Care bundle `dat_tron_goi` lưu DB, UI chỉ hiện %.

### A4. Docs đã đọc

- `docs/modules/giam-sat/{README,bang-kiem-overview,module-lock,pilot-checklist-202606,layout-primitives}.md`
- `docs/core/{domain-specification §2.1, operations-sop §1.2 RBAC}`
- `docs/wiki/{entities,concepts#gsc-scoring}`
- `docs/data/bang-kiem/giamsattuanthu.md` (thiết kế “lý tưởng” — Rapid Tap, root-cause bắt buộc, heat map… — **không** phải SSOT runtime)

---

## B. Điểm mạnh

1. **WHO 5 moments + quy tắc chỉ định** khớp domain: tối đa 2 chỉ định khi tuân thủ, 1 khi bỏ sót (`vstMaxIndications`); nhãn tiếng Việt đúng 5 thời điểm; tooltip giải thích.
2. **Tách % tuân thủ vs chất lượng**: KPI chính theo hành động; đúng kỹ thuật / đủ thời gian / lạm dụng găng là metric phụ trên analytics (RPC) — đúng tinh thần WHO (compliance ≠ quality).
3. **Găng chỉ khi bỏ sót** — form + persist + in ấn (`getVstPrintGloveDisplay`) nhất quán; khi tuân thủ không thu thập găng.
4. **Route Form / Lịch sử / Thống kê tách rõ**, redirect backward-compat, ModeNav thống nhất VST·GSC.
5. **GSC scoring engine thuần** (`TY_LE` / `TRON_GOI` / `DAT_KHONG_DAT` / `NHAT_KY`) + snapshot bảng kiểm lúc lưu (BK-1) + chặn mẫu tắt (BK-5) — rigor checklist tốt cho pilot.
6. **Khóa module, khoa scope mạng lưới, RBAC gate FE**, offline queue cả VST và GSC, e2e `gsc-vst-supervision.spec.ts`, nhiều unit test lib VST/GSC.
7. **Analytics VST** tách moments (split `thoi_diem` bằng dấu phẩy) khỏi KPI cơ hội — phù hợp phân tích chỉ định WHO.

---

## C. Lệch domain / SOP

| # | Vấn đề | Evidence | Mức |
|---|--------|----------|-----|
| D1 | **Thiết kế “tuân thủ lý tưởng” (giamsattuanthu.md) còn xa runtime**: không Rapid Tap 1–2 chạm; không bắt buộc nguyên nhân gốc khi Không đạt / Bỏ sót; không ghi «đã nhắc nhở tại chỗ»; không Pareto nguyên nhân / BM.28.01 tự động. Domain hiện tại **cố ý** gỡ RCA ticket (domain-spec §1). | `giamsattuanthu.md` P1–P2 vs form VST/GSC hiện tại; comment sót `SessionRcaAnalysisPanel` trong `ChecklistItem` | P1 (kỳ vọng PO) |
| D2 | **Red flag / weight trên tiêu chí GSC không vào engine điểm** — UI gắn badge “Chí mạng” nhưng `GsttScoringInputItem` / `computeScore` chỉ dùng `la_then_chot` + DAT/KD. | `gsc-score-display.mapChecklistToScoringInput` truyền `weightType`/`isRedFlag` thừa; scoring.ts không đọc | P1 |
| D3 | **Care bundle (`TRON_GOI`) lưu `dat_tron_goi` nhưng UI chỉ %** — vận hành thấy “66% · Đạt” dù gói then chốt fail. Docs chốt vậy; JCI care-bundle vẫn nên có tín hiệu rõ trên form/lịch sử. | `concepts.md#gsc-scoring`, `gsc-score-display` | P1 (UX domain) |
| D4 | **Docs README lệch code về `?loai=`**: ghi `tuan-thu\|nhat-ky\|he-thong` và “tổng hợp mọi loai”; runtime parse `TUAN_THU`/`NHAT_KY_VAN_HANH`/`DANH_GIA_HE_THONG`; `/thong-ke/gsc` **mặc định lọc tuân thủ**. | `docs/modules/giam-sat/README.md` vs `parseGscLoaiParam` + `use-gsc-analytics-data` | P0 docs (ghi nhận; chưa sửa file) |
| D5 | **Wiki entities**: `/giam-sat-chung/he-thong` ghi «Cấu hình GSC» — sai; đúng là đánh giá hệ thống. | `docs/wiki/entities.md` | P2 docs (ghi nhận; chưa sửa file) |
| D6 | VST **không** ghi nhận can thiệp/feedback tại chỗ (WHO / QT.KSNK.07 khuyến khích). Chỉ có lạm dụng găng khi bỏ sót. | Form VST | P2 |
| D7 | Mã chip «TXNB» dùng chung cho **Trước** và **Sau** tiếp xúc NB (phân biệt bằng prefix TRƯỚC/SAU) — dễ nhầm khi đọc chip rút gọn nếu mất timing. | `VSTOpportunityForm` `MOMENT_DISPLAY` | P2 |

**Khoa học cốt lõi VST:** đạt mức pilot WHO (5 moments, opportunity-based %, găng khi miss, quality phụ).  
**Khoa học GSC tuân thủ:** đạt mức checklist động + 4 cách tính; chưa đủ “process surveillance” đầy đủ (root-cause, red-flag scoring, care-bundle visible).

---

## D. Nợ UX / UI

| # | Vấn đề | Chi tiết | Mức |
|---|--------|----------|-----|
| U1 | **Chrome trùng trên Lịch sử** | `lich-su/layout`: ModeNav (Nhập/Lịch sử/TK) **và** tab VST\|GSC cùng vùng hero → dày, khó primary action | P1 |
| U2 | **Mất ngữ cảnh loại GSC khi ra lịch sử/thống kê từ tuan-thu** | `gscLichSuHref(TUAN_THU)` = `/lich-su/gsc` không `?loai=` → bảng hiện **mọi** loại; ModeNav trên `/lich-su/gsc` resolve form về `/giam-sat-chung` (ALL) thay vì `tuan-thu` | P1 |
| U3 | Redirect lịch sử cũ `…/tuan-thu/lich-su` → `/lich-su/gsc` không giữ loai (khác thong-ke có `?loai=`) | `next.config.ts` | P1 |
| U4 | **GSC form = scroll dài** toàn bộ tiêu chí; Dialog chỉ phóng ảnh bằng chứng — bảng dài khó điểm nhanh trên tablet (mâu thuẫn mục tiêu «thao tác cực nhanh» trong thiết kế) | `GiamSatChungForm` + `ChecklistItem` | P1 |
| U5 | Hub `/giam-sat` có lịch sử nhưng **không** lối tắt thống kê VST/GSC (phải vào ModeNav trong module) | `GiamSatHubPage` | P2 |
| U6 | VST: «Ghi nhận cơ hội» ≠ «Lưu phiên» — toast nhắc tốt; vẫn dễ quên lưu nếu auto 30 phút kích hoạt giữa chừng | `useVSTFormHandlers` auto-save >30' | P2 |
| U7 | Double gate VST: layout `VstModuleAccessGate` + FormView `requireCreate` — an toàn nhưng loading skeleton có thể chồng | layouts + views | P2 |

---

## E. Nợ FE / BE / tech debt

| # | Vấn đề | Chi tiết | Mức |
|---|--------|----------|-----|
| T1 | **Doc/query `loai` không alias** | `parseGscLoaiParam("tuan-thu")` → `TUAN-THU` → undefined → analytics/history không lọc như người viết doc kỳ vọng | P0 |
| T2 | `revalidateGscPaths` / VST save **không** revalidate `/thong-ke/*` | Analytics chủ yếu RPC client — rủi ro thấp với cache RSC | P2 |
| T3 | Hai `HistoryTable.tsx` gần giống (VST / GSC) — drift cột/viewer | modules `*/components/HistoryTable.tsx` | P2 |
| T4 | Comment stale RCA / «nguyên nhân» trong write VST (slice 8) trong khi field thực tế là `co_deo_gang` | `vst-write-save-session.actions.ts`, `ChecklistItem` | P2 |
| T5 | `thoi_diem` lưu chuỗi join `", "` — analytics phải split; rủi ro locale/fullwidth đã có `regexp_replace` nhưng fragile hơn cột array/jsonb | save + RPC moments | P2 |
| T6 | GSC root `/giam-sat-chung` vs chuyên đề — dễ nhập nhầm mẫu nhật ký/hệ thống nếu user vào ALL; hub đã đẩy `tuan-thu` (tốt) | page + hub | P2 |
| T7 | Excess props scoring (`weightType`/`isRedFlag`) — tín hiệu TS/debt rằng scoring chưa xong red-flag | `gsc-score-display.ts` | P1 (cùng D2) |

**Không thấy** orphan page shadow cho `*/thong-ke` / `*/lich-su` dưới GSC (đã redirect). Import Excel VST/GSC đã gỡ đúng docs.

---

## F. Ưu tiên đề xuất sửa (không implement lớn trong pass này)

### P0 — làm ngay (docs / contract rõ)

1. **Chuẩn hóa `?loai=`** — một SSOT: hoặc chấp nhận enum `TUAN_THU|…` (như redirect + code), hoặc thêm alias `tuan-thu`/`nhat-ky`/`he-thong` trong `parseGscLoaiParam`. Đồng bộ README + deep-link helpers.
2. **Khớp mô tả analytics mặc định**: `/thong-ke/gsc` = KPI tuân thủ (không phải «mọi loại») trừ khi chọn `?loai=` khác — sửa doc + banner nếu cần.

### P1 — pilot hiệu quả / tránh hiểu nhầm số liệu

3. **Giữ `?loai=` khi vào lịch sử từ cổng chuyên đề** (`gscLichSuHref(TUAN_THU)` → `?loai=TUAN_THU`; redirect `…/lich-su` tương tự) + ModeNav trên `/lich-su/gsc?loai=` trả form về đúng sub-path.
4. **Giảm chrome trùng** trên `/lich-su/*` (gộp ModeNav + module tabs hoặc một hàng).
5. **Hiện tín hiệu care bundle / red-flag trên UI** (ít nhất badge «Gói: Không đạt» khi `dat_tron_goi===false`; quyết định PO có cho red-flag fail cả phiên hay không).
6. **GSC tablet**: sticky progress + nhảy tiêu chí chưa chấm / hoặc dialog từng nhóm — giảm scroll mù.
7. **Quyết định PO**: có mang root-cause tối thiểu (dropdown lý do khi Bỏ sót / Không đạt) vào pilot không — nếu có, scope hẹp VST miss + GSC KHONG_DAT then chốt.

### P2 — nợ sạch / nâng cao

8. Feedback «đã nhắc» trên VST; mã moment unique; tách/share HistoryTable; revalidate thong-ke; dọn comment RCA; cân nhắc jsonb `thoi_diems[]`.

---

## G. Việc nhỏ trong pass

- Báo cáo này ghi nhận lệch doc (README `?loai=`, wiki `he-thong`) — **chưa** sửa file doc/runtime trong pass (tránh vượt phạm vi read-first).
- Không commit / không push.

---

## H. Verdict

| Tiêu chí | VST (WHO) | GSC tuân thủ |
|----------|-----------|--------------|
| Khoa học / domain | **Đạt pilot** — 5 moments, chỉ định, găng, quality phụ | **Đạt khung** checklist + 4 cách tính; **chưa đủ** root-cause / red-flag / care-bundle nhìn thấy |
| Logic luồng form→lưu→LS→TK | **Tốt** (khóa, scope, offline, edit window) | **Tốt** (snapshot, guard mẫu, offline); lệch lọc loai LS vs TK |
| UX hiệu quả hiện trường | **Khá** (tap moments/actions, 3 cột, sticky ghi nhận) | **Trung bình** trên bảng dài; chrome lịch sử dày |
| FE/BE nợ | Thấp–trung | Trung (scoring flags, path loai, duplicate chrome) |

**Tổng: đã đủ khoa học–logic để chạy pilot giám sát quá trình; chưa gọi là “hiệu quả tối đa / SOP đầy đủ” so với thiết kế tuân thủ lý tưởng và kỳ vọng JCI care-bundle.** Ưu tiên P0/P1 ở contract `loai`, lịch sử theo loại, chrome, và tín hiệu scoring trước khi mở rộng domain (RCA, P×I×S).

---

## I. 2026-09-07 fix (runtime + docs — LOCAL)

**Care bundle / red-flag scoring:** deferred by user — không UI, không scoring hooks, không đưa red-flag vào điểm trong pass này.

### Đã sửa

| # | Việc | Chi tiết |
|---|------|----------|
| P0.1 | `?loai=` SSOT | `parseGscLoaiParam` nhận kebab `tuan-thu\|nhat-ky\|he-thong` (+ underscore / full kebab) **và** enum `TUAN_THU\|NHAT_KY_VAN_HANH\|DANH_GIA_HE_THONG`. Helper `resolveGscLoaiContext` cho form / LS / TK. |
| P0.2 | Default thống kê | `/thong-ke/gsc` không query ≡ **tuân thủ**; banner default + README khớp (bỏ «mọi loại»). `filterBangKiemByLoai(TUAN_THU)` ≡ mẫu trống/`TUAN_THU`. |
| P1.3 | Lịch sử giữ loai | `gscLichSuHref(TUAN_THU)` → `?loai=TUAN_THU`; redirect `…/{loai}/lich-su` kèm loai; ModeNav đọc `?loai=` → form `/giam-sat-chung/tuan-thu` (không generic). |
| P1.4 | Chrome `/lich-su/*` | ModeNav + tab VST/GSC một hàng (giống thống kê), không chồng dọc. TabLinks so khớp pathname bỏ `?query`. |

**Tests:** `gsc-app-paths.spec.ts` mở rộng. `npx tsc --noEmit` + vitest gsc-app-paths (chạy sau khi ghi note).

