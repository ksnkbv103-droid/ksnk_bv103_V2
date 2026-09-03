# BV103 Visual Language (Phase 0 SSOT)

Ngôn ngữ giao diện thống nhất — MIS bệnh viện: trang trọng, đọc được, ít “poster UI”.

## Chuỗi áp dụng (hook chỉ đọc class — không set font runtime)

1. **Màu / 5 vai trò chữ CSS** → `src/app/globals.css` (`:root` `--bv103-type-*`, `.bv103-type-title|section|body|label|kpi|note`)
2. **Typography + nhịp trang** → `src/lib/bv103-design-tokens.ts` (`bv103DesignTokens` chỉ alias class CSS)
3. **Control / panel / nút** → `src/lib/bv103-layout-chrome.ts`
4. **Panel + form surface (L3 chung)** → `src/lib/bv103-panel-chrome.ts` (`bv103PanelChrome`)
5. **Alias module (bắt buộc khi sửa UI module)** → `*-form-chrome.ts`, `*-table-chrome.ts`
6. **Gate hồi quy** → `npm run layout:drift-check` + `columns:chrome-check` + `panel:chrome-check`
7. **Chuẩn hóa bulk** → `npm run table:normalize` · `panel:normalize` · `panel:wire`

### Cách làm khoa học (không rải token)

| Tầng | Việc | Không làm |
|------|------|-----------|
| **L0** `globals.css` | `--radius-*`, `--surface-*`, `--primary` | Sửa từng file khi đổi bo góc |
| **L1** `bv103-design-tokens` | 6 cấp typography + `tableCell*` | Hardcode `text-sm font-black` |
| **L2** `bv103-layout-chrome` | Input, panel, nút primary/secondary | Inline `rounded-xl` lẻ tẻ |
| **L3** `bv103-panel-chrome` | List/panel/form: `panelTitle`, `kpiValue`, `innerTable*` | Mỗi panel tự định nghĩa KPI |
| **L3 domain** | Module chrome (bảng dưới) | Header `"MÃ / TÊN"` trong Column |
| **L4** Component import chrome | `className={UI.cellBody}` | `uppercase` trên paragraph dài |

**Quy tắc viết hoa:** IN HOA chỉ ở **điều hướng** (`navGroupLabel`) và **nút lựa chọn touch** (`choiceBtn`, `btnTouch`, segment Đạt/Không). Toolbar + header bảng + tiêu đề panel + nội dung = chữ thường.

**Quy tắc đậm:** `font-semibold` tiêu đề dòng; `font-medium` nội dung; `font-black` chỉ số KPI (`statValue` / `kpiValue`) và nút touch workstation (CSSD/NKBV).

**Ops density:** chọn loại = chip ngang; danh sách máy/danh mục = bảng + QR thumb; KPI list = strip 1 hàng; CTA = `btnPrimary`/`btnSecondary`/`btnPrimaryBlock`. Chi tiết bảng: [`page-chrome-contract-20260731.md`](../architecture/page-chrome-contract-20260731.md) §8.

### Module chrome (L3 domain)

| Domain | File |
|--------|------|
| Quản trị MDM | `quan-tri-form-chrome.ts`, `quan-tri-table-chrome.ts` |
| CSSD | `cssd-ui-chrome.ts` (`CSSD_UI_PANEL_CHROME`, `CSSD_UI_CELL_*`) |
| GSC (+ VST history) | `gsc-form-chrome.ts`, `gsc-table-chrome.ts` |
| NKBV | `nkbv-form-chrome.ts` |
| Dashboard | `dashboard-chrome.ts` |
| QLCV | `qlcv-table-chrome.ts` |

Mọi `*-columns.tsx` **bắt buộc** import một trong các chrome trên (`npm run columns:chrome-check`).

Mọi `*Panel*`, `*Form*`, `*Modal*` **bắt buộc** import chrome (`npm run panel:chrome-check`). Dùng token `UI.*` / `C.*` qua `npm run panel:wire`.

## Thang typography (5 vai trò + ghi chú)

| Token | Case | Weight | Màu | Dùng cho |
|-------|------|--------|-----|----------|
| `bv103-type-title` (`pageTitle`) | Title case | 600 | `--text-title` | Tên khối / trang |
| `bv103-type-section` | Thường | 600 | slate-800 | Tiêu đề nhóm form |
| `bv103-type-body` | Thường | 500 | `--text-body` | Nội dung, ô bảng |
| `bv103-type-label` | Thường | 500 | `--text-muted` | Nhãn, header cột |
| `bv103-type-kpi` | Tabular | 600 | `--text-title` | Số liệu |
| `bv103-type-note` | Nghiêng | 400 | slate-400 | Ghi chú phụ — **italic duy nhất** |

## Màu semantic

| Vai trò | Token CSS |
|---------|-----------|
| CTA | `--primary` |
| Notice | `--surface-success-*`, `--surface-warning-*`, … |

## Adoption tracker (thực tế repo — cập nhật 2026-08-02)

| Phase | Spec | Adoption ước lượng | Ghi chú |
|-------|------|-------------------|---------|
| 0 Token + spec | ✅ | **100%** | `globals.css`, `bv103-design-tokens` |
| 1 Shell + bảng hub | ✅ | **~90%** | `AdvancedDataTable`, sidebar, auth |
| 2 Form GSC/VST + Quản trị | ✅ | **~80%** | Form chrome; modal DM dùng `modalTitleLight` |
| 3 NKBV + CSSD workstation | ✅ | **~75%** | Touch IN HOA cố ý; body poster → **B+3 S1** |
| 4 Dashboard + gate typo | ✅ | **~85%** | CC thin Done; BCTH comprehensive → **B+3 S3** |
| 5 Notice semantic | ✅ | **~75%** | Scope banner Done; lock/health → **B+3 S4** |
| **L3 columns chrome** | ✅ | **100%** | 12/12 `*-columns.tsx` import chrome |
| **L3 panel chrome import** | ✅ | **~98%** | 59/60 panel/form/modal — gate `panel:chrome-check` |
| **L4 panel token wire** | ✅ | **~95%** | `UI.*` / `F.*` / `bv103LayoutChrome.*` / `CSSD_UI_*` |
| **B+3 program** | 📋 | S0 Done | [`ui-consistency-program-20260802.md`](../architecture/ui-consistency-program-20260802.md) — S1–S5 chat implement riêng |

**Chuẩn wire:** alias `UI` (panel), `F`/`C` (Quản trị), `D` (dashboard), `gscFormChrome` (GSC/VST), `bv103LayoutChrome` (QLCV). Gate **siết import** + **tiêu đề IN HOA**; `panel:wire` khi thêm panel mới.

## Lệnh verify UI

```bash
npm run columns:chrome-check   # bắt buộc import chrome trên columns
npm run panel:chrome-check     # bắt buộc import chrome trên panel/form/modal
npm run panel:wire             # gắn token UI.* vào file đã import chrome
npm run panel:normalize        # bulk: font-black → semibold, bỏ IN HOA label
npm run layout:drift-check     # typo/layout drift (+ columns + panel strict)
npm run table:normalize        # header + cell bulk normalize
```
