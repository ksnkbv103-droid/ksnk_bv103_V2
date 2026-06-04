# Migration archive (không apply)

| Artifact | Vai trò |
|----------|---------|
| [`../../docs/archive/pilot_chain_20260520_20260529.tar.gz`](../../docs/archive/pilot_chain_20260520_20260529.tar.gz) | 90 migration trước squash v1 (`20260520`–`20260529`) |
| [`post_baseline_20260530_20260602/`](post_baseline_20260530_20260602/) | Baseline v1 + 25 incremental — đã gộp vào `20260602100000_init_pilot_baseline.sql` (2026-06-02) |

Giải nén pilot chain cũ khi cần:

```bash
tar -xzf docs/archive/pilot_chain_20260520_20260529.tar.gz -C /tmp
```

SSOT apply: chỉ `supabase/migrations/*.sql` ở thư mục gốc (xem [`../README.md`](../README.md)).
