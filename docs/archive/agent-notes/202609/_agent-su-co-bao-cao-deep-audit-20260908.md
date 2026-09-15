> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Deep audit — báo cáo sự cố CSSD (`/cssd-su-co`) — 2026-09-08

> Pass 2 (khoa học / logic / chuẩn mực). **Không** lặp narrative pass 1 (tách 3 cửa UI, Dialog điều chuyển, gỡ mã thủ tục).  
> Phạm vi: `src/modules/cssd-su-co` + domain liên quan `cssd-set-reconcile` · **chỉ local** · không commit/push.  
> Không dùng mã QT/PCI trong UI mới hay báo cáo này.

---

## 1. Mục tiêu & phạm vi

| Hạng mục | Nội dung |
|----------|----------|
| Mục tiêu | Rà soát end-to-end mô hình domain, ma trận field, vòng đời, side effect, UX list/detail/in, tìm lệch P0/P1 thật và sửa có trọng tâm |
| Trong phạm vi | Taxonomy 6 nhóm + 3 cửa dụng cụ; validate FE/BE; submit → persist → ledger/recall/BD; xác nhận phiếu; duyệt BOM; biên bản in; RBAC `BAO_SU_CO` |
| Ngoài phạm vi | Redesign nhật ký analytics (`?tab=incident`); đổi schema DB; bỏ D4 collapse typeId (cần PO); FEFO hóa chất đầy đủ |

Pass trước đã ổn: tách cửa UI, validate theo cửa trên form, Dialog điều chuyển, nhãn ngắn, không lẫn thu hồi mẻ với 3 cửa dụng cụ.

---

## 2. Mô hình domain (khoa học)

### 2.1 Taxonomy — 6 nhóm

| Nhóm | Bản chất nghiệp vụ | Type / nguyên nhân | Đánh giá |
|------|--------------------|--------------------|----------|
| **PROCESS** | Lỗi chuỗi xử lý bộ (khâu gốc ± trung gian) | Một mã nội bộ `PROCESS_CHAIN_FAIL` | Đúng: không picker loại; bắt buộc khâu lỗi + phát hiện **sau** lỗi; checklist trung gian sanitize theo index |
| **BATCH** | QC mẻ / BI+ / gói tiếp xúc / thông số | Multi-select 4 preset; entry thu hồi 3 lý do | Đúng SC-10; fault cố định Tiệt khuẩn; detection TK / Cấp phát / Người dùng |
| **INSTRUMENT** | Biến động dụng cụ (không phải sự cố an toàn chu trình) | 3 cửa: Hỏng/Mất · Đổi danh mục · Điều chuyển | Đúng tách bạch; **không** rollback trạm |
| **EQUIPMENT** | Máy hỏng / thông số / bảo trì / BD | Multi-select; BD chặn nạp mẻ (ghi specs máy) | Đúng; BD không kích SC-10 thu hồi mẻ |
| **CHEMICAL** | Thiếu / hết hạn / sai nồng độ | Multi-select; entity qua field `machineId` (UUID HC) | Logic nguyên nhân ổn; **tên field tái dùng máy** dễ nhầm sổ/log |
| **OTHER** | Mô tả tự do | `OTHER_CUSTOM` + vị trí phát hiện | Đủ cho “khác” |

**Cause class** (`SC_QUY_TRINH` / `SC_CHU_QUAN` / `SC_HE_THONG`) map lookup `LOAI_SU_CO` — tách đúng “bản chất nguyên nhân” khỏi nhóm nghiệp vụ. Mặc định EQUIPMENT/CHEMICAL → hệ thống là hợp lý.

**Severity:** không có thang severity độc lập (chỉ `is_red_alert` khi ≥2 sự cố cùng QR). Đủ cho pilot; chưa chuẩn ISO severity grading — ghi P2.

### 2.2 Cross-contamination giữa nhóm / cửa

| Rủi ro | Cơ chế chặn | Còn lỗ |
|--------|-------------|--------|
| Tab sai nhóm | Tab UI + `incidentGroup` trong payload + validate theo nhóm | API vẫn có thể gửi group A + field group B nếu bỏ qua FE — schema Zod không cấm field thừa |
| Hỏng/Mất lẫn Đổi danh mục | FE: `validateInstrumentDoorLines(PHYSICAL)` / `validateCatalogReconcileDoorLines` | **Trước pass này:** BE sau D4 (`typeId=SET_RECONCILE`) nhận gói lẫn / phiếu KHOP-only → **đã chặn** |
| Thu hồi mẻ mở 3 cửa dụng cụ | Entry banner + không render cửa INSTRUMENT | OK |
| PROCESS legacy batch codes | Coerce → BATCH | OK đọc sổ cũ |

### 2.3 Vòng đời trạng thái

Hai trục song song (dễ nhầm nếu gọi chung “approve”):

```
Phiếu sự cố chung:
  tạo (OPEN / chưa xác nhận) → xác nhận (DA_XAC_NHAN)
  Không có reject / close riêng; vô hiệu = is_active=false (ít dùng UI)

Cửa Đổi danh mục (SET_RECONCILE_STATUS):
  DRAFT → gửi → BOM_PENDING → BOM_APPROVED | BOM_REJECTED
  Cửa Hỏng/Mất / Điều chuyển: SET_RECONCILE_STATUS = NONE (ghi sổ ngay)
```

So với kỳ vọng “draft → submit → approve/reject → close”: **chưa đủ một FSM thống nhất**; xác nhận phiếu ≠ duyệt BOM. Cần tài liệu hóa rõ cho NV (P1 UX/docs, không phải bug code).

### 2.4 RBAC

| Hành động | Gate |
|-----------|------|
| Tạo / xác nhận phiếu | `BAO_SU_CO` create (`verifyCssdIncidentCreate`) — **cùng gate** |
| In / list gần đây | create **hoặc** view |
| Duyệt/từ chối BOM | `DC_LE`/`BO_DC` edit |
| Thu hồi mẻ | Không gate riêng — ai tạo BATCH được là kích SC-10 |

**Lệch:** người tạo cũng xác nhận được phiếu của mình; không tách “trưởng kíp duyệt”. Chấp nhận được nếu quy chế khoa cho phép peer-confirm; nếu cần four-eyes → P1 product.

---

## 3. Ma trận field theo loại (+ cửa)

Ký hiệu: **B** bắt buộc · **O** tùy chọn · **F** cấm / không hiện · **S** side-effect

| Field | PROCESS | BATCH | INSTRUMENT Hỏng/Mất | INSTRUMENT Đổi DM | INSTRUMENT Chuyển | EQUIPMENT | CHEMICAL | OTHER |
|-------|---------|-------|---------------------|-------------------|-------------------|-----------|----------|-------|
| Mô tả | B | B | B | B | B | B | B | B |
| Trạm phát hiện | B | B* | B (thường QC) | B | B | B | B | B (+ vị trí text) |
| Khâu lỗi | B | cố định TK | O (default QC) | F logic | F logic | — | — | O (rollback target) |
| Khâu trung gian | O (sanitize) | F | F | F | F | F | F | F |
| Checklist nguyên nhân | F | B (≥1) | F | F | F | B | B | F |
| QR / bộ | O (có thì trace) | O nếu đủ lô | B | B | B | F | F | F |
| Mã lô / id mẻ | O (context TK) | B | F | F | F | F | O (lô HC) | F |
| Máy TK / máy SC | O | B | F | F | F | B | F | F |
| Hóa chất (`machineId`) | F | F | F | F | F | F | B | F |
| Bảng dòng thành phần | F | F | B (≥1 HONG/MAT) | B (≥1 catalog) | B (kho hoặc 2 bộ) | F | F | F |
| Ảnh minh chứng | O | O | B nếu có HONG | O | B nếu kho | O | O | O |
| Người phát hiện / liên quan | O | O (+ cycle) | O | O | O | O | O | O |
| Cause class | O (default) | O | O | O | O | O (default hệ thống) | O (default hệ thống) | O |

\* BATCH: detection locale `NGUOI_SU_DUNG` map DB → `CAP_PHAT`.

### Cờ so với nghiệp vụ thật

| Vấn đề | Mức | Ghi chú |
|--------|-----|---------|
| CHEMICAL tái dùng `machineId` | P2 | In biên bản hiện UUID thô |
| Không FEFO / quarantine lot HC trên submit | P2 | Pilot S3 kỳ vọng liên kết kho — chưa thấy trong `executeIncidentReportAndRollback` |
| D4: `INCIDENT_TYPE_CODE` Hỏng/Mất = `SET_RECONCILE` | P1 sổ | Khó lọc nhật ký “chỉ Hỏng/Mất”; suy từ snapshot dòng |
| PROCESS không bắt buộc QR khi không có bộ | OK | Sự cố khâu không gắn bộ |
| BATCH multi-cause: primary type = phần tử đầu (không `BATCH_MULTI`) | P2 | EQUIPMENT/CHEMICAL có `*_MULTI`; BATCH không đồng nhất |

---

## 4. Luồng trạng thái + side effect

### 4.1 Create path (tóm tắt)

1. Zod `cssdIncidentReportInputSchema`  
2. `validateIncidentSubmitRules` (nhóm)  
3. Dedup BATCH cùng quy trình + lô + typeId (cần `confirmDuplicate`)  
4. Insert/update `cssd_fact_su_co` + attributes  
5. INSTRUMENT + setReconcile → `applySubmittedSetReconcile` → ledger / engraved / BOM_PENDING  
6. Non-INSTRUMENT + có quy trình → policy rollback / freeze / red alert  
7. SC-10 → `applyBatchRecallAndHoldMachine`  
8. BD fail → patch `cssd_dm_thiet_bi.specs`  
9. Catch: rollback quy trình + **xóa** phiếu (anti-orphan một phần)

### 4.2 Side effect theo nhóm

| Nhóm / cửa | Rollback trạm | Freeze | Red alert | Ledger / master | Khác |
|------------|---------------|--------|-----------|-----------------|------|
| PROCESS | Về khâu lỗi | Không (trừ SC-10 legacy) | ≥2 QR | — | Exception + lifecycle |
| BATCH / SC-10 | Thu hồi cả mẻ | Đóng gói → đóng băng | như trên | — | Máy READY→HOLD_QC |
| INSTRUMENT Hỏng/Mất | **Không** | **Không** | có thể gắn cờ đỏ QT | BAO_HONG/BAO_MAT −qty | Ghi chú chi tiết |
| INSTRUMENT Đổi DM | Không | Không | — | Chờ duyệt → apply BOM | Blocking draft/pending |
| INSTRUMENT Chuyển | Không | Không | — | DIEU_CHUYEN / BO_SUNG / TRA_KHO | Transfer BOM nếu 2 QT |
| EQUIPMENT | Ở chỗ + freeze | Có | — | BD→specs KHONG_DAT | Không thu hồi mẻ |
| CHEMICAL | Freeze nếu gắn QT | Có | — | Không quarantine lot | |
| OTHER | fault hoặc bước trước | Không | — | — | |

### 4.3 Idempotency / double-submit / orphan

| Cơ chế | Đánh giá |
|--------|----------|
| Dedup BATCH | Có; chỉ khi có `quyTrinh` + lô + type khớp |
| Draft SET_RECONCILE | Update theo `draftIncidentId`; TTL draft |
| Pending BOM / bộ | Chặn phiếu catalog thứ hai |
| Catch xóa phiếu | Giảm orphan khi ledger fail; race double-click vẫn có thể 2 phiếu OPEN (không idempotency key chung) |
| Xác nhận | `assertIncidentPhieuCanConfirm` — không xác nhận lại |

---

## 5. List / detail / print / history UX

| Surface | Hiện trạng | Lệch |
|---------|------------|------|
| `/cssd-su-co` | Form + “Phiếu gần đây của tôi” (≤8, filter reporter) | Empty state yếu khi không có phiếu; không filter nhóm/status |
| Nhật ký | `/cssd-erp/report?tab=incident` (ngoài module) | Không audit sâu pass này |
| In biên bản | `IncidentPrintView` | **Trước fix:** thiếu nhãn BATCH; INSTRUMENT = “Hỏng hóc”; copy “Đóng băng” **sai** so policy; thu hồi chỉ hiện khi group=PROCESS |
| Detail theo type | In có nhánh MACHINE/HC/lô; bảng snapshot dụng cụ | CHEMICAL in UUID; không resolve tên HC |
| Performance | Form tách field components; print lazy sau submit | List approve BOM filter client 80 rows — residual P2 |

---

## 6. Lệch P0 / P1 / P2 (mới — so với pass trước)

### P0
*Không còn P0 blocker sau fix pass này.* (Pass trước đã xử lý lẫn UI hai cửa.)

### P1 (mới)

| # | Lệch | Ảnh hưởng | Xử lý pass này |
|---|------|-----------|----------------|
| P1-1 | Biên bản in: thiếu nhóm BATCH; nhãn INSTRUMENT sai; copy đóng băng **mâu thuẫn** `skipWorkflowRollback` | Biên bản pháp lý / đào tạo sai | **Đã sửa** — `cssd-incident-print` + `IncidentPrintView` |
| P1-2 | Thu hồi/HOLD_QC trên in chỉ hiện khi `PROCESS` (BATCH SC-10 bị ẩn) | Biên bản thu hồi mẻ thiếu thông tin | **Đã sửa** — hiện cho PROCESS **và** BATCH |
| P1-3 | BE `validateInstrumentDoorLines(SET_RECONCILE)` sau D4 chấp nhận gói **lẫn** Hỏng/Mất+Đổi DM và phiếu **không hành động** | Integrity API / bỏ qua FE | **Đã sửa** — `SET_RECONCILE_MIXED_DOOR_MESSAGE` / `NEED_ACTION` |
| P1-4 | D4: typeCode Hỏng/Mất collapse → SET_RECONCILE trên sổ | Lọc nhật ký / KPI cửa | **Chưa đổi typeId** (PO); in suy cửa từ snapshot |
| P1-5 | Xác nhận phiếu cùng quyền tạo | Four-eyes | Ghi nhận — không đổi gate |

### P2

- CHEMICAL `machineId` naming + in UUID  
- Không FEFO/quarantine HC trên submit  
- BATCH primary type không `BATCH_MULTI`  
- Dedup BATCH yếu khi không gắn quy trình  
- INSTRUMENT_TRANSFER/REPLENISH trước đây thiếu `return null` sau validate OK (đã vá fall-through)  
- Severity grading / close state thiếu  
- `isInstrumentIncidentImageRequired` vẫn legacy-only (form đã bắt ảnh theo dòng HONG)  
- List BOM approve filter in-memory  

---

## 7. Đã sửa trong pass này

1. **Domain validate D4** (`cssd-set-reconcile.ts`): chặn lẫn cửa + phiếu SET_RECONCILE không hành động; early-return rõ cho TRANSFER/REPLENISH.  
2. **Vitest** case mới trong `cssd-set-reconcile.spec.ts`.  
3. **`cssd-incident-print.ts` (+ spec)**: nhãn 6 nhóm; suy cửa từ dòng; solution khớp side-effect thật.  
4. **`IncidentPrintView.tsx`**: dùng helper; hiện thu hồi/HOLD cho BATCH.  

**Không** invent churn: không đụng lại UI 3 cửa / Dialog / strip QT.

Kiểm tự động: `npx vitest run src/lib/domain/cssd-set-reconcile.spec.ts src/modules/cssd-su-co/domain/` → **76 passed**. `tsc --noEmit` sạch trên touched paths.

---

## 8. Verdict: đủ chuẩn mực? Gap còn lại

**Verdict:** Đủ **chuẩn mực pilot / vận hành CSSD** sau pass 1+2 cho luồng tạo–ghi sổ–thu hồi–in cơ bản. **Chưa** đủ chuẩn sổ cái dài hạn / four-eyes / hóa chất FEFO nếu khoa yêu cầu ISO đầy đủ.

**Gap còn lại (ưu tiên):**
1. Quyết định PO: lưu cửa INSTRUMENT trên attributes / typeCode thay vì chỉ D4 collapse.  
2. Four-eyes xác nhận phiếu (gate riêng).  
3. CHEMICAL: field riêng + resolve tên trên in + quarantine lot nếu nghiệp vụ bắt buộc.  
4. FSM thống nhất / docs NV: phân biệt xác nhận phiếu vs duyệt BOM.  
5. Idempotency key submit chung.

---

## 9. Checklist kiểm tay

1. Tab **Dụng cụ → Hỏng/Mất**: giảm đếm → Hỏng → Gửi → in biên bản: nhóm “Dụng cụ”, phương án **không** nói đóng băng; sổ giảm đúng.  
2. Tab **Đổi danh mục**: sửa chuẩn → Gửi → BOM_PENDING; duyệt bằng tài khoản DC_LE/BO_DC.  
3. Tab **Điều chuyển**: Dialog → kho↔bộ → Gửi → ledger.  
4. **Thu hồi theo mẻ**: BI+ + mã lô → thu hồi đa bộ; in hiện “Thu hồi cả mẻ” + HOLD_QC nếu máy sẵn sàng; nhóm “Mẻ tiệt khuẩn”.  
5. Tab **Quy trình**: khâu lỗi trước phát hiện; checklist trung gian chỉ station giữa.  
6. Tab **Máy**: chọn BD không đạt → specs máy KHONG_DAT ngày VN.  
7. Tab **Hóa chất**: bắt buộc chọn HC + ≥1 nguyên nhân.  
8. Xác nhận phiếu gần đây → không bấm lại được.  
9. (Dev) vitest như mục 7.

---

## 10. File chạm (pass 2)

- `src/lib/domain/cssd-set-reconcile.ts` (+ `.spec.ts`)
- `src/modules/cssd-su-co/domain/cssd-incident-print.ts` (+ `.spec.ts`) **mới**
- `src/modules/cssd-su-co/components/IncidentPrintView.tsx`
- `src/modules/cssd-su-co/domain/cssd-incident-trace.ts` (comment helper ảnh)
- `docs/modules/cssd/_agent-su-co-bao-cao-deep-audit-20260908.md` **mới**

---

## 11. Cross-link — PO gaps đã chốt (2026-09-08)

Pass riêng: [`_agent-su-co-po-gaps-fix-20260908.md`](./_agent-su-co-po-gaps-fix-20260908.md).

1. Hỏng/Mất: typeCode `INSTRUMENT_PHYSICAL` (hết D4 collapse).  
2. Four-eyes xác nhận + tách người phát hiện / người tạo.  
3. CHEMICAL: `chemicalId` + quarantine specs + cổng xuất kho.
