# Khóa module GSC / VST (`sys_module_locks`)

> Pilot Phase 1 — SSOT vận hành khóa sổ giám sát trước chốt báo cáo.

## Nghiệp vụ

Admin KSNK đặt **ngày khóa đến** (`locked_until_date`) trên module **GSC** hoặc **VST**. Mọi phiên có `ngay_giam_sat` **≤ ngày khóa** không được ghi/sửa/xóa/import.

| Module | Bảng | Trigger DB |
|--------|------|------------|
| GSC | `sys_module_locks` (`module_name = 'GSC'`) | `trg_assert_gsc_sessions_not_locked` → `fn_assert_vst_gsc_not_locked` |
| VST | `sys_module_locks` (`module_name = 'VST'`) | `trg_assert_vst_sessions_not_locked` |

## Code path

| Layer | File |
|-------|------|
| Domain | [`src/lib/supervision-module-lock.ts`](../../../src/lib/supervision-module-lock.ts) |
| GSC action (read status) | [`gsc-module-lock.actions.ts`](../../../src/modules/giam-sat-chung/actions/gsc-module-lock.actions.ts) |
| GSC UI hook + banner | `use-gsc-module-lock.ts`, `GscModuleLockBanner.tsx` |
| Write guard | `giam-sat-chung-write.actions.ts`, `giam-sat-chung-import.actions.ts`, `giam-sat-chung-session-meta.actions.ts` |
| VST write | `vst-write-save-session.actions.ts`, `vst-write-delete.actions.ts` |

## UX

- Form GSC hiển thị banner vàng khi ngày phiên nằm trong khoảng khóa.
- Lưu/xóa/import → lỗi server với message tiếng Việt từ `assertSupervisionNotLockedForDate`.

## Pilot checklist (G3)

1. Admin bật khóa GSC (UI quản trị hoặc insert `sys_module_locks`).
2. Mở phiên GSC trong khoảng ngày bị khóa → banner hiện.
3. Thử **Lưu** / **Xóa** → bị chặn, message rõ.

## Verify

```bash
npm run verify:engineering   # sau sửa action
npm run trial:db:precheck    # trigger + sys_module_locks
```

## Ghi chú

- Khóa **theo ngày phiên**, không khóa toàn module vô thời hạn (trừ khi `locked_until_date` rất xa).
- VST dùng cùng helper; banner VST (nếu có) qua hook tương tự trên form VST.
