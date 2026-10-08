import { describe, expect, it } from "vitest";
import { readMigrationSql } from "@/lib/testing/migration-file";

const MIGRATION = "gsc_strategic_materialized_base";

const STRAT = "rpc_dashboard_gsc_strategic_analytics_impl";
const CMP = "rpc_gsc_compare_matrices_impl";

const SIG =
  /CREATE OR REPLACE FUNCTION public\.rpc_dashboard_gsc_strategic_analytics_impl\(\s*p_tu_ngay date,\s*p_den_ngay date,\s*p_khoi_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_khoa_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_nghe_nghiep_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_khu_vuc_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_hinh_thuc_ids text\[] DEFAULT NULL::text\[\],\s*p_bang_kiem_mas text\[] DEFAULT NULL::text\[]\s*\)/;

const SIG_CMP =
  /CREATE OR REPLACE FUNCTION public\.rpc_gsc_compare_matrices_impl\(\s*p_tu_ngay date,\s*p_den_ngay date,\s*p_khoi_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_khoa_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_nghe_nghiep_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_khu_vuc_ids uuid\[] DEFAULT NULL::uuid\[\],\s*p_hinh_thuc_ids text\[] DEFAULT NULL::text\[\],\s*p_bang_kiem_mas text\[] DEFAULT NULL::text\[]\s*\)/;

const JSON_KEYS = [
  "kpis",
  "trendline",
  "matrix_khoa",
  "top_violations",
  "gap_analysis",
  "dynamic_checklists",
  "checklist_overview",
  "workload",
] as const;

function readMigration(): string {
  return readMigrationSql(MIGRATION);
}

function extractFunction(sql: string, name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const fromStart = sql.slice(start);
  const endMarker = "$function$;";
  const end = fromStart.indexOf(endMarker);
  expect(end).toBeGreaterThan(0);
  return fromStart.slice(0, end + endMarker.length);
}

describe("gsc strategic materialized base migration", () => {
  const sql = readMigration();
  const stratFn = extractFunction(sql, STRAT);
  const cmpFn = extractFunction(sql, CMP);

  it("defines both CREATE OR REPLACE with prod signatures + DEFAULT", () => {
    expect(sql).toMatch(SIG);
    expect(sql).toMatch(SIG_CMP);
  });

  it("strategic: SECURITY DEFINER, search_path public, no work_mem", () => {
    expect(stratFn).toMatch(/SECURITY DEFINER/);
    expect(stratFn).toMatch(/SET search_path TO 'public'/);
    expect(stratFn).not.toMatch(/SET work_mem TO '8MB'/);
  });

  it("compare: SECURITY DEFINER, search_path public+pg_catalog, work_mem 8MB", () => {
    expect(cmpFn).toMatch(/SECURITY DEFINER/);
    expect(cmpFn).toMatch(/SET search_path TO 'public', 'pg_catalog'/);
    expect(cmpFn).toMatch(/SET work_mem TO '8MB'/);
  });

  it("strategic has exactly 2 AS MATERIALIZED (base_all, wl_base); no viol_base", () => {
    expect(stratFn).toMatch(/base_all AS MATERIALIZED\s*\(/);
    expect(stratFn).toMatch(/wl_base AS MATERIALIZED\s*\(/);
    expect(stratFn).not.toMatch(/viol_base/);
    const mats = stratFn.match(/AS MATERIALIZED\s*\(/g) ?? [];
    expect(mats.length).toBe(2);
  });

  it("top_violations and viol_rank read gstt_fact_gsc_violations_summary directly", () => {
    expect(stratFn).toMatch(
      /top_violations AS \(\s*SELECT COALESCE\(jsonb_agg\(t ORDER BY so_vi_pham DESC\), '\[\]'::jsonb\) AS val FROM \(\s*SELECT[\s\S]*?FROM public\.gstt_fact_gsc_violations_summary v/
    );
    expect(stratFn).toMatch(
      /viol_rank AS \(\s*SELECT DISTINCT ON \(bk\.ma_bk\)[\s\S]*?FROM public\.gstt_fact_gsc_violations_summary v/
    );
  });

  it("final jsonb_build_object has all 8 keys", () => {
    const marker = "SELECT jsonb_build_object(\n      'kpis',";
    const idx = stratFn.lastIndexOf(marker);
    expect(idx).toBeGreaterThan(0);
    const tail = stratFn.slice(idx);
    for (const key of JSON_KEYS) {
      expect(tail).toMatch(new RegExp(`'${key}'\\s*,`));
    }
    expect(tail).toMatch(/'workload',\s*COALESCE/);
  });

  it("creates index M1 on sessions ngay + COALESCE active", () => {
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_gsc_sessions_ngay_active_coalesce\s+ON public\.gstt_fact_chung_sessions \(ngay_giam_sat\) WHERE COALESCE\(is_active, true\) = true;/
    );
  });

  it("reloads PostgREST schema", () => {
    expect(sql).toMatch(/NOTIFY pgrst, 'reload schema'/);
  });
});
