# Layout primitives — KSNK BV103

> SSOT UI shell. Chi tiết UX: [`engineering-guidelines.md`](../../core/engineering-guidelines.md) §2 · Wiki: [`concepts.md#layout-primitives`](../../wiki/concepts.md#layout-primitives).

## Thứ bậc primitive

| Lớp | File / component | Khi dùng |
|-----|------------------|----------|
| App shell | `ClientLayoutWrapper` + `Sidebar` | Toàn app |
| Page width | `KsnkPageShell` (`max-w-7xl`) | **Chỉ** bọc `<main>` — không lặp `max-w-*` trong view |
| Giám sát / CSSD page | `KsnkSupervisionHero` + tabs | VST, GSC, QLCV, CSSD workflow |
| Admin page title | `KsnkPageHeader` | Quản trị, RBAC, tài khoản |
| Analytics / báo cáo | `Bv103AnalyticsPageFrame` | Command Center, Báo cáo tổng hợp |
| Panel / form surface | `bv103LayoutChrome` | Form, notice, textarea |
| Design tokens | `bv103-design-tokens.ts` | Typography, spacing, buttons |
| CSSD accent | `cssd-ui-chrome.ts` | Tab emerald, action primary — **extends** layout chrome |

## Quy tắc

1. **Không** `max-w-[1400px]` trong module view — `KsnkPageShell` đủ.
2. **Không** `text-[8px]` / `text-[9px]` — label tối thiểu `text-[11px]` (`BV103_MIN_LABEL_CLASS`).
3. **Không** card lồng card — tối đa: hero → một panel → bảng.
4. Radius: `rounded-2xl` / `rounded-xl` — `npm run layout:drift-check`.
5. Filter analytics: **`AnalyticsFilterBar`** cho mọi màn có bộ lọc khoa/kỳ.

## Verify

```bash
npm run layout:drift-check
npm run layout:typography-check
```
