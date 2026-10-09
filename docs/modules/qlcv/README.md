# QLCV

| Đọc khi | File |
|---------|------|
| **Domain SSOT** | [`19-QLCV-DOMAIN-SSOT.md`](19-QLCV-DOMAIN-SSOT.md) |
| Wiki / mapping | [`../../wiki/entities.md`](../../wiki/entities.md#qlcv) · [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § QLCV |
| IA | [`../../ux/principles.md`](../../ux/principles.md) |

Rule: `14-cong-viec-spec-context.mdc`

Go-live: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

## Migration (pilot)

```bash
npm run mdm:migrate:local
npx supabase stop && npx supabase start
npm run verify:engineering
```

Ghi checklist qua `fn_qlcv_update_checklist`. Cloud thiếu cột → `npm run mdm:migrate` (không chỉ local).

**«Không tải mẫu định kỳ»** — thiếu view sau scheduler. **«schema cache / PGRST204»** — cloud thiếu migration mới, không phải thiếu checklist.
