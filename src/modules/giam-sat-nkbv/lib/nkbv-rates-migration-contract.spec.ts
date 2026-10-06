import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_MIGRATION = "supabase/migrations/20261005034000_nkbv_doe_loa_report_cols.sql";
const FIX_MIGRATION = "supabase/migrations/20261006090000_nkbv_rates_fix_ambiguous_ma_khoa.sql";

const FN_NAME = "fn_nkbv_dich_te_hoc_rates";

const SIGNATURE =
  /CREATE OR REPLACE FUNCTION public\.fn_nkbv_dich_te_hoc_rates\(\s*"p_tu_ngay" date,\s*"p_den_ngay" date,\s*"p_khoa_id" uuid DEFAULT NULL\s*\)/;

const RETURNS_COLS = [
  '"khoa_id" uuid',
  '"ma_khoa" text',
  '"ten_khoa" text',
  '"obs_vap_cases" bigint',
  '"obs_vae_cases" bigint',
  '"obs_clabsi_cases" bigint',
  '"obs_mbi_lcbi_cases" bigint',
  '"obs_cauti_cases" bigint',
  '"obs_ssi_cases" bigint',
  '"obs_vent_days" bigint',
  '"obs_cvc_days" bigint',
  '"obs_foley_days" bigint',
  '"obs_patient_days" bigint',
  '"obs_emv_episodes" bigint',
  '"obs_total_surgeries" bigint',
  '"clabsi_rate_per_1000" numeric',
  '"mbi_lcbi_rate_per_1000" numeric',
  '"cvc_dur" numeric',
  '"clabsi_sir" numeric',
  '"cvc_sur" numeric',
  '"vap_rate_per_1000" numeric',
  '"vae_rate_per_1000" numeric',
  '"vae_rate_per_100_emv" numeric',
  '"vent_dur" numeric',
  '"vae_sir" numeric',
  '"vent_sur" numeric',
  '"cauti_rate_per_1000" numeric',
  '"foley_dur" numeric',
  '"cauti_sir" numeric',
  '"foley_sur" numeric',
  '"ssi_raw_rate" numeric',
  '"ssi_sir" numeric',
] as const;

function readMigration(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

/** Lấy khối CREATE … $$; của fn_nkbv_dich_te_hoc_rates (không gồm COMMENT). */
function extractRatesFunction(sql: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${FN_NAME}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const fromStart = sql.slice(start);
  const endMarker = "\n$$;";
  const end = fromStart.indexOf(endMarker);
  expect(end).toBeGreaterThan(0);
  return fromStart.slice(0, end + endMarker.length);
}

function extractReturnsTable(fnSql: string): string {
  const m = fnSql.match(/RETURNS TABLE\s*\(([\s\S]*?)\)\s*LANGUAGE/);
  expect(m).toBeTruthy();
  return m![1];
}

/** Chuẩn hóa khoảng trắng để so thân hàm. */
function normWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Gỡ CTE khoa_keys (từ `, khoa_keys AS (` tới trước `, joined AS`),
 * giữ phần trước/sau để so thân ngoài khối sửa.
 */
function stripKhoaKeysCte(fnSql: string): string {
  const marker = "khoa_keys AS (";
  const start = fnSql.indexOf(marker);
  expect(start).toBeGreaterThan(0);
  const afterOpen = fnSql.indexOf("(", start) + 1;
  let depth = 1;
  let i = afterOpen;
  while (i < fnSql.length && depth > 0) {
    const ch = fnSql[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    i += 1;
  }
  // Bỏ luôn dấu phẩy trước `khoa_keys` nếu có
  let cutStart = start;
  while (cutStart > 0 && /\s/.test(fnSql[cutStart - 1]!)) cutStart -= 1;
  if (fnSql[cutStart - 1] === ",") cutStart -= 1;

  // Bỏ khoảng trắng sau `)` đóng CTE
  let cutEnd = i;
  while (cutEnd < fnSql.length && /\s/.test(fnSql[cutEnd]!)) cutEnd += 1;

  return fnSql.slice(0, cutStart) + fnSql.slice(cutEnd);
}

function extractKhoaKeysBlock(fnSql: string): string {
  const marker = "khoa_keys AS (";
  const start = fnSql.indexOf(marker);
  expect(start).toBeGreaterThan(0);
  const afterOpen = fnSql.indexOf("(", start) + 1;
  let depth = 1;
  let i = afterOpen;
  while (i < fnSql.length && depth > 0) {
    const ch = fnSql[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    i += 1;
  }
  return fnSql.slice(start, i);
}

describe("fn_nkbv_dich_te_hoc_rates migration contract (ambiguous ma_khoa hotfix)", () => {
  const baseSql = readMigration(BASE_MIGRATION);
  const fixSql = readMigration(FIX_MIGRATION);
  const baseFn = extractRatesFunction(baseSql);
  const fixFn = extractRatesFunction(fixSql);

  it("giữ nguyên chữ ký p_tu_ngay / p_den_ngay / p_khoa_id", () => {
    expect(fixFn).toMatch(SIGNATURE);
    expect(baseFn).toMatch(SIGNATURE);
  });

  it("RETURNS TABLE cột giống hệt migration 20261005034000", () => {
    const baseCols = normWs(extractReturnsTable(baseFn));
    const fixCols = normWs(extractReturnsTable(fixFn));
    expect(fixCols).toBe(baseCols);
    for (const col of RETURNS_COLS) {
      expect(fixCols).toContain(col);
    }
  });

  it("CTE khoa_keys qualify kp.ma_khoa / kp.ten_khoa (không còn bare ma_khoa::text AS ma_khoa)", () => {
    const khoaKeys = extractKhoaKeysBlock(fixFn);
    expect(khoaKeys).toMatch(/kp\.ma_khoa/);
    expect(khoaKeys).toMatch(/kp\.ten_khoa/);
    expect(khoaKeys).toMatch(/kp\.id\s+AS\s+khoa_id/);
    expect(khoaKeys).toMatch(/FROM\s+public\.mdm_dm_khoa_phong\s+kp/);
    // Không còn tham chiếu không qualify tới cột trùng OUT param
    expect(khoaKeys).not.toMatch(/(?<![\w.])ma_khoa::text\s+AS\s+ma_khoa/);
    expect(khoaKeys).not.toMatch(/(?<![\w.])ten_khoa::text\s+AS\s+ten_khoa/);
    expect(khoaKeys).not.toMatch(/(?<![\w.])id\s+AS\s+khoa_id/);
  });

  it("thân ngoài khoa_keys giống hệt bản 20261005034000 (sau chuẩn hóa khoảng trắng)", () => {
    expect(normWs(stripKhoaKeysCte(fixFn))).toBe(normWs(stripKhoaKeysCte(baseFn)));
  });
});
