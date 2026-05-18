# EXECUTION ROADMAP — KSNK BV103 (điều hành theo mảnh)

> **Cập nhật:** 14/05/2026  
> **Mục tiêu tài liệu:** Một trang để team/AI biết **làm gì trước**, **thế nào là xong một mảnh**, tránh loay hoay nhiều hướng cùng lúc.  
> **Chuẩn cao nhất:** [`AGENTS.md`](./AGENTS.md) — ưu tiên **luồng nghiệp vụ ổn định + dữ liệu khớp DB** trước polish / tối ưu rộng.

---

## 1) Định hướng đã chỉnh (so với bản cũ)

| Trước (dễ kẹt) | Nay (đúng hướng ship) |
|----------------|------------------------|
| “Pre-P0 full audit + refactor” xong mới làm P0 | **Không** chặn toàn bộ dự án bởi audit. Audit/refactor **theo đúng mảnh đang ship**, khi chạm file đó. |
| Nhiều P0 CSSD song song với dashboard / RPC | **Một “mảnh đang active”** tại một thời điểm; các mảnh khác chỉ **bảo trì / bugfix**. |
| KPI “milestone 90%/tuần” chung chung | KPI theo **mảnh**: mỗi 1–2 tuần có **bản dùng thử được** (demo + 3 kịch bản tay). |

---

## 2) Luồng làm việc chuẩn — **hoàn thiện từng mảnh một**

### 2.1 Chọn mảnh (Module slice)

Mỗi “mảnh” = một bounded context có người dùng cuối rõ: ví dụ *VST nhập phiên + lịch sử*, *Giám sát chung 1 bảng kiểm*, *CSSD 1 trạm*, *Dashboard chỉ huy chỉ VST+GSC*, v.v.

**Quy tắc:** Tuần đang làm chỉ gắn **một** mã mảnh trong backlog (ví dụ `ACTIVE: VST_PILOT` hoặc `ACTIVE: CSSD_QR_LABEL`).

### 2.2 Định nghĩa “xong mảnh” (Pilot DoD — bắt buộc viết trước khi code)

Một mảnh coi là **hoàn thành pilot** khi có đủ 5 dòng sau (copy vào issue/PR):

1. **Ai dùng:** khoa / vai trò (cụ thể).  
2. **Môi trường:** local / staging / production.  
3. **3 kịch bản tay:** (vd) tạo phiên → lưu → xem lại; sửa; xóa mềm nếu có.  
4. **Dữ liệu:** migration/RPC cần cho luồng đó đã **apply đúng DB** của môi trường pilot.  
5. **Build:** `npm run build` hoặc `verify:engineering` theo rule repo cho phạm vi thay đổi.

Không có (1)–(4) thì **chưa gọi là sản phẩm**, dù code đã merge.

### 2.3 Thứ tự kỹ thuật trong một mảnh (Vertical slice)

Bám [`AGENTS.md`](./AGENTS.md) mục kỷ luật làm chắc + mapping:

1. **Types / contract** (input/output action, row DB liên quan).  
2. **Migration** (nếu đụng schema) — trong `supabase/migrations/`, đặt tên theo quy ước repo.  
3. **Server Action / RPC** — `verifyPermission` (hoặc gate tương đương), Zod ở ranh giới.  
4. **UI** — tối thiểu dùng được; mobile/polish sau.  
5. **Verify** — 3 kịch bản + build.

### 2.4 Refactor & audit

- **Cấm** “audit toàn repo” như một cửa ải trước khi ship mảnh nhỏ.  
- Refactor chỉ khi: (a) chạm file đó cho mảnh đang ship, hoặc (b) lỗi blocking / vi phạm boundary rõ (`AGENTS.md` + rule 10/20).  
- Bảng RF dưới đây dùng để **ghi nợ**, không dùng để chặn pilot.

---

## 3) Trạng thái thực tế repo (route đã có — 14/05/2026)

| Khu vực | Route / ghi chú | Mức độ (ước lượng) |
|---------|------------------|---------------------|
| Command Center / Dashboard | `/` | Có bộ lọc, VST + GSC payload, gap; phụ thuộc RPC/migration trên DB |
| Giám sát VST | `/giam-sat-vst`, `/giam-sat-vst/lich-su` | Luồng form + lịch sử; dashboard/KPI cần DB đồng bộ |
| Giám sát chung | `/giam-sat-chung` | Form + template; dashboard GSC theo `ma_bk` |
| Giám sát NKBV | `/giam-sat-nkbv` | Trang module (MVP / mở rộng theo spec) |
| CSSD ERP | `/cssd-erp` + batch, catalog, inventory, report, kho-hoa-chat, equipment-maintenance | Nhiều trạm — nên ship **từng trạm hoặc từng luồng QR** |
| Quản trị | `/quan-tri-he-thong/*` (danh mục, bảng kiểm, nhân sự, tài khoản) | Nền MDM/danh mục |
| Quản lý công việc | `/quan-ly-cong-viec` | **QLCV nội bộ KSNK:** Kanban + bảng phân trang, chi tiết + timeline, đề xuất (Kanban), thống kê (server + pie client có disclaimer), KPI tháng + CSV, mẫu định kỳ + RPC spawn + **preview lịch** (`qlcv-dinh-ky-schedule.ts`). **Trạng thái DB (Track B):** `MOI`, `DANG_LAM`, `CHO_DUYET`, `HOAN_THANH`, `TU_CHOI`, `QUA_HAN`, `DA_HUY` — báo cáo 100% → `CHO_DUYET`. **Gate:** `verifyPermission` trên action. |
| Auth | `/login`, đổi mật khẩu | Chuẩn |

**Điểm nghẽn đã gặp thực tế:** `supabase db push` / migration history lệch remote; RPC mới cần apply bằng SQL Editor hoặc `db query --linked` khi CLI auth ổn — nên trong pilot luôn có mục **“DB môi trường pilot đã apply chưa”**.

---

## 4) Backlog theo mảnh (chọn **một** dòng ACTIVE mỗi 1–2 tuần)

Thứ tự dưới đây là **gợi ý ưu tiên nghiệp vụ KSNK** (có thể đổi nếu lãnh đạo chốt khác), không phải làm hết song song.

| ID | Mảnh (pilot gợi ý) | Kết quả nhìn thấy được | Ghi chú |
|----|-------------------|-------------------------|---------|
| **S1** | **VST end-to-end** | 1 khoa nhập phiên + xem dashboard chỉ huy VST đúng KPI trong 1 khoảng ngày | RPC/dashboard phụ thuộc DB |
| **S2** | **Giám sát chung — 1 bảng kiểm** | Chấm điểm + báo cáo theo bảng kiểm đó trên dashboard | Tránh mở cùng lúc mọi `ma_bk` |
| **S3** | **Dashboard chỉ huy** | Tab + bảng kiểm chọn lọc; GSC empty state rõ | Đã tách type client; multi-RPC cần DB |
| **S4** | **CSSD — nhãn QR + truy vết** (một luồng) | In nhãn 1 điểm + quét xem lịch sử tối thiểu | Chia nhỏ theo trạm nếu cần |
| **S5** | **CSSD — báo cáo ngày/tuần/tháng** | Một trang báo cáo dùng trong ca | Sau S4 hoặc song song nếu team 2 người |
| **S6** | **NKBV MVP** | Nhập/xem danh sách ca bệnh tối thiểu theo spec | Theo `docs/specs` |
| **S7** | **Công việc** | Giao việc → cập nhật → đóng trong pilot | **UI + luồng + gate action đã rebuild** (05/2026); **nhịp tiếp theo:** ghi DoD pilot (3 kịch bản + DB) và mở rộng tùy chọn (comment Pre-P0, …) |
| **S8** | **Import/export danh mục** | 1 template + 1 danh mục ưu tiên | Sau khi MDM ổn |

**Ô ACTIVE tuần này (cập nhật tay mỗi tuần):** `ACTIVE: _________` (vd `S1`).

---

## 5) Ưu tiên P0 / P1 / P2 (định nghĩa lại cho sát ship)

### P0 — “Dùng được trong thực tế pilot” (theo mảnh ACTIVE)

- Luồng chính của mảnh ACTIVE: không lỗi blocking; dữ liệu lưu/đọc đúng.  
- DB của môi trường pilot: migration/RPC **đã apply**.  
- Quyền: action ghi có gate (`verifyPermission` / tương đương).  
- `npm run build` (và `verify:engineering` khi đụng action/`fact_*`).

### P1 — Ngay sau pilot cùng mảnh

- Báo cáo / export tối thiểu cho mảnh đó.  
- Mở rộng bộ lọc hoặc thêm 1 bảng kiểm / 1 trạm **cùng kiến trúc**, không mở module mới.

### P2 — Sau khi 2–3 mảnh đã pilot

- Dashboard cảnh báo, tối ưu mobile sâu, tự động hóa báo cáo định kỳ.  
- Refactor rộng chỉ khi có pain đo được hoặc sau khi có người dùng thật.

---

## 6) Milestone theo nhịp 2 tuần (thay vì “4 tuần CSSD-only”)

| Nhịp | Mục tiêu |
|------|---------|
| **Nhịp A** | Chốt `ACTIVE`, viết Pilot DoD (mục 2.2), ship khung + 3 kịch bản. |
| **Nhịp B** | Báo cáo/export tối thiểu + hardening quyền/log cho **cùng** mảnh. |
| **Nhịp C** | Chuyển `ACTIVE` sang mảnh tiếp theo; mảnh cũ chỉ bugfix. |

Lặp A→B→C. Không bắt buộc tuần 1–4 chỉ CSSD trừ khi `ACTIVE` là CSSD.

---

## 7) KPI hằng tuần (đơn giản, đo được)

| KPI | Cách đo |
|-----|---------|
| **1 pilot có DoD** | Checklist 2.2 tick đủ |
| **Build xanh** | `npm run build` trên nhánh release pilot |
| **DB đồng bộ pilot** | Ghi nhận: đã chạy migration/SQL nào trên DB nào (tên + ngày) |
| **Không mở mảnh thứ 2** | Chỉ một `ACTIVE` trên backlog mục 4 |

(Bỏ KPI kiểu “90% milestone chung” nếu không gắn mảnh — dễ ảo.)

---

## 8) Definition of Done theo module (giữ ý chính, rút gọn)

- **CSSD:** Một luồng QR (in → quét → lịch sử) chạy được trên pilot; báo cáo cơ bản sau hoặc cùng nhịp B.  
- **VST:** Session + quan sát + dashboard/RPC khớp dữ liệu pilot.  
- **Giám sát chung:** 1 template + chấm + tổng hợp đúng `ma_bk`.  
- **Dashboard:** Bộ lọc + hiển thị theo bảng kiểm; không phụ thuộc RPC chưa deploy mà không có fallback/empty state.  
- **Công việc:** Luồng đề xuất → phê duyệt → Kanban/bảng → chi tiết (tiến độ, nhận việc, nghiệm thu) + định kỳ/RPC + preview lịch; CRUD & đọc qua `cong-viec.actions`, nhận việc/gia hạn `cong-viec-write.actions`; báo cáo 100% → **`CHO_DUYET`** (Track B). **Chốt pilot:** DoD + DB.
- **Quản trị:** CRUD + quyền + import tối thiểu theo pilot.

Chi tiết mapping DB/UI: [`docs/specs/10-bv103-implementation-mapping.md`](./docs/specs/10-bv103-implementation-mapping.md).

---

## 9) Refactor backlog (ghi nợ — **không** chặn pilot)

| ID | Khu vực | Khi nào làm |
|----|---------|----------------|
| RF-001 | CSSD — tách hook / action dài | Khi ship S4/S5 chạm file đó |
| RF-002 | Dashboard — tách payload builder | Khi S3 ổn định |
| RF-003 | Shared hooks giám sát | Khi trùng logic VST/GSC 2 nơi |
| RF-004 | Permission audit theo module | Theo [`SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](./docs/specs/working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md) từng PR |
| RF-005 | Import/export | Theo S8 |
| RF-006 | QLCV — (đã xử lý) gate action + gộp write; còn theo dõi PR nếu mở rộng comment/bình luận theo Pre-P0 | Đóng khi S7 pilot ghi nhận |

---

## 10) Quy tắc vận hành hằng ngày (Team / AI)

0. Một trang thực thi: [`docs/specs/working/LEAN_EXECUTION_BV103.md`](./docs/specs/working/LEAN_EXECUTION_BV103.md) + [`AGENTS.md`](./AGENTS.md).  
1. Đọc tối thiểu theo loại thay đổi: [`docs/specs/READ_MINIMUM_BY_CHANGE.md`](./docs/specs/READ_MINIMUM_BY_CHANGE.md).  
2. Mỗi PR gắn **một** mảnh (`S1`…`S8` hoặc tên tùy chỉnh).  
3. Cuối ngày 3 dòng: đã làm / vướng DB hay quyền / bước mai.  
4. Không thêm tính năng ngoài `ACTIVE` nếu chưa đóng DoD nhịp hiện tại.  
5. Polish UI / mobile: sau khi pilot DoD xanh.

---

**Tóm tắt một dòng:** Chọn **một mảnh ACTIVE**, viết **Pilot DoD**, làm **vertical slice** (types → migration → action → UI → verify), **apply DB pilot**, demo 3 kịch bản — rồi mới chuyển mảnh; không audit toàn repo làm cửa chính.
