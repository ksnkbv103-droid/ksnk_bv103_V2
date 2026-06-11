import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  GSC_CANONICAL_36_SCORING,
  assertGscCanonical36Complete,
  getGscCanonicalScoring,
  summarizeGscCanonicalScoring,
} from "./gsc-canonical-36-scoring";

function parseSeedBangKiemScoring(seedSql: string): Map<string, { cach: string; loai: string }> {
  const start = seedSql.indexOf('INSERT INTO "public"."gstt_dm_bang_kiem"');
  const end = seedSql.indexOf(";\n\n", start);
  const insert = seedSql.slice(start, end);
  const parts = insert.split(/\),\s*\n\t\(/);
  const out = new Map<string, { cach: string; loai: string }>();
  for (let raw of parts) {
    raw = raw.replace(/^INSERT INTO[^()]+\(\s*/, "").replace(/\)\s*$/, "");
    const ma = raw.match(/'((?:BM\.[^']+|JCI\.[^']+|APSIC\.[^']+))'/);
    if (!ma) continue;
    const code = ma[1];
    const tails = [...raw.matchAll(/'(TY_LE|TRON_GOI|DAT_KHONG_DAT|NHAT_KY)',\s*'([^']+)'/g)];
    const t = tails.at(-1);
    const loai = raw.match(
      /'(TUAN_THU|NHAT_KY_VAN_HANH|DANH_GIA_HE_THONG)',\s*'(NHAN_VIEN|NGUOI_BENH|MOI_TRUONG|THIET_BI|ME_TIET_KHUAN)'/,
    );
    if (t && loai) {
      out.set(code, { cach: t[1], loai: loai[1] });
    }
  }
  return out;
}

describe("GSC canonical 36 scoring SSOT", () => {
  it("has exactly 36 unique templates", () => {
    expect(() => assertGscCanonical36Complete()).not.toThrow();
  });

  it("distribution matches domain mix", () => {
    const s = summarizeGscCanonicalScoring();
    expect(s.TY_LE).toBe(18);
    expect(s.TRON_GOI).toBe(6);
    expect(s.DAT_KHONG_DAT).toBe(9);
    expect(s.NHAT_KY).toBe(3);
  });

  it("BM.07.03 ngoại khoa = DAT_KHONG_DAT (PASS_FAIL master)", () => {
    const e = getGscCanonicalScoring("BM.07.03");
    expect(e?.cach_tinh_diem).toBe("DAT_KHONG_DAT");
  });

  it("care bundles = TRON_GOI", () => {
    for (const ma of ["BM.24.02", "BM.25.01", "BM.25.03", "BM.26.01", "BM.27.01", "BM.27.02"]) {
      expect(getGscCanonicalScoring(ma)?.cach_tinh_diem).toBe("TRON_GOI");
    }
  });
});

describe("seed.sql vs GSC_CANONICAL_36_SCORING", () => {
  it("seed cach_tinh_diem + loai_giam_sat khớp SSOT", () => {
    const seedPath = path.join(process.cwd(), "supabase/seed.sql");
    const seed = parseSeedBangKiemScoring(fs.readFileSync(seedPath, "utf8"));
    const mismatches: string[] = [];
    for (const expected of GSC_CANONICAL_36_SCORING) {
      const row = seed.get(expected.ma_bk);
      if (!row) {
        mismatches.push(`${expected.ma_bk}: missing in seed`);
        continue;
      }
      if (row.cach !== expected.cach_tinh_diem || row.loai !== expected.loai_giam_sat) {
        mismatches.push(
          `${expected.ma_bk}: seed ${row.cach}/${row.loai} ≠ ${expected.cach_tinh_diem}/${expected.loai_giam_sat}`,
        );
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });
});
