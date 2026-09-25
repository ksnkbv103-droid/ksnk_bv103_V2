# Đề xuất đơn giản hóa QLCV — assignee-first · 2026-09-25

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1 · chờ Nghĩa chốt A/B |
| Repo tip | `cursor/me-sync-recall-print` @ `42c0115` (2026-09-25 14:18 +07) |
| Phạm vi | **Phân tích + đề xuất ONLY** — không đổi `src/`, không migrate, không push |
| Neo | `docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md` · `_audit-qlcv-2026-09-25.md` · form/list/kanban tip |
| Tone | Quản trị khoa KSNK — rõ · gọn · quan sát được |

---

## 0. Vấn đề Nghĩa nêu (tóm tắt)

QLCV hiện **khó nhìn ai làm chính vs ai phối hợp**; form còn trường «vị trí / địa điểm» gây cảm giác bắt buộc; muốn module **quản việc đơn giản**: biết người làm · tiến độ · hạn · thống kê cơ bản (số việc · % hoàn thành · % quá hạn). Không phức tạp.

---

## 1. Hiện trạng tip (đọc code + SSOT — không sửa)

### 1.1 Entity / bảng

| Đối tượng | Bảng / view | Ghi chú |
|-----------|-------------|---------|
| Công việc | `qlcv_fact_cong_viec` · `v_qlcv_cong_viec_full` | Fact chính |
| Mẫu định kỳ | `qlcv_fact_cong_viec_dinh_ky` | Spawn instance |
| Nhiệm vụ | `qlcv_fact_nhiem_vu` | FK tùy chọn — tab IA chìm |
| RPC | `fn_qlcv_transition` · `fn_qlcv_update_checklist` · spawn · overdue | Giữ |

### 1.2 Vai trò người (RACI as-built)

| Vai trò | Cột / cơ chế | RACI |
|---------|--------------|------|
| Người giao | `nguoi_giao_viec_id` | A (giao) |
| **Người phụ trách** | `nguoi_phu_trach_id` (**1**) | **R** |
| Phối hợp | `nguoi_phoi_hop_ids[]` | C |
| Theo dõi | `nguoi_theo_doi_ids[]` | I |
| Người duyệt | Actor trong `nhat_ky` + RBAC APPROVE | A (nghiệm thu) |
| Tổ | `to_cong_tac_id` | Nhóm — **không** thay phụ trách cá nhân |

### 1.3 Trường bắt buộc khi tạo (FE tip)

| Trường | Bắt buộc? | Evidence |
|--------|-----------|----------|
| `tieu_de` | **Có** | `required` + Zod min(1) |
| `nguoi_phu_trach_id` | **Có khi tạo** | Toast «Chọn người phụ trách…» (`CongViecForm.tsx`) |
| `dia_diem_khoa_id` (Khoa / đơn vị địa điểm) | **Có** | Label `*` + Zod UUID bắt buộc + toast |
| `vi_tri_thuc_hien` (Vị trí chi tiết) | **Không** (đã «tuỳ chọn», nằm trong «Thêm chi tiết») | Form + Zod optional |
| `han_hoan_thanh` | **Không** trên form (domain SSOT: bắt buộc DOT_XUAT/KHAN_CAP — Q-04) | Form optional |
| Phối hợp / theo dõi / tổ / nhiệm vụ / ưu tiên / mô tả | Không | «Thêm chi tiết» |

> **Lệch cảm nhận «vị trí»:** người dùng có thể gọi «vị trí» cho cả **địa điểm khoa** (đang bắt buộc). Đề xuất dưới đây nới **cả địa điểm** về tùy chọn FE, giữ cột DB.

### 1.4 Trạng thái · tab · thống kê · UI người

| Khía cạnh | Hiện trạng | Vấn đề quan sát |
|-----------|------------|-----------------|
| Trạng thái | 7 mã: `MOI` · `DANG_LAM` · `CHO_DUYET` · `HOAN_THANH` · `TU_CHOI` · `QUA_HAN` · `DA_HUY` + đề xuất ảo (`is_active=false`) | Đủ nghiệp vụ; hơi nhiều so với «lite» |
| Tabs | Điều hành · Định kỳ (+ Nhiệm vụ chìm «Kế hoạch năm») | IA lệch; không phải trọng tâm slice này |
| Stats | Gate chips: Của tôi / Cần làm / Quá hạn / Chờ tôi (RPC `rpc_qlcv_board_counts` + fallback) | **Thiếu** tổng · % HT · % quá hạn theo người/kỳ |
| List | Cột: Nhiệm vụ · Người giao · **Phụ trách** (text) · **C / I** (chuỗi rút gọn `C tên · I·n`) · Cổng · % · Hạn | Phụ trách ≠ chip nổi; C/I dễ lẫn / khó đọc nhanh |
| Kanban | «Phụ trách / Tổ» text · CI dòng phụ mờ | Không có avatar primary vs chip secondary |
| Detail | Label Phụ trách / Phối hợp / Theo dõi / Vị trí | Đủ nhưng list/board mới là bề mặt quan sát hàng ngày |

**Tóm tắt phức tạp:** mô hình người đã gần Asana (1 R + N C/I) nhưng **UI chưa assignee-first**; form còn **địa điểm bắt buộc**; thống kê chưa khớp nhu cầu lãnh đạo khoa.

---

## 2. Benchmark công cụ phổ biến (đã fetch)

Nguồn chính đã đọc (2026-09-25):

| Tool | URL đã fetch / dùng |
|------|---------------------|
| Asana | `https://asana.com/features/project-management/tasks` |
| Linear | `https://linear.app/docs/creating-issues` · `https://linear.app/docs/assigning-issues` |
| Todoist | SDK `AddTaskArgs` (content bắt buộc; assignee/due optional) · API overview |
| ClickUp | `https://developer.clickup.com/docs/tasks` · help required custom fields |
| Planner | Graph `plannerTask` · Support «Assign people to tasks» |
| Notion | Tổng hợp review 2026 (database properties tự định nghĩa) |

| Tool | Người chính | Cộng tác | Required tối thiểu | Tiến độ | Hạn | Stats kiểu lite |
|------|-------------|----------|--------------------|---------|-----|-----------------|
| **Asana** | **1 assignee** | Nhiều collaborators (theo dõi/comment) | Name; assignee & due **không** bắt buộc native | Complete / section / custom | Optional | My Tasks + project views |
| **Linear** | **1 assignee** | Subscribers | **Title + status + team** | Workflow status | Optional | Team/project views |
| **Todoist** | **1 assignee** (shared project) | Collaborators ở cấp project | **content** (tiêu đề) | Complete / incomplete (+ priority) | Optional | Today / filters / productivity |
| **Notion Tasks** | Person (thường 1+) | Mentions / share | **Tự cấu hình** — mặc định gần như không bắt buộc | Status property | Date optional | Views + rollup tự dựng |
| **ClickUp** | **Nhiều assignees** | Watchers | **name**; CF required tùy plan | Status + checklist | Optional | Dashboards (nặng hơn lite) |
| **MS Planner** | **Nhiều** (tới 11) | Cùng assignments | Title (+ plan/bucket) | `percentComplete` 0/50/100 | Optional | Board by progress / assigned |

**Bài học cho BV103:** đa số tool «sạch» chọn **một người chịu trách nhiệm chính** (Asana / Linear / Todoist). Multi-assignee ngang hàng (Planner / ClickUp) làm mờ «ai làm». Hạn hầu hết **optional** ở product consumer; org y tế thường muốn hạn với việc đột xuất/khẩn — khớp domain Q-04 hiện có.

---

## 3. Mô hình đích tối thiểu (đề xuất Lead = phương án **A**)

### 3.1 Entity

Một **Công việc** (`qlcv_fact_cong_viec`) — giữ vocabulary; không thêm entity người mới.

### 3.2 Người (assignee-first)

| Vai trò UI | Map cột | Bắt buộc | Hiển thị |
|------------|---------|----------|----------|
| **Người thực hiện** | `nguoi_phu_trach_id` | **Có** (tạo trực tiếp / sau phê đề xuất) | **Primary:** avatar lớn + tên đậm |
| **Phối hợp** | `nguoi_phoi_hop_ids[]` | Không | **Secondary chips** nhỏ, nhãn «PH» |
| **Theo dõi** | `nguoi_theo_doi_ids[]` | Không | Chip mờ «TD» hoặc chỉ trong detail |
| **Người giao** | `nguoi_giao_viec_id` | Tự ghi khi tạo | Meta nhỏ trên detail / list phụ |
| Duyệt | `nhat_ky` + APPROVE | Theo cổng | Giữ — không thêm cột (khớp AB-2A file 19) |

**Cấm UX:** coi tổ (`to_cong_tac_id`) như người thực hiện; không multi-R ngang hàng.

### 3.3 Trường — bắt buộc / tùy chọn / hạ cấp

| Nhóm | Trường | Đề xuất |
|------|--------|---------|
| **Bắt buộc** | Tiêu đề · Người thực hiện · Trạng thái (mặc định hệ thống) · Tiến độ (%/checklist — luôn có giá trị, có thể 0) | Giữ |
| **Hạn** | `han_hoan_thanh` | **A (khuyến nghị):** bắt buộc với `DOT_XUAT`/`KHAN_CAP`; định kỳ = hạn instance. **B:** luôn optional + cảnh báo mềm |
| **Hạ / optional FE** | `dia_diem_khoa_id` · `vi_tri_thuc_hien` · tổ · nhiệm vụ · ưu tiên · mô tả · loại (default Đột xuất) · theo dõi | Đưa hết vào «Thêm chi tiết»; **bỏ `*` và toast bắt buộc địa điểm** |
| **Giữ ẩn / sau** | analytics_meta · nhật ký · cổng nghiệm thu định kỳ vs đột xuất | Không đổi domain trong slice UX |

### 3.4 Stats MVP

Một dải / panel kỳ (tuần · tháng · quý):

1. **Tổng việc** (mở trong kỳ hoặc tạo trong kỳ — chốt OQ-1)
2. **% hoàn thành** = hoàn thành / tổng (cùng mẫu số)
3. **% quá hạn** = quá hạn (mã hoặc cờ `is_qua_han`) / việc mở hoặc / tổng — chốt OQ-2

Cắt thêm: **theo người thực hiện** (bảng nhỏ). Gate chips hiện tại giữ làm lọc nhanh cá nhân — không thay stats lãnh đạo.

### 3.5 UI list / kanban / detail

| Bề mặt | Người thực hiện | Phối hợp |
|--------|-----------------|----------|
| **List** | Cột «Thực hiện»: avatar + tên (bold); bỏ ngang hàng với C/I | Chips `PH` dưới hoặc cột hẹp; **đổi header «C / I» → «Phối hợp»** (I chỉ detail) |
| **Kanban** | Avatar góc thẻ + tên; bỏ nhãn mơ hồ «Phụ trách / Tổ» làm dòng chính | Hàng chip nhỏ dưới avatar; tổ chỉ tooltip |
| **Detail** | Khối «Người thực hiện» full-width trên cùng | Multi-select chips bên dưới; Theo dõi / Người giao trong meta |

Nguyên tắc UX principles §5: *Person · work · progress · responsibility* — nhìn list là biết **ai làm chính**.

### 3.6 Lập trường migration

| Cách | Nội dung | Khuyến nghị |
|------|----------|-------------|
| **FE-first (A)** | Giữ mọi cột DB; nới Zod/form (địa điểm optional); đổi copy/UI người; thêm stats panel đọc view/RPC hiện có | **Chọn** — không migrate slice này |
| DB-hard | DROP/NOT NULL đổi cột | **Không** — trái ràng buộc «no migrate»; dữ liệu/pilot vẫn cần cột |

Khi FE ổn định ≥1 sprint và PO xác nhận không dùng địa điểm → mới xét soft-hide cột trên form admin (vẫn giữ DB).

---

## 4. A/B để Nghĩa chốt (1 trang)

| # | Câu hỏi | **A — Lead khuyến nghị** | B |
|---|---------|--------------------------|---|
| **S-1** | Người làm | **1 Người thực hiện bắt buộc** + N Phối hợp chip | Multi-assignee ngang hàng (kiểu Planner) |
| **S-2** | Địa điểm / vị trí | **Cả hai optional FE**; vị trí giữ trong «Thêm chi tiết» | Giữ bắt buộc `dia_diem_khoa_id` |
| **S-3** | Hạn | **Bắt buộc DOT_XUAT/KHAN_CAP** (khớp file 19 Q-04 / AB-4A) | Luôn optional + soft-warn |
| **S-4** | Nhãn list C/I | **«Phối hợp» nổi; Theo dõi chỉ detail** | Giữ header «C / I» RACI |
| **S-5** | Stats MVP mẫu số | Tổng = việc **mở + đóng trong kỳ lọc** | Chỉ việc **tạo trong kỳ** |
| **S-6** | Phạm vi slice tiếp | **FE-only:** form optional địa điểm + UI assignee-first + panel 3 số | Kèm wire báo cáo SQL mới / đổi CHECK trạng thái |

**Nếu Nghĩa không trả lời:** Lead mặc định **A** cho mọi dòng (khớp file 19 §7).

---

## 5. Câu hỏi mở (OQ)

1. **OQ-1** Mẫu số «tổng việc» theo kỳ: việc còn mở tại cuối kỳ, hay việc có hoạt động/tạo trong kỳ?
2. **OQ-2** «% quá hạn»: trên việc đang mở, hay trên mọi việc trong kỳ (kể cả đã đóng đúng/trễ hạn)?
3. **OQ-3** Có giữ cổng nghiệm thu đột xuất (`CHO_DUYET`) trong MVP lite, hay rút còn Mở → Đang làm → Xong (định kỳ giữ auto-close)?
4. **OQ-4** Tab Nhiệm vụ / Định kỳ: giữ ngoài slice simplify, hay ẩn Nhiệm vụ khỏi IA đến khi cần?
5. **OQ-5** Copy «Người phụ trách» → «Người thực hiện» trên toàn module — đổi một lần?

---

## 6. Non-goals (slice này và đề xuất)

- Không push / Cloud / `apply_migration` / đổi app code trong commit đề xuất này.
- Không khôi phục KPI tháng, việc con, attachment, notification.
- Không giao việc ngoài KSNK; không embed tạo việc từ GSC (H2).
- Không DROP cột `vi_tri_thuc_hien` / `dia_diem_khoa_id` / mảng C/I.

---

## 7. Bước tiếp (sau khi Nghĩa chốt)

1. Slice FE mỏng: optional `dia_diem_khoa_id` + avatar người thực hiện trên list/kanban + đổi nhãn Phối hợp.
2. Panel stats 3 số (đọc view/RPC; FE aggregate tạm nếu thiếu SQL).
3. Cập nhật file 19 § form-required + UX principles một dòng «assignee-first».
4. UAT tay với 5–10 phiếu pilot.

---

*Lead executor · local Mac · 2026-09-25 Asia/Saigon · chỉ commit tài liệu này.*
