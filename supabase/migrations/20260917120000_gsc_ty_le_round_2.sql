-- GSC ty_le percent: ROUND 1 → 2 decimals (SSOT metric-dictionary / Phase C).
-- Scope: only GSC *_impl RPCs. VST ROUND(...,1) and session score averages are untouched.
-- Additive CREATE OR REPLACE of live function bodies (security-definer wrappers unchanged).

DO $gsc_ty_le_round2$
DECLARE
  r record;
  def text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'rpc_dashboard_gsc_strategic_analytics_impl',
        'rpc_gsc_checklist_detail_impl',
        'rpc_gsc_compare_matrices_impl'
      )
  LOOP
    def := pg_get_functiondef(r.oid);
    -- These three functions are GSC-only; every ", 1)" is a ROUND precision for *100 / quan_sat.
    def := replace(def, ', 1)', ', 2)');
    EXECUTE def;
  END LOOP;
END
$gsc_ty_le_round2$;
