> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# Kế hoạch chỉnh — Giám sát tuân thủ (VST + GSC)

> Ngày: 2026-09-17 · PO chốt trước khi sửa code lớn  
> Nền: [`BV103-GSC-CHAN-DOAN-DON-GIAN-20260917.md`](./BV103-GSC-CHAN-DOAN-DON-GIAN-20260917.md) · [`BV103-GSC-DE-CUONG-20260917.md`](./BV103-GSC-DE-CUONG-20260917.md)  
> Domain neo: `docs/core/domain-specification.md` §VST/GSC · `docs/modules/giam-sat/*` · `metric-dictionary.md` · `canonical-36.md`  
> **Không** commit / migrate / Vercel trong kế hoạch này cho đến lệnh Nghĩa.

---

## 0. Mục tiêu khóa (một câu)

Làm giám sát tuân thủ **đúng nghiệp vụ đơn giản**, **và** tách luồng điều hành: Tổng quan/Báo cáo ≠ Công việc (bỏ Việc hôm nay + link QLCV; cân nhắc 1 cửa Báo cáo), nhưng **số liệu và domain vẫn chuẩn** (WHO 5 moments, % tuân thủ đúng mẫu số, snapshot mẫu, lọc đa chiều, xu hướng) — **không** phình thêm “hệ sinh thái IPAC” trước khi MVP được tuyên bố Done.

### Định nghĩa Done (MVP) — đề xuất Nghĩa chốt

> **Done** khi: (1) Pilot G1–G5 + V1–V3 PASS trên localhost/staging; (2) GSV chỉ cần Form → Lưu → Lịch sử/In → Thống kê (lọc kỳ–khối–khoa–khu vực–đối tượng + % + xu hướng); (3) `ty_le_vst` / `ty_le_gsc` khớp form–lịch sử–in–thống kê theo metric-dictionary; (4) **không** thêm tính năng strategic/P×I×S/RCA trong phase đóng MVP.

---

## 1. Nguyên tắc khoa học / domain (không thương lượng)

| # | Nguyên tắc | Hệ quả kỹ thuật |
|---|------------|-----------------|
| D1 | **VST ≠ GSC** | Giữ 2 form/2 bảng fact; không gộp |
| D2 | VST = giám sát **cơ hội** WHO T1–T5 | Không bắt đủ 5 mốc trên 1 cơ hội; ≤3 đối tượng/phiên |
| D3 | GSC tuân thủ = checklist động + `results_jsonb` | Không hồi EAV kết quả |
| D4 | Khi **Lưu** GSC → **snapshot** mẫu (BK-1) | Sửa/in/xem ưu tiên bản chốt |
| D5 | `%` phiên = DAT / (DAT+KĐ); **NA ngoài mẫu số** | Một engine `giam-sat-scoring`; UI % thống nhất 2 chữ số GSC / 1 chữ số VST |
| D6 | `ty_le_gsc` điều hành / thống kê mặc định **chỉ `TUAN_THU`** | Nhật ký / hệ thống chỉ khi `?loai=` đúng chuyên đề |
| D7 | **Không** CCS trên surface điều hành | Chỉ `ty_le_vst` · `ty_le_gsc` |
| D8 | Phần 3–4 RCA trên form **đã DROP** | Không dựng lại; phân tích lỗi = analytics tiêu chí |
| D9 | Canonical **36** mẫu | Không seed từ `master-*` legacy |
| D10 | DB **additive only**; không migrate prod khi chưa lệnh | P×I×S sau MVP nếu cần |

---

## 2. Kiến trúc đích (sau chỉnh) — 3 tầng rõ

```text
Tầng 1 — VẬN HÀNH GSV (mặc định, luôn thấy)
  Form VST | Form GSC tuân thủ
  Lịch sử + In phiếu
  Thống kê: lọc + KPI % + xu hướng + bảng theo khoa
  (Export Excel phiên — giữ)

Tầng 2 — CHUYÊN ĐỀ (cổng rõ, không trộn vào % tuân thủ mặc định)
  GSC Nhật ký vận hành | GSC Đánh giá hệ thống
  Deep link ?loai= …

Tầng 3 — NÂNG CAO / ĐIỀU HÀNH (tab hoặc accordion «Nâng cao», mặc định thu)
  Matrix khối / khu vực / hình thức / cách thức
  Drill 1 BK → tiêu chí × khoa
  TGS «BK tôi phải tự giám sát» / gap TGS–KSNK
  (Sau này) P×I×S · in báo cáo kỳ Ban
```

**Logic:** Tầng 1 = Done MVP. Tầng 2–3 không xóa code (tránh phá RPC), chỉ **đổi IA** để khỏi rối.

---

## 3. Lộ trình phase (logic, có DoD)

### Phase A — Khóa phạm vi & SSOT (docs, ≤1 ngày, Grok)

| Việc | File / hành động | DoD |
|------|------------------|-----|
| A1 | Chốt văn bản Done MVP (mục 0) vào README giam-sat | Nghĩa OK trong chat |
| A2 | Thêm mục «3 tầng IA» vào `docs/modules/giam-sat/README.md` | Trỏ plan này |
| A3 | Giữ banner ARCHIVE/LEGACY đã gắn (không đọc master/giamsattuanthu khi code) | — |
| A4 | Freeze list **cấm 2 tuần** (mục 5) | Commit message / note Lead |

**Không sửa runtime.**

### Phase B — Đơn giản hoá IA thống kê (FE, ước ~3–6 file, Grok local hoặc Cursor nếu >5)

**Mục tiêu:** `/thong-ke/gsc` và `/thong-ke/vst` mở ra là **Tầng 1**; phần strategic/TGS vào «Nâng cao».

| Việc | Gợi ý file | DoD |
|------|------------|-----|
| B1 | `GscAnalyticsView.tsx` — mặc định: filter + KPI + trend + so sánh khoa; `GscBangKiemToiPhaiTgsPanel` + phần phụ strategic vào section `Nâng cao` (collapsed) | GSV không thấy TGS trước khi mở Nâng cao |
| B2 | `VSTAnalyticsView.tsx` — cùng pattern (KPI + trend + moments trước; strategic dưới) | Đối xứng VST/GSC |
| B3 | Copy UI ngắn trên form hub: «Nhập phiếu → Lịch sử → Thống kê» | 1 dòng hướng dẫn |
| B4 | Vitest/smoke không đổi RPC | `tsc` sạch; không đổi chữ ký RPC |

**Cấm trong B:** đổi công thức %, đổi snapshot, đổi schema.

### Phase C — Xác minh số liệu & in phiếu (khoa học tuyệt đối trên số)

| Việc | Cách | DoD |
|------|------|-----|
| C1 | Ma trận đối chiếu 1 phiếu GSC: form preview % = lịch sử = bản in = ô thống kê (cùng kỳ/khoa/BK) | Sai số 0 theo quy tắc làm tròn metric-dictionary |
| C2 | 1 phiên VST: cơ hội / tuân thủ / % khớp WHO rules domain | Pass |
| C3 | Regression: phiếu có snapshot không «mọc» tiêu chí mới từ mẫu live | Pass (đã có spec/tests snapshot — chạy lại) |
| C4 | Pilot checklist `pilot-checklist-202606.md` G1–G5, V1–V3 | Nghĩa ký PASS |

### Phase D — Nội dung domain bảng kiểm (chuẩn mực lâm sàng)

| Việc | Ai | DoD |
|------|----|-----|
| D-UAT1 | Nhóm 1: BM.07.02, BM.07.03 + đối chiếu VST | Khoa/KSNK xác nhận wording + `la_then_chot` |
| D-UAT2 | Nhóm 2: BM.08.01, BM.09.01 | ditto |
| D-UAT3 | Nhóm 3: bundles CLABSI/CAUTI/VAP/SSI | ditto |
| D-UAT4 | Chốt BM.QĐ.12.01 (lồng ấp): **giữ** hoặc **tắt `is_active`** | Quyết định PO ghi SSOT |
| D-fix | Chỉ sửa `tieu_chi_jsonb` qua `/quan-tri-he-thong/bang-kiem` (cổng A), từng mẫu | Diff theo mẫu; phiếu cũ giữ snapshot |

**Không** script đè 36 mẫu một lần.

### Phase E — Báo cáo kỳ & P×I×S (sau Done MVP, tuỳ Ban)

| Việc | Điều kiện mở | Ghi chú |
|------|--------------|---------|
| E1 | Mẫu in/PDF **1 trang** từ filter thống kê hiện có | Chỉ khi Ban yêu cầu giấy |
| E2 | P×I×S theo `bang-kiem-rui-ro-pis-feasibility-20260731.md` | Additive migrate; **không** đụng `tong_diem` phiên |
| E3 | Email tự động BM phản hồi | Ngoài phạm vi gần — không mở sớm |

---

## 4. Việc **không** làm (để giữ chính xác domain)

1. Gộp VST vào GSC hoặc một «super form».  
2. Hồi EAV / RCA ticket / Phần 3–4 trên form.  
3. Đổi engine chấm điểm phiên «cho giống JCI essay».  
4. Seed lại từ `master-bangkiem` / >36 mẫu.  
5. Dùng CCS làm KPI điều hành.  
6. Sửa hàng loạt tiêu chí không qua UAT.  
7. Cloud/Cursor đọc CDC dài — domain do Grok chốt bullet ngắn nếu cần handoff.

---

## 5. Freeze 2 tuần (sau khi Nghĩa chốt plan)

Trong cửa sổ đóng MVP:

- Không PR «strategic mới», không RPC analytics mới, không P×I×S.  
- Chỉ: Phase B (IA), Phase C (verify), Phase D (nội dung từng mẫu đã UAT).  
- Bug blocking nhập/lưu/in/% sai → sửa ngay (hotfix), ghi rõ ngoài freeze.

---

## 6. Phân công RACI (khớp BV103 Lead)

| Phase | Grok | Cursor | Nghĩa |
|-------|:----:|:------:|:-----:|
| A docs / chốt Done | R | — | **A** |
| B IA thống kê (≤5 file) | **R** mặc định | chỉ nếu «dùng Cursor» / >5 file | UAT nhìn |
| C pilot số liệu | C (checklist) | — | **R** chạy tay |
| D UAT nội dung | C (ghi nhận lệch) | — | **R** + Khoa |
| E báo cáo/P×I×S | C đề xuất | R nếu lát lớn | **A** mở phase |
| Commit/push/Vercel | C | C | **A** + lệnh |

---

## 7. Thứ tự triển khai đề xuất (sau «Chốt plan»)

```text
Ngày 0   Nghĩa: «Chốt kế hoạch GSC» (+ có/không làm B ẩn Nâng cao)
Ngày 0–1 Phase A (docs)
Ngày 1–2 Phase B (IA) → Nghĩa nhìn /thong-ke
Ngày 2–3 Phase C pilot tay → ghi PASS/FAIL
Tuần 2+  Phase D từng nhóm mẫu
Sau Done Phase E khi Ban yêu cầu
```

### Lệnh tắt Nghĩa

| Nói | Grok làm |
|-----|----------|
| «Chốt kế hoạch GSC» | Khóa Done MVP + bắt đầu A→B |
| «làm đơn giản UI thống kê» | Phase B local |
| «chạy pilot» | Đưa checklist + hỗ trợ ghi nhận |
| «UAT nhóm BM.07» | Soát tiêu chí + đề xuất sửa MDM |
| «tắt BM.QĐ.12.01» | Đổi active / ghi SSOT (≤ vài file) |
| «commit» | Chỉ khi có lệnh |

---

## 8. Tiêu chí chấp nhận tổng (Definition of Ready → Done)

**Ready để gọi là chuẩn mực vận hành**

- [ ] Done MVP (mục 0) được Nghĩa chốt  
- [ ] Pilot G1–V3 PASS  
- [ ] Tầng 1 UI rõ; Tầng 3 không chắn đường GSV  
- [ ] % form = in = thống kê (C1–C2)  
- [ ] Không còn dùng docs legacy làm SSOT  

**Ready để gọi là chuẩn mực nội dung**

- [ ] Ít nhất nhóm D-UAT1 PASS  
- [ ] BM.QĐ.12.01 đã chốt giữ/tắt  

**Ready điều hành năm (sau)**

- [ ] E1 hoặc E2 theo nhu cầu Ban  

---

## 9. Rủi ro & giảm rủi ro

| Rủi ro | Giảm |
|--------|------|
| Sợ «mất» TGS/strategic | Chỉ **thu** UI, không xóa RPC |
| Sửa IA làm vỡ filter mạng lưới | Giữ `khoaFilterLocked` / scope viewer |
| UAT kéo dài → lại thêm feature | Freeze mục 5 |
| Nhầm % nhật ký vào tuân thủ | Giữ D6; test `?loai=` |

---

## 10. Tóm tắt một trang cho Nghĩa

1. **Không xây lại** module — **khóa MVP + giấu phần thừa + UAT nội dung**.  
2. Domain giữ nguyên VST WHO + GSC snapshot + % đúng spec.  
3. Phase B làm module **trông đơn giản**; Phase C chứng minh **số đúng**; Phase D làm **câu chữ đúng**.  
4. P×I×S / báo cáo giấy Ban = sau Done.


---

## 11. Trạng thái đã khóa (2026-09-17)

### 11.0 H2 — Hợp nhất điều hành
- `/` → `/bao-cao-tong-hop`; bỏ nav Tổng quan / Việc hôm nay / decision queue UI.
- Brief CC không QLCV; TGS không deep-link Công việc.
- Công việc = module sidebar riêng.

### 11.1 P.A — IA thống kê
- `/thong-ke` = Tầng 3 (phân tích khoa); ModeNav = công tắc Nhập/Lịch sử/Thống kê.
- BCTH = Tầng 4 (in/điều hành); link 1 chiều «Chi tiết thống kê».
- GSC TGS chỉ trong «Nâng cao».

### 11.2 Phase C — % form = in = stats
- Code verify PASS (vitest). Báo cáo: `BV103-GSC-PHASE-C-DOI-CHIIEU-20260917.md`.
- Fix UI: TGS/BCTH KPI formatPercent đúng số chữ số.
- C4 pilot tay + UAT 1 phiếu: **Chờ Nghĩa**.
- SQL `ROUND(...,1)` GSC RPC: ghi nhận, chưa migrate.

### 11.3 Cleanup wave
- Xóa dead CC page + decision-queue-signals action; không export `computeCcs`.
- Charts GSC ưu tiên counts qua `gscTyLeFromMatrixCounts`.
- Chi tiết: `BV103-CLEANUP-WAVE-20260917.md`.

### 11.4 Wave tiếp (đang làm)
- Dedup plan (file này); gỡ component CC không import; siết format % BCTH dimension/topic.
