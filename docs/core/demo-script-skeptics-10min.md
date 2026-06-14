# Demo script 10 phút — đối thoại với skeptic

> Runbook vận hành cho người trình bày. Không phải slide marketing. Đọc trước: [`architecture-one-pager.md`](./architecture-one-pager.md).

---

## 1. Mục tiêu demo

| | |
|---|---|
| **Thời lượng** | 10 phút (+ 30 giây bonus tuỳ chọn) |
| **Đối tượng** | Đội đã phê bình dự án — cần bằng chứng vận hành, không lời hứa |
| **Thông điệp cốt lõi** | W1 pilot có gate kỹ thuật; nghiệp vụ KSNK thật (VST/GSC/QLCV); dữ liệu MDM nối analytics gap TGS vs KSNK |
| **Không hứa** | CSSD/NKBV/Dashboard đầy đủ trên prod W1; pentest-ready; RLS cứng trên mọi `gstt_fact_*` |

---

## 2. Chuẩn bị trước demo

### Môi trường

| Ưu tiên | Cấu hình | Lý do |
|---------|----------|-------|
| **Khuyến nghị** | Staging **không** set `KSNK_PILOT_CORE_MODULES` | Sidebar đủ nhóm Điều hành; `/` và `/bao-cao-tong-hop` mở — counter-point C trọn vẹn |
| **W1 prod-like** | `KSNK_PILOT_CORE_MODULES=1` | Chỉ MDM + GSC/VST + QLCV; sidebar ẩn Dashboard/NKBV/CSSD; `/bao-cao-tong-hop` → 404 |

Wave rollout: [`pilot-core-modules-go-live.md`](./pilot-core-modules-go-live.md) · [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md).

### Tài khoản

- **Presenter:** admin hoặc role KSNK toàn viện — thấy đủ menu và filter khoa.
- **RBAC (tuỳ chọn, 30 giây):** tài khoản gắn một khoa — khi vào analytics sẽ thấy banner scope (`AnalyticsKhoaScopeBanner`).
- Auth phải link `mdm_nhan_su`: `npm run trial:auth:precheck` → `mdm_email_no_auth = 0`.

### Terminal (tab riêng, sẵn sàng)

```bash
cd /path/to/ksnk_bv103
npm run pilot:go-live:gate          # linked staging/prod
# hoặc local:
npm run pilot:go-live:gate:local
```

### Dữ liệu tối thiểu

- ≥1 bảng kiểm GSC có `ap_dung_jsonb` (khoa + tần suất TGS) tại `/quan-tri-he-thong/bang-kiem`.
- ≥1 phiên VST và ≥1 phiên GSC trong kỳ lọc (mặc định ~30 ngày) — nếu không có, nói thẳng «chưa đủ điều kiện đối soát», không bịa số.

### Pilot flag — ghi nhớ nhanh

| `KSNK_PILOT_CORE_MODULES=1` | Hành vi |
|-----------------------------|---------|
| Sidebar ẩn | Trung tâm điều hành, Báo cáo tổng hợp, NKBV, toàn CSSD |
| Route 404 | `/bao-cao-tong-hop`, `/giam-sat-nkbv`, `/cssd-*` |
| Vẫn mở | `/`, `/giam-sat-vst`, `/giam-sat-chung`, `/quan-ly-cong-viec`, `/quan-tri-he-thong`, `/thong-ke/*` |

---

## 3. Timeline phút-by-phút

### 0–2 phút — Khung tin cậy (gate, không slide)

| | |
|---|---|
| **SHOW** | Tab terminal: `npm run pilot:go-live:gate` (hoặc kết quả đã chạy sẵn); mở [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) §A |
| **SAY** | «Trước go-live W1, IT chạy gate tự động: engineering contract, smoke GSC/VST, auth precheck. Đây là checklist ký tay song song — không phải demo tự chấm.» |
| **SAY** | «Prod W1 chỉ mở 3 khối: Quản trị, Giám sát VST/GSC, QLCV. CSSD và NKBV là wave 2–3 — tôi không che giấu phạm vi.» |

*Không chạy gate live nếu mạng chậm — chỉ show log pass đã lưu.*

---

### 2–5 phút — MDM → nguồn sự thật bảng kiểm

| | |
|---|---|
| **Route** | `/quan-tri-he-thong/bang-kiem` |
| **SHOW** | Mở một bảng kiểm GSC; phần **Áp dụng** (`ap_dung_jsonb`): khoa bắt buộc, tần suất TGS, preview |
| **SAY** | «Form giám sát không hard-code trong code. KSNK cấu hình bảng kiểm + áp dụng theo khoa; GSC đọc cấu hình này để sinh phiên và analytics nghĩa vụ TGS.» |
| **Không vào** | `/quan-tri-he-thong?tab=dm_registry`, danh mục dụng cụ/hóa chất — rabbit hole admin |

---

### 5–8 phút — Vận hành lâm sàng: VST + GSC

**VST (~2 phút)**

| | |
|---|---|
| **Route** | `/giam-sat-vst` |
| **SHOW** | Form WHO 5 moments; (nếu có) lịch sử phiên gần nhất |
| **SAY** | «VST theo chuẩn WHO, scoring tự động. Mất mạng hành lang: phiên vào hàng đợi localStorage, đồng bộ khi có mạng — không mất quan sát.» |
| **SAY** | «Quyền theo RBAC server action — không phải ai cũng sửa được mọi khoa.» |

**GSC (~1 phút)**

| | |
|---|---|
| **Route** | `/giam-sat-chung/tuan-thu` (hoặc `/giam-sat-chung` nếu cần ngắn) |
| **SHOW** | Checklist động từ bảng kiểm vừa mở; một tiêu chí đã chấm |
| **SAY** | «Cùng một bảng kiểm MDM → checklist runtime. Tuân thủ / Nhật ký / Hệ thống là route riêng: `/giam-sat-chung/tuan-thu`, `/nhat-ky`, `/he-thong`.» |

---

### 8–10 phút — Điều hành: gap TGS vs KSNK + QLCV

**Command Center (~1,5 phút)**

| | |
|---|---|
| **Route** | `/` |
| **SHOW** | Khối **Việc cần làm hôm nay** (`CommandCenterQuickActions`); KPI workload; khối **Cảnh báo chênh lệch TGS vs KSNK** (top 3 nếu có gap, hoặc giải thích «chưa đủ điều kiện» / «trong ngưỡng») |
| **SAY** | «Đây là tóm tắt vận hành ngày — không thay báo cáo kỳ chính thức. Gap chỉ hiện khi khoa đủ cả TGS và KSNK trong kỳ; hệ thống không bịa Δ%.» |
| **Deep link (nếu còn giây)** | `/thong-ke/gsc?view=bk-toi` — tab **BK tôi phải TGS** |

**QLCV (~30 giây)**

| | |
|---|---|
| **Route** | `/quan-ly-cong-viec` |
| **SHOW** | Kanban / phiếu được giao |
| **SAY** | «QLCV gắn checklist RPC và spawn định kỳ — cùng gate pilot W1, không module rời.» |

**Chốt**

| | |
|---|---|
| **SAY** | «Ba điểm các anh chê: không có gate → có `pilot:go-live:gate`; VST chỉ web → có offline queue + RBAC; MDM tách rời → `ap_dung_jsonb` nối thẳng analytics TGS. Phần còn lại là wave 2–3, có checklist riêng.» |

---

## 4. Ba counter-demo talking points (script câu)

### A. Pilot có gate — không «ship tay»

> «Go-live W1 yêu cầu `npm run pilot:go-live:gate` pass và NV KSNK ký ≥5/6 kịch bản mỗi khối. File ký: `pilot-go-live-signoff-202606.md`. Nếu gate đỏ, chúng tôi không lên prod — đây là rào kỹ thuật, không phải slide.»

Runbook terminal chi tiết (Tier 1–3, kịch bản nói): [`demo-governance-gates.md`](./demo-governance-gates.md).

### B. VST offline + RBAC — không chỉ CRUD form

> «Điểm khác biệt là phiên WHO ngoại tuyến: quan sát lưu hàng đợi client, sync khi có mạng. Quyền ghi theo `verifyPermission` trên server — user khoa chỉ thấy scope khoa mình. RLS một số bảng `gstt_fact_*` còn permissive; lớp app là chính cho W1 — đã ghi trong architecture one-pager, không giấu.»

### C. MDM bảng kiểm → GSC → gap TGS vs KSNK

> «Trên `/quan-tri-he-thong/bang-kiem` chúng tôi gắn áp dụng TGS theo khoa. GSC chạy phiên từ cấu hình đó. Command Center `/` và `/thong-ke/gsc` đọc RPC analytics — so sánh TGS vs KSNK chỉ khi đủ hai nguồn; khoa thiếu TGS vào bảng «Chưa đủ điều kiện đối soát», không ép vẽ gap giả.»

---

## 5. Tránh

| Tránh | Vì sao |
|-------|--------|
| Route ẩn khi `KSNK_PILOT_CORE_MODULES=1`: `/bao-cao-tong-hop`, `/giam-sat-nkbv`, `/cssd-*` | 404 hoặc sidebar không có — skeptic sẽ nói «hứa nhưng không mở» |
| Admin DM sâu: lookup registry, master dụng cụ/thiết bị | Không phục vụ counter-demo; tốn thời gian |
| Số KPI, badge, «100%», «AI» không có trong UI | Chỉ đọc số thật trên màn hình |
| Hứa pentest / RLS hoàn chỉnh mọi bảng | Pilot gaps đã document — nói Phase 1 hardening |
| In báo cáo từ Command Center | UI ghi rõ: in từ `/bao-cao-tong-hop` |

---

## 6. Fallback

| Tình huống | Xử lý |
|------------|--------|
| **Mạng chậm / Recharts treo** | Bỏ `/thong-ke/*`; giữ `/giam-sat-vst`, `/giam-sat-chung/tuan-thu`, `/quan-tri-he-thong/bang-kiem` (form tĩnh) |
| **Sidebar thiếu Dashboard** | Flag W1 đang bật — vào thẳng `/` hoặc giải thích wave; analytics đầy đủ: `/thong-ke/gsc` |
| **Không có gap / KPI N/A** | Nói: «Chưa đủ phiên TGS hoặc KSNK trong kỳ lọc» — show bảng loại trừ trên `/thong-ke/gsc` |
| **Gate terminal fail** | Không bào chữa live; mở sign-off + architecture one-pager §6; hẹn chạy lại sau |
| **User không đăng nhập** | Dừng demo — auth là phần của RBAC story |

---

## 7. Bonus 30 giây (tuỳ chọn)

**In báo cáo kỳ (tuỳ chọn thêm ~30 giây):** nếu staging mở `/bao-cao-tong-hop`, nhập «Nhận xét đánh giá» + «Kiến nghị đề xuất» rồi bấm **In báo cáo A4** — bản in có bìa kỳ/phạm vi, bảng CCS đầy đủ và Phần III ký tên (không in từ Command Center).

```bash
npm run layout:drift-check
```

**SAY:** «UI không phải theme tự do — có gate drift layout/typography trong CI, cùng pipeline với `verify:engineering`.»

---

## 8. Liên kết nhanh

| Tài liệu / lệnh | Đường dẫn |
|-----------------|-----------|
| Kiến trúc one-pager | [`architecture-one-pager.md`](./architecture-one-pager.md) |
| Ký go-live | [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) |
| Pilot 3 module | [`pilot-core-modules-go-live.md`](./pilot-core-modules-go-live.md) |
| Verify đầy đủ | `npm run verify` |
| Engineering contract | `npm run verify:engineering` |
| Gate go-live | `npm run pilot:go-live:gate` |
| Demo terminal gates | [`demo-governance-gates.md`](./demo-governance-gates.md) |

---

*Bản runbook này bám route thực trong `src/lib/nav/sidebar-nav-groups.ts` và phạm vi `src/lib/ksnk-pilot-core-modules-scope.ts` — cập nhật khi đổi menu hoặc wave pilot.*
