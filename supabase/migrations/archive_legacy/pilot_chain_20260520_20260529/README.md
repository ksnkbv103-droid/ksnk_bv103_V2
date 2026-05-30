# Pilot chain 20260520–20260529 (archived)

90 migration incremental đã được **squash** vào:

- `supabase/migrations/20260530000000_init_pilot_baseline.sql` — schema + RPC + RLS
- `supabase/seed.sql` — master seed (`sys_lookup_value`, `gstt_dm_bang_kiem` canonical 36)

**Không apply** qua Supabase CLI. Giữ để audit / diff lịch sử.

Squash date: 2026-05-30. Local: `supabase db reset --local`.
