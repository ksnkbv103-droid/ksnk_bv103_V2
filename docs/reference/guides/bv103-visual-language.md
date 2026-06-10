# BV103 Visual Language (Phase 0 SSOT)

Ngôn ngữ giao diện thống nhất — MIS bệnh viện: trang trọng, đọc được, ít “poster UI”.

## Chuỗi áp dụng (không dùng React hook)

1. **Màu / font-size CSS** → `src/app/globals.css` (`:root`, `.bv103-label`)
2. **Typography + nhịp trang** → `src/lib/bv103-design-tokens.ts` (`bv103DesignTokens`)
3. **Control / panel / nút** → `src/lib/bv103-layout-chrome.ts`
4. **Gate hồi quy layout** → `npm run layout:drift-check`

## Thang typography (6 cấp)

| Token | Case | Weight | Màu | Dùng cho |
|-------|------|--------|-----|----------|
| `pageTitle` | Title case | semibold | slate-900 | H1 trang |
| `pageEyebrow` | Thường | medium | slate-500 | Dòng phụ dưới H1 |
| `navGroupLabel` | IN HOA | semibold | slate-400 | Nhóm sidebar, zone header app |
| `sectionTitle` | Thường | semibold | slate-800 | Tiêu đề khối trong trang |
| `labelBlock` | Thường | medium | slate-500 | Label form, header cột bảng |
| `body` / `pageSubtitle` | Thường | normal | slate-600/700 | Đoạn mô tả |

**Quy tắc:** `font-black` chỉ cho số KPI (`statValue`). Primary **không** dùng cho H1 — chỉ icon nhấn, CTA, nav active.

## Màu semantic

| Vai trò | Token CSS | Không dùng cho |
|---------|-----------|----------------|
| Thương hiệu / CTA | `--primary` | Tiêu đề dài, paragraph |
| Tiêu đề nội dung | `--text-title` / slate-900 | — |
| Thân bài | `--text-body` | — |
| Phụ / meta | `--text-muted` | — |
| Trạng thái | `--success`, `--warning`, `--danger` | Trang trí |
| Notice / KPI tone | `--surface-success-*`, `--surface-warning-*`, `--surface-danger-*`, `--surface-info-*` | Màu emerald/amber tự do |

## Deprecated (không dùng code mới)

- `.heading-module` — thay `bv103DesignTokens.pageTitle`
- `.form-label` (black + primary + IN HOA) — thay `labelBlock` / `bv103LayoutChrome.labelField`
- `text-2xl font-black text-[var(--primary)] uppercase` trên H1

## Phase roadmap

| Phase | Phạm vi | Trạng thái |
|-------|---------|------------|
| 0 | Spec + token + label SSOT | ✅ |
| 1 | Shell, bảng, header danh mục Quản trị | ✅ |
| 2 | Form giám sát (GiamSatHeader, GSC, VST) + Quản trị form | ✅ |
| 3 | NKBV + CSSD workstation | ✅ |
| 4 | Dashboard + auth + drift gate typography | ✅ |
| 5 | Notice semantic (`--surface-*`) thay emerald/amber tự do | ✅ |
