-- GSC analytics fan-out simulation (1 aggregate + 3 filtered calls).
DO $$
DECLARE
  t0 timestamptz;
  tu date := (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date;
  den date := CURRENT_DATE::date;
  ms numeric;
  i int;
BEGIN
  t0 := clock_timestamp();
  PERFORM public.rpc_dashboard_gsc_strategic_analytics(tu, den, NULL, NULL, NULL, NULL, NULL, NULL);
  ms := round((extract(epoch FROM clock_timestamp() - t0) * 1000)::numeric, 1);
  RAISE NOTICE 'gsc_fanout aggregate_ms=%', ms;

  FOR i IN 1..3 LOOP
    t0 := clock_timestamp();
    PERFORM public.rpc_dashboard_gsc_strategic_analytics(tu, den, NULL, NULL, NULL, NULL, NULL, NULL);
    ms := round((extract(epoch FROM clock_timestamp() - t0) * 1000)::numeric, 1);
    RAISE NOTICE 'gsc_fanout cluster_%_ms=%', i, ms;
  END LOOP;
END $$;
