> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../../reference/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Kế hoạch đợt sau (Batch 6+) — sau Batches 1–5

> Lập 2026-09-07 · Local only · Chưa triển khai code trong file này.  
> Nguồn: `_agent-perf-fix-progress-20260907.md` (residual) + `_agent-whole-app-complexity-perf-20260907.md`.

## Đã xong (nhắc ngắn)

| Đợt | Việc |
|-----|------|
| 1–2 | Phân trang dữ liệu nóng (Bộ, catalog, kho, master, NKBV đọc) |
| 3–5 | Tách code UI nặng (NKBV panel, sự cố CSSD, in báo cáo) |

**Nguyên tắc giữ nguyên:** một việc = một bề mặt; list = server + trang; không rewrite; không commit/push đến khi bạn ra lệnh.

---

## Mục tiêu đợt sau

1. Xử lý **nợ cần DB/RPC** (đúng số liệu toàn cục, không chỉ cửa sổ 50 dòng).  
2. Cắt **payload còn sót** (Kanban QLCV, bank lớn).  
3. Giảm **phí đổi trang** (shell quyền mỏng) — ảnh hưởng cả app.  
4. Siết **IA chồng cửa** (ít đụng code nặng, nhiều nhận thức).

---

## Batch 6 — Dữ liệu đúng số (schema / RPC) · ~3–5 ngày

| # | Việc | Vì sao | Cách làm | Rủi ro | Done khi |
|---|------|--------|----------|--------|----------|
| 6.1 | **Kho: đếm theo trạm toàn cục** | Dashboard đang đếm trong trang ≤50 | Migration: view hoặc RPC `count` theo trạm/FEFO; FE chỉ gọi count, list vẫn page | Cần migrate Supabase | Chip kho = số thật toàn kho |
| 6.2 | **NKBV «chưa phân tích»** | Cap 1500 có thể sót | View/RPC: XN dương chưa gắn sự kiện; FE bỏ scan 1500 | Domain nhạy | Filter «chưa PT» đủ, có test |
| 6.3 | **(Tuỳ chọn) NV rollup %** | Cap 500 task/trang | RPC aggregate `%` theo `nhiem_vu_id` | Thấp | % đúng dù NV nhiều CV |

**Cổng kiểm:** migration trên staging/prod khi bạn cho phép; tsc + vitest domain; smoke 3 màn kho / NKBV / QLCV.

**Không làm trong 6:** viết lại Kanban, đổi SSR dashboard.

---

## Batch 7 — Payload sót (chỉ FE/query) · ~2–4 ngày

| # | Việc | Cách làm | Done khi |
|---|------|----------|----------|
| 7.1 | **QLCV Kanban** (board tới ~10k) | Đo trước; page/virtual theo cột trạng thái; không dump 500×20 nếu không cần | Mở board < N giây ổn định; có thanh trang hoặc «tải thêm» |
| 7.2 | **Đào tạo bank >2000** | Cursor/keyset export-import; scan soft-delete theo chủ đề có continuation | Export lớn không cắt im lặng |
| 7.3 | **BOM `boOptions` = trang hiện tại** (residual Batch 1) | Typeahead server khi đổi bộ trong form chi tiết | Chọn bộ ngoài trang vẫn được |
| 7.4 | **GSC form** (hook ~655) | Lazy options / tách sync template khỏi first paint | Mở form tuân thủ nhẹ hơn (đo trước/sau) |

---

## Batch 8 — Shell đổi trang · ~1 tuần (cẩn thận)

| # | Việc | Cách làm | Done khi |
|---|------|----------|----------|
| 8.1 | **RBAC hydrate mỏng** | PermissionProvider chỉ nạp quyền module đang vào; cache session | Đổi route không chờ full matrix |
| 8.2 | **Offline listener theo vùng** | Chỉ gắn trên giám sát/CSSD cần offline, không mọi trang | Trang quản trị/login không trả phí offline |
| 8.3 | **SSR-safe shell thử nghiệm** (sau 8.1) | Thử 1 route báo cáo/đọc với shell RSC; **không** lật cả `/` | Có spike doc; quyết định giữ/bỏ |

---

## Batch 9 — IA / cửa vào (song song hoặc sau 6) · ~2–3 ngày

| # | Việc | Ghi chú |
|---|------|---------|
| 9.1 | Khóa copy menu: Vận hành / Tra cứu / Sửa danh mục | Đúng north star; ít code |
| 9.2 | Hub «Quản lý dụng cụ» mặc định tab **Loại** (nếu bạn chốt) | 1 dòng path |
| 9.3 | Ẩn/redirect lối legacy còn gây nhầm | `cssd-erp` đã redirect — rà bookmark khác |
| 9.4 | Đăng ký nợ còn lại vào `debt-register` | Tránh mất dấu |

---

## Thứ tự khuyến nghị

```
Bạn F5 thử Batches 1–5
        ↓
Batch 6 (RPC kho + chưa PT)  ← ưu tiên nếu số liệu «sai/thiếu» khó chịu
        ↓
Batch 7 (Kanban + bank + BOM typeahead + GSC)
        ↓
Batch 8 (shell RBAC)         ← lợi ích lớn, rủi ro cao hơn → làm khi 6–7 ổn
        ↓
Batch 9 (IA)                 ← có thể xen sớm nếu menu vẫn rối
```

**Không làm:** rewrite Next; thêm framework; commit/push khi chưa lệnh; cắt lung tung Kanban trước khi đo.

---

## Tiêu chí «đợt sau xong» (định lượng gợi ý)

- Mở `/cssd-dung-cu`, QT Bộ, kho, NKBV cases, QLCV NV, NHCH: payload JSON lần đầu **≪** trước Batch 1 (ghi số đo vào progress).  
- Kho chip = count toàn cục (sau 6.1).  
- «Chưa PT» không phụ thuộc cap 1500 (sau 6.2).  
- Đổi 5 route liên tiếp: không spinner quyền dài (sau 8.1).

---

## Việc cần bạn chốt trước khi code

1. **Ưu tiên Batch 6 (DB)** hay **Batch 7 (FE)** hay **Batch 9 (menu)** trước?  
2. Cho phép **apply migration** Supabase cho 6.1/6.2 khi tới lúc, hay chỉ soạn SQL local trước?  
3. Hub dụng cụ mặc định vào **Loại** hay giữ **Bộ**?
