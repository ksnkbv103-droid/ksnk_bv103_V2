-- Soft local GSC-MAP-2DONG — N-GHEP: bảng ghép nhiều TC cũ → 1 TC mới (FILE ONLY).
-- PA: migration riêng sau 175200 (không nhét vào 175000) — seed ghép + expand lúc đọc;
-- dashboard_summary (tỷ lệ phiên) không đổi. Phụ thuộc: 175000 map, 175100 views.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gstt_map_tieu_chi_merge (
  old_criterion_id uuid PRIMARY KEY,
  merge_group text NOT NULL,
  ma_bk_short text NOT NULL,
  ma_bk_long text NOT NULL,
  old_ma_tc text,
  target_ma_tc text NOT NULL,
  target_stt int,
  target_criterion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gstt_map_tieu_chi_merge IS
  'GSC N-GHEP: nhiều orphan TC → 1 TC mới lúc đọc (không sửa results_jsonb).';

CREATE INDEX IF NOT EXISTS idx_gstt_map_tieu_chi_merge_group
  ON public.gstt_map_tieu_chi_merge (merge_group);

INSERT INTO public.gstt_map_tieu_chi_merge (
  old_criterion_id, merge_group, ma_bk_short, ma_bk_long, old_ma_tc, target_ma_tc, target_stt
) VALUES
-- BM.07.02 TC09 ← 1102+1112
('fa53a87b-ffa9-466f-b91c-369e2eeda312'::uuid, 'BM.07.02:TC09', 'BM.07.02', 'KSNK.QT.07.BM.02', '1102', 'TC09', 9),
('f59eeff1-b88d-439a-a385-287476a412fc'::uuid, 'BM.07.02:TC09', 'BM.07.02', 'KSNK.QT.07.BM.02', '1112', 'TC09', 9),
-- BM.07.02 TC11 ← 1109+1110+1111
('badf1fd2-378e-462d-9768-8e1b44602743'::uuid, 'BM.07.02:TC11', 'BM.07.02', 'KSNK.QT.07.BM.02', '1109', 'TC11', 11),
('8749d019-a6e4-42b2-a6bb-007b8b797f1c'::uuid, 'BM.07.02:TC11', 'BM.07.02', 'KSNK.QT.07.BM.02', '1110', 'TC11', 11),
('dc603603-095a-4bec-8e72-68ff0ff39b89'::uuid, 'BM.07.02:TC11', 'BM.07.02', 'KSNK.QT.07.BM.02', '1111', 'TC11', 11),
-- BM.09.01 TC08 ← 1506+1507
('9f53308f-bee4-4556-ab43-c59d05d9919e'::uuid, 'BM.09.01:TC08', 'BM.09.01', 'KSNK.QT.09.BM.01', '1506', 'TC08', 8),
('1c60e72a-d28b-4a70-b425-0899fea4d100'::uuid, 'BM.09.01:TC08', 'BM.09.01', 'KSNK.QT.09.BM.01', '1507', 'TC08', 8),
-- BM.09.01 TC11 ← 1509+1511
('bdb57232-5e4e-4772-ba2a-e77de222e6d4'::uuid, 'BM.09.01:TC11', 'BM.09.01', 'KSNK.QT.09.BM.01', '1509', 'TC11', 11),
('a6ce72f6-48e5-4294-9912-25355d381a7a'::uuid, 'BM.09.01:TC11', 'BM.09.01', 'KSNK.QT.09.BM.01', '1511', 'TC11', 11),
-- BM.09.01 TC12 ← 1510+1513
('49938766-e092-4f00-b1a8-e1e8c387b5ff'::uuid, 'BM.09.01:TC12', 'BM.09.01', 'KSNK.QT.09.BM.01', '1510', 'TC12', 12),
('d2ae8cf0-ae0d-4c68-bb46-fb5550216b19'::uuid, 'BM.09.01:TC12', 'BM.09.01', 'KSNK.QT.09.BM.01', '1513', 'TC12', 12),
-- BM.16.01 TC11 ← 1807+1811
('b5fb896a-3448-46d9-92b3-04a8402b0d00'::uuid, 'BM.16.01:TC11', 'BM.16.01', 'KSNK.QT.16.BM.01', '1807', 'TC11', 11),
('a2252711-2252-4e77-ac59-6639b78c1715'::uuid, 'BM.16.01:TC11', 'BM.16.01', 'KSNK.QT.16.BM.01', '1811', 'TC11', 11),
-- BM.17.01 TC06 ← 1906+1907
('851ab784-72bf-4d7c-938a-1e4775cee193'::uuid, 'BM.17.01:TC06', 'BM.17.01', 'KSNK.QT.17.BM.01', '1906', 'TC06', 6),
('06c130ff-bc5f-4d75-abd5-5811a55df8b1'::uuid, 'BM.17.01:TC06', 'BM.17.01', 'KSNK.QT.17.BM.01', '1907', 'TC06', 6),
-- BM.18.02 TC08 ← 2006+2007
('cfdca568-fbb7-43ba-8ef0-6d192dbffdcb'::uuid, 'BM.18.02:TC08', 'BM.18.02', 'KSNK.QT.18.BM.02', '2006', 'TC08', 8),
('9bce3f11-d629-4cb3-af2c-17f6dec207a7'::uuid, 'BM.18.02:TC08', 'BM.18.02', 'KSNK.QT.18.BM.02', '2007', 'TC08', 8)
ON CONFLICT (old_criterion_id) DO UPDATE SET
  merge_group = EXCLUDED.merge_group,
  ma_bk_short = EXCLUDED.ma_bk_short,
  ma_bk_long = EXCLUDED.ma_bk_long,
  old_ma_tc = EXCLUDED.old_ma_tc,
  target_ma_tc = EXCLUDED.target_ma_tc,
  target_stt = EXCLUDED.target_stt;

-- Resolve target_criterion_id (sau SCR seed mẫu mới).
UPDATE public.gstt_map_tieu_chi_merge m
SET target_criterion_id = tc.id
FROM public.gstt_dm_bang_kiem bk
JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON tc.bang_kiem_id = bk.id
WHERE m.ma_bk_long IS NOT NULL
  AND bk.ma_bk = m.ma_bk_long
  AND m.target_criterion_id IS NULL
  AND m.target_ma_tc IS NOT NULL
  AND upper(coalesce(tc.ma_tc, '')) = upper(m.target_ma_tc);

-- Expand results_jsonb → dòng TC agg (ghép + map 1-1). Mirror: expandSessionResultsForTcAgg.
CREATE OR REPLACE FUNCTION public.fn_gsc_expand_session_results_for_tc(p_results jsonb)
RETURNS TABLE (
  source_criterion_id uuid,
  resolved_criterion_id uuid,
  value text,
  merge_applied boolean
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  r jsonb;
  v_cid uuid;
  v_val text;
  g record;
  member_ids uuid[];
  member_vals text[];
  mid uuid;
  mv text;
  can_merge boolean;
  suppressed uuid[] := ARRAY[]::uuid[];
  merged_val text;
BEGIN
  -- 1) Ghép theo nhóm (đủ phần + chỉ DAT/KHONG_DAT).
  FOR g IN
    SELECT
      merge_group,
      (array_agg(old_criterion_id)) AS mids,
      (array_agg(DISTINCT target_criterion_id))[1] AS tid
    FROM public.gstt_map_tieu_chi_merge
    WHERE target_criterion_id IS NOT NULL
    GROUP BY merge_group
  LOOP
    member_ids := g.mids;
    member_vals := ARRAY[]::text[];
    can_merge := true;
    FOREACH mid IN ARRAY member_ids LOOP
      mv := NULL;
      FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_results, '[]'::jsonb)) LOOP
        IF (r ->> 'criterion_id')::uuid = mid THEN
          mv := upper(trim(COALESCE(r ->> 'value', '')));
          EXIT;
        END IF;
      END LOOP;
      IF mv IS NULL OR mv NOT IN ('DAT', 'KHONG_DAT') THEN
        can_merge := false;
        EXIT;
      END IF;
      member_vals := member_vals || mv;
    END LOOP;
    IF can_merge THEN
      suppressed := suppressed || member_ids;
      IF 'KHONG_DAT' = ANY (member_vals) THEN
        merged_val := 'KHONG_DAT';
      ELSE
        merged_val := 'DAT';
      END IF;
      source_criterion_id := g.tid;
      resolved_criterion_id := g.tid;
      value := merged_val;
      merge_applied := true;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- 2) Phần còn lại: map 1-1 (exact/fuzzy) hoặc giữ id cũ.
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_results, '[]'::jsonb)) LOOP
    BEGIN
      v_cid := (r ->> 'criterion_id')::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    IF v_cid IS NULL THEN CONTINUE; END IF;
    IF v_cid = ANY (suppressed) THEN CONTINUE; END IF;
    v_val := upper(trim(COALESCE(r ->> 'value', '')));
    source_criterion_id := v_cid;
    resolved_criterion_id := public.fn_gsc_resolve_criterion_id(v_cid);
    value := v_val;
    merge_applied := false;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_gsc_expand_session_results_for_tc(jsonb) IS
  'GSC-MAP-2DONG: expand results cho tỷ lệ TC (N-GHEP + map 1-1). Không đụng tỷ lệ phiên.';

-- Violations: dùng expand (ghép + 1-1). criterion_id gốc giữ khi không ghép; ghép → id đích.
CREATE OR REPLACE VIEW public.gstt_fact_gsc_violations_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  x.source_criterion_id AS criterion_id,
  x.resolved_criterion_id,
  public.fn_gsc_resolve_criterion_label(x.source_criterion_id) AS ten_tieu_chi,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.gstt_dm_tieu_chi_bang_kiem tc
      WHERE tc.id = x.source_criterion_id
    ) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.gstt_map_tieu_chi_orphan m
      WHERE m.old_criterion_id = x.source_criterion_id
    ) THEN true
    ELSE true
  END AS is_orphan_criterion,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  COALESCE(s.loai_giam_sat, bk.loai_giam_sat) AS loai_giam_sat,
  COUNT(*) FILTER (
    WHERE COALESCE(x.value, '') NOT IN ('NA', '')
  )::bigint AS tong_quan_sat,
  COUNT(*) FILTER (WHERE x.value = 'KHONG_DAT')::bigint AS tong_vi_pham,
  s.created_at
FROM public.gstt_fact_chung_sessions s
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
INNER JOIN LATERAL public.fn_gsc_expand_session_results_for_tc(COALESCE(s.results_jsonb, '[]'::jsonb)) AS x ON true
WHERE COALESCE(s.is_active, true) = true
  AND x.source_criterion_id IS NOT NULL
  AND COALESCE(x.value, '') NOT IN ('NA', '')
GROUP BY
  s.id, x.source_criterion_id, x.resolved_criterion_id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id,
  s.khu_vuc_id, s.nghe_nghiep_id, s.nguoi_giam_sat_id, s.created_at,
  s.loai_giam_sat, bk.loai_giam_sat;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_violations_summary;

-- Patch RPC tỷ lệ TC: join theo resolved_criterion_id (1-1 + ghép).
DO $$
DECLARE
  fname text;
  def text;
  new_def text;
BEGIN
  FOREACH fname IN ARRAY ARRAY[
    'rpc_dashboard_gsc_strategic_analytics_impl',
    'rpc_gsc_checklist_detail_impl',
    'rpc_gsc_compare_matrices_impl'
  ]
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = fname
    LIMIT 1;
    IF def IS NULL THEN
      RAISE NOTICE 'skip missing %', fname;
      CONTINUE;
    END IF;
    new_def := def;
    new_def := replace(
      new_def,
      'JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.criterion_id = tc.id',
      'JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.resolved_criterion_id = tc.id'
    );
    new_def := replace(
      new_def,
      'LEFT JOIN public.gstt_fact_gsc_violations_summary v
      ON v.criterion_id = tc.id',
      'LEFT JOIN public.gstt_fact_gsc_violations_summary v
      ON v.resolved_criterion_id = tc.id'
    );
    IF new_def IS DISTINCT FROM def THEN
      EXECUTE new_def;
      RAISE NOTICE 'patched % (resolved_criterion_id join)', fname;
    ELSE
      RAISE NOTICE 'no join patch %', fname;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
