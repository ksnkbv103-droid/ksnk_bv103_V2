# Page Chrome Contract — BV103 (2026-07-31)

> SSOT lớp L1 dưới App Header. Dialect: [`design-dialect-matrix-20260731.md`](./design-dialect-matrix-20260731.md).  
> Primitive: `src/components/shared/KsnkPageChrome.tsx` · tokens `pageChromeShell*`.

## Stack cố định

| Lớp | Thành phần | Sticky? |
|-----|------------|---------|
| **L0** | App `Header` — zone + tên trang | Có |
| **L1** | **Một** `KsnkPageChrome` — title/actions · tabs · filters | Chỉ khi có filters (analytics) hoặc layout `/thong-ke` |
| **L2** | `KsnkContextBanner` (tuỳ chọn) | Không |
| **L3** | Nội dung | Không |

## Luật cứng

1. Tối đa **một** band L1 — hàng tên/nút (không hộp trắng); `pageChromeShell` chỉ gạch chân mỏng.
2. Thứ tự slot: Title+Actions → Tabs → Filters/Search (ô trống = bỏ).
3. Không lặp H1 lớn nếu App Header đã có tên trang — `showTitle` mặc định `false` + chỉ tabs/filters/actions. Không crumb zone «KSNK · …» / nhóm nav trên L0 hay L1.
4. Không sticky kép tiêu đề: App Header **hoặc** L1 filter band — `/thong-ke` gộp tab module + filter trong **một** sticky chrome.
5. Nút: `btnPrimary` / `btnSecondary` / ghost — `bv103-control-h`.
6. Nhịp dọc: `pageOuter` duy nhất (`pageOuterAnalytics` = alias cùng giá trị).
7. **Copy vận hành (bắt buộc):** tab/panel thao tác hàng ngày = **tên ngắn + nút**. Không đoạn giải thích nhiều câu, không “bảng chú giải” (= A · = B · = C), không bước 1–2–3 trên màn chính. Giải thích dài chỉ trong dialog xác nhận phá hủy / lỗi / empty state / tài liệu.
   - **Cấm (màn chính):** hero `description` glossary; `subtitle` dạy cả module; `noticeSlateRelaxed` intro panel.
   - **Được:** empty state 1 câu + tên nút; banner khóa/phạm vi/an toàn ≤ 1 vế; dialog phá hủy 1–2 vế hậu quả.
8. **Ops density (bắt buộc trên màn vận hành):**
   | Tình huống | Pattern | Cấm |
   |------------|---------|-----|
   | Chọn nhóm/loại (≤ 8) | Chip ngang `h-9` / `choiceBtn` (+ icon ≤14px) | Card `min-h` cao + subtitle; nhãn “Bước 1” khi không có bước 2/3 |
   | Danh sách thực thể | `AdvancedDataTable` + `bv103TableLayout` + QR thumb khi có mã | Grid card “poster” cho fleet |
   | KPI trên list Ops | Dải số 1 hàng (StatInline) | 3+ StatCard chiếm nửa viewport |
   | Nút chính/phụ | `btnPrimary` / `btnSecondary` / `btnPrimaryBlock` | `bg-red-600` / `h-16` / `shadow-lg` tùy hứng cho CTA thường |
   | Input/select | `bv103-control-h` + `controlInput` | `h-14` + `font-black` (trừ workstation quét đã ghi exception) |
   | Step thật (mẻ TK…) | Stepper chỉ khi ≥2 bước có trạng thái | “Bước 1” đơn lẻ trên form 1 trang |

## Slot Filters / Search (SSOT — scorecard 2026-08-03)

| Dialect | Luật |
|---------|------|
| **Analytics** | Chỉ `AnalyticsFilterBar` (= `DashboardFilterPanel`) trong slot Filters; URL `tu_ngay`/`den_ngay`/`khoa_ids`. CSSD report = thin adapter cùng height + SearchableSelect «trạm». NKBV thống kê = cùng slot + alias URL legacy. |
| **Date control** | `bv103DesignTokens.analyticsDateInput` (`bv103-control-h` / h-9). |
| **Ops list search** | Ô tìm **trong** `AdvancedDataTable` (`inline`). `searchPlacement="header"` **deprecated**. Kanban/tool không ADT: SearchBar ngoài được phép. |
| **Entity picker dài (>~8)** | `SearchableSelect` / `RegistrySelect searchable` — cấm native `<select>` khoa/NS/danh mục dài. |

Chi tiết: [`../reports/supervision-analytics-filter-scorecard-20260803.md`](../reports/supervision-analytics-filter-scorecard-20260803.md) §5.

## Ánh xạ hotspots

| Route / shell | `showTitle` | tabs | filters |
|---------------|-------------|------|---------|
| VST/GSC layout | false | ModeNav | — |
| CSSDPageShell | false | — | ReportFilters (adapter analytics + trạm) |
| `/` · BCTH | false | — | AnalyticsFilterBar (+ actions) |
| `/thong-ke/*` | false | VST/GSC | filter từ view (cùng band) |
| NKBV | false | Mode tabs | filterBar khi dashboard |
| QLCV / Admin list / Đào tạo | false | tabs khi có | ADT inline search |
