# BV103 — Layout shell, primitive UI & đồng bộ toàn app

> **Mục đích:** Định nghĩa chung + lộ trình áp dụng **một cơ chế** layout (kể cả module sau này), tránh drift class Tailwind và “card trong card” vô hạn.

## 1) “Shell” là gì?

**Shell** = lớp bọc **ngoài cùng** của một khối UI có ranh giới rõ: nền, viền, bo góc, đổ bóng (và đôi khi ring), padding. Nội dung thật nằm **bên trong** (slot): form field, bảng, text.

- **Shell** trả lời: “Khối này là một **ô** trên màn hình.”
- **Nội dung** trả lời: “Bên trong có **dữ liệu / điều khiển** gì.”

Ví dụ đã dùng trong repo: `KsnkPageShell`, `gscFormChrome.panelShell`, `CongViecForm` `formChrome.shell` — cùng tinh thần, khác tên file.

## 2) Nhiều layer chồng nhau — có cần không?

**Không phải lúc nào cũng cần.** Thường gặp: `border` + `ring` + `shadow` + `bg` + card lồng card.

| Ưu | Nhược |
|----|--------|
| Phân tầng thị giác, nhóm thông tin | Giảm “không khí”, dễ rối trên mobile |
| Che giấu nền trang, tạo “khối” rõ | Nhiều class → khó đồng bộ, tốn review |
| Cảm giác “app chuyên nghiệp” | Lạm dụng → mọi thứ đều “nổi”, không còn điểm nhấn |

**Nguyên tắc gọn (BV103):**

- **Một màn hình / một vùng cuộn chính:** tối đa **1–2 tầng nâng** (elevation) cho nội dung chính: ví dụ page shell + panel nội dung; tránh 3+ lớp card lồng chỉ để “đẹp”.
- **Ring + shadow:** chỉ cần **một** cơ chế tạo độ nổi chính (ưu tiên `shadow-[var(--shadow-app-soft)]` + viền nhạt); `ring` thêm khi cần focus / hover rõ — không nhân đôi cùng mục đích.
- **Danh sách / hàng lặp:** ưu tiên **một shell** cho cả list hoặc item phẳng + divider, thay vì mỗi dòng một mini-card.

## 3) Cơ chế đồng bộ (SSOT presentation)

**Hai tầng:**

1. **Toàn app (ít đổi):** token trong `src/app/globals.css` (đã có `--shadow-app-soft`, …). Có thể bổ sung `--radius-panel`, `--radius-control` khi team chốt.
2. **Theo module (hay đổi theo nghiệp vụ):** file `lib/<module>-form-chrome.ts` hoặc `lib/<module>-layout-chrome.ts` — object string class `panelShell`, `textarea`, `primaryButton`, … **Mọi** component form/panel trong module **import từ đây**, không tự ghép `rounded-2xl` rải rác.

**Module mới sau này:** checklist onboarding — có `lib/*-chrome.ts` (hoặc dùng primitive dưới) trước khi nhân bản JSX phức tạp.

### LEAN — “áp dụng khi chạm file” nghĩa là gì?

- **Không** quét cả repo hay “đồng bộ một đêm” trừ khi có sprint UI riêng.  
- Khi **một PR / một task** đụng màn đó (bug, cột mới, API): **cùng PR** chỉnh luôn pattern chuẩn (cuộn nội bộ, ô tìm full width, shell…) — diff nhỏ, dễ review.  
- Màn **chưa đụng** thì giữ nguyên cho đến lần sửa sau; đó là trade-off **LEAN** trong [`LEAN_EXECUTION_BV103.md`](./LEAN_EXECUTION_BV103.md).

### Danh sách / bảng MDM dài

- **Cuộn:** khối bảng `max-h` + `overflow-auto` + `thead` sticky (vd. `AdvancedDataTable` phần `<table>`, trang Tài khoản–vai trò).  
- **Ô tìm cân shell:** prop `searchStretchToContainer` trên `AdvancedDataTable` + padding ngang (`px-4 sm:px-6`) khớp thanh nút phía trên — tránh ô tìm “cụt” so với bảng.

## 4) Primitive UI (tùy mức độ)

- **Mức 0 (đang làm):** chỉ `*Chrome` object trong `lib/` — nhanh, không tăng file component.
- **Mức 1:** `src/components/shared/` thêm `Bv103Panel`, `Bv103Textarea` bọc class cố định — dùng khi **≥3 module** cùng cần một control.
- **Mức 2:** ESLint `no-restricted-syntax` theo thư mục (cấm `rounded-[32px]`, `rounded-3xl` trong form…) — sau khi primitive đã có.

**In / PDF / print:** được phép lệch layout; không bắt buộc dùng shell app.

## 5) Kế hoạch tổng thể (theo giai đoạn)

| Giai đoạn | Việc | Đầu ra |
|-----------|------|--------|
| **A — Chốt token** | Rà `globals.css`, ghi `--shadow-*`, (tuỳ chọn) `--radius-*` | Một trang token, agent có chỗ tra |
| **B — Shared tối thiểu** | Chỉ thêm primitive khi **lặp ≥3** (panel, textarea, nút primary) | Giảm copy-paste giữa QLCV / GSC / VST |
| **C — Migrate theo module** | Mỗi PR một vertical slice (vd. “form phiên GSC”) | LEAN, diff nhỏ |
| **D — Chốt drift** | Rule / convention trong AGENTS + LEAN checklist | PR mới không tái phạm pattern cũ |
| **E (tuỳ chọn)** | Playwright screenshot vài màn pilot | An tâm khi đổi shell |

## 6) Liên hệ file khác

- Thực thi PR: [`LEAN_EXECUTION_BV103.md`](./LEAN_EXECUTION_BV103.md)  
- Chuẩn cao: [`AGENTS.md`](../../../AGENTS.md)  
- **SSOT class toàn app:** [`src/lib/bv103-layout-chrome.ts`](../../../src/lib/bv103-layout-chrome.ts)  
- **GSC (compose):** [`src/modules/giam-sat-chung/lib/gsc-form-chrome.ts`](../../../src/modules/giam-sat-chung/lib/gsc-form-chrome.ts)

## 7) Token `:root` (tra cứu nhanh)

| Biến | Ý nghĩa |
|------|---------|
| `--shadow-app-soft` | Đổ bóng panel / form chuẩn |
| `--shadow-app-header` | Viền đổ header |
| `--radius-shell` | Bo lớn (1rem) |
| `--radius-table` | Bo bảng |
| `--radius-control` | Bo điều khiển form (0.75rem, tham chiếu thiết kế) |
| `--bv103-control-h` | Chiều cao tối thiểu nút / ô (class `bv103-control-h`) |

Nguồn: [`src/app/globals.css`](../../../src/app/globals.css).

## 8) Trạng thái thực hiện (cập nhật theo PR)

| Giai đoạn | Trạng thái |
|-----------|------------|
| **A** Chốt token | Đã bổ sung `--radius-control` + bảng mục 7 |
| **B** Shared tối thiểu | Đã thêm `src/lib/bv103-layout-chrome.ts`; QLCV (`CongViecForm`, `DeXuatForm`) + GSC (`gsc-form-chrome`) import SSOT |
| **C** Migrate theo module | **Đợt pilot 5 module (deploy):** Quản trị (`quan-tri-he-thong`), VST, GSC dashboard panel, QLCV (bảng/đề xuất/timeline), Dashboard (`GapAnalysisPanel`, command-center dialog) — đã thay `rounded-[32px]` / `rounded-3xl` / magic rem bằng `rounded-2xl` + `bv103LayoutChrome` nơi phù hợp |
| **D** Chốt drift | `npm run layout:drift-check` — gợi ý `rounded-[32px]` / `rounded-[3rem]` (không fail CI) |
| **E** Visual regression | Chưa bắt buộc |

## 9) Lệnh kiểm tra drift (phase D)

```bash
npm run layout:drift-check
```
