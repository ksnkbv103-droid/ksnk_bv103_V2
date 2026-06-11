# Supabase archive (không apply)

| File | Trạng thái |
|------|------------|
| `schema-pgdump-deprecated-202606.sql` | pg_dump cũ — compat `dm_*`/`fact_*`, pre module SSOT. **Không dùng.** |
| `data-pgdump-deprecated-202606.sql` | Data dump đi kèm schema cũ. **Không dùng.** |

SSOT vận hành:

```bash
npx supabase db reset --local    # migrate + seed
npm run mdm:migrate              # linked incremental
npm run trial:db:precheck:local
```
