# Migration archive (không apply)

| Artifact | Vai trò |
|----------|---------|
| [`../../docs/archive/pilot_chain_20260520_20260529.tar.gz`](../../docs/archive/pilot_chain_20260520_20260529.tar.gz) | 90 migration trước squash pilot (`20260520`–`20260529`) — audit / repair linked |

Giải nén khi cần tra cứu:

```bash
tar -xzf docs/archive/pilot_chain_20260520_20260529.tar.gz -C /tmp
```

SSOT apply: chỉ `supabase/migrations/*.sql` (xem [`../README.md`](../README.md)).
