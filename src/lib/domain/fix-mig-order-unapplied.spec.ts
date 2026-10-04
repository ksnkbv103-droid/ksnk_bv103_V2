import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Prod đã apply đến 20261005034000 — chuỗi chưa apply = mọi 20261005* sau mốc đó. */
const PROD_APPLIED_THROUGH = "20261005034000";
const MIG_DIR = join(process.cwd(), "supabase/migrations");

const GSC_VIEWS = [
  "gstt_fact_gsc_dashboard_summary",
  "gstt_fact_gsc_violations_summary",
  "fact_gsc_dashboard_summary",
  "fact_gsc_violations_summary",
] as const;

function listUnappliedChain(): string[] {
  return readdirSync(MIG_DIR)
    .filter(
      (f) =>
        f.startsWith("20261005") &&
        f.endsWith(".sql") &&
        f.slice(0, 14) > PROD_APPLIED_THROUGH,
    )
    .sort();
}

/** Lấy thân CREATE OR REPLACE VIEW cuối cùng theo thứ tự apply. */
function lastViewBody(files: string[], viewName: string): string | null {
  const re = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+VIEW\\s+public\\.${viewName}\\b[\\s\\S]*?(?=CREATE\\s+OR\\s+REPLACE|NOTIFY\\s+pgrst|COMMIT\\s*;|$)`,
    "gi",
  );
  let last: string | null = null;
  for (const f of files) {
    const sql = readFileSync(join(MIG_DIR, f), "utf8");
    const matches = sql.match(re);
    if (matches?.length) last = matches[matches.length - 1]!;
  }
  return last;
}

describe("FIX-MIG-ORDER — chuỗi migration chưa apply 05/10", () => {
  const files = listUnappliedChain();

  it("timestamp version tăng dần theo thứ tự apply", () => {
    expect(files.length).toBeGreaterThan(0);
    const versions = files.map((f) => f.slice(0, 14));
    for (let i = 1; i < versions.length; i++) {
      expect(versions[i]! > versions[i - 1]!, `${files[i]} ≤ ${files[i - 1]}`).toBe(
        true,
      );
    }
  });

  it("4 file GSC nằm sau GS-05 và sau mọi QLCV mod", () => {
    const gsc = files.filter((f) => /_gsc_mod_/.test(f));
    expect(gsc.map((f) => f.replace(/^\d+_/, ""))).toEqual([
      "gsc_mod_orphan_tc_and_bk_map.sql",
      "gsc_mod_loai_filter_orphan_views.sql",
      "gsc_mod_seed_doi_tuong_mec_inactive.sql",
      "gsc_mod_orphan_merge_map.sql",
    ]);
    const gs05 = files.find((f) => f.includes("gs05_analytics_hinh_thuc_id_stype"));
    const qlcv = files.filter((f) => /_qlcv_mod_/.test(f));
    expect(gs05).toBeTruthy();
    expect(qlcv.length).toBeGreaterThan(0);
    expect(gsc[0]! > gs05!).toBe(true);
    expect(gsc[0]! > qlcv[qlcv.length - 1]!).toBe(true);
    // Merge sau seed MEC (175200) và trước VST mod.
    expect(gsc[3]!).toMatch(/175300/);
    const vst = files.find((f) => f.includes("vst_mod_soft_delete"));
    expect(vst).toBeTruthy();
    expect(gsc[3]! < vst!).toBe(true);
  });

  it("định nghĩa cuối 4 view GSC có loai_giam_sat và hinh_thuc_id", () => {
    for (const view of GSC_VIEWS) {
      const body = lastViewBody(files, view);
      expect(body, `thiếu định nghĩa cuối ${view}`).toBeTruthy();
      // Alias fact_* chỉ SELECT * — kiểm tra thân gstt_* đã gộp; alias phải trỏ gstt_*.
      if (view.startsWith("fact_")) {
        expect(body!).toMatch(/gstt_fact_gsc_(dashboard|violations)_summary/);
        continue;
      }
      expect(body!, view).toMatch(/loai_giam_sat/);
      expect(body!, view).toMatch(/hinh_thuc_id/);
      expect(body!, view).toMatch(/fn_session_analytics_stype/);
    }
    // Violations cuối phải còn resolve orphan.
    const viol = lastViewBody(files, "gstt_fact_gsc_violations_summary")!;
    expect(viol).toMatch(/fn_gsc_resolve_criterion/);
  });
});
