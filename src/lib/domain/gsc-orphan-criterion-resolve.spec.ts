import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCriterionTotalsMatchBk,
  isMappedOrphanConfidence,
  LEGACY_ORPHAN_CRITERION_GROUP,
  resolveCriterionIdForAgg,
  resolveCriterionLabel,
  type OrphanCriterionMapRow,
} from "./gsc-orphan-criterion-resolve";

const ORPHAN_ID = "b4ae98d5-68a7-47c8-967a-62673d72de64";
const NEW_ID = "11111111-2222-4333-8444-555555555555";
const LEGACY_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

type MigMapRow = {
  old_criterion_id: string;
  ma_bk_short: string;
  old_ma_tc: string;
  new_ma_tc: string | null;
  new_stt: number | null;
  match_confidence: string;
};

function parseOrphanMapMigration(): MigMapRow[] {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261005175000_gsc_mod_orphan_tc_and_bk_map.sql"),
    "utf8",
  );
  const re =
    /\('([0-9a-f-]{36})'::uuid, '([^']*)', (?:'([^']*)'|NULL), (?:NULL|\d+), '([^']*)', '((?:[^']|'')*)', (?:'([^']*)'|NULL), (NULL|\d+), '([^']+)'\)/g;
  const rows: MigMapRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    rows.push({
      old_criterion_id: m[1]!,
      ma_bk_short: m[2]!,
      old_ma_tc: m[4]!,
      new_ma_tc: m[6] ?? null,
      new_stt: m[7] === "NULL" ? null : Number(m[7]),
      match_confidence: m[8]!,
    });
  }
  return rows;
}

/** Simulate APPLY resolve: exact/fuzzy + new_ma_tc → synthetic new_criterion_id. */
function simulateResolve(rows: MigMapRow[]): OrphanCriterionMapRow[] {
  return rows.map((r) => {
    const mapped = isMappedOrphanConfidence(r.match_confidence) && !!r.new_ma_tc;
    return {
      old_criterion_id: r.old_criterion_id,
      old_noi_dung: r.old_ma_tc,
      new_ma_tc: r.new_ma_tc,
      match_confidence: r.match_confidence,
      new_criterion_id: mapped
        ? `new:${r.ma_bk_short}:${r.new_ma_tc}`
        : null,
    };
  });
}

describe("gsc-orphan-criterion-resolve DoD", () => {
  const orphanMap = new Map<string, OrphanCriterionMapRow>([
    [
      ORPHAN_ID,
      {
        old_criterion_id: ORPHAN_ID,
        old_noi_dung: "Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng)",
        new_criterion_id: NEW_ID,
        match_confidence: "exact",
      },
    ],
    [
      LEGACY_ID,
      {
        old_criterion_id: LEGACY_ID,
        old_noi_dung: "Tiêu chí cũ không còn tương ứng",
        new_criterion_id: null,
        match_confidence: "legacy",
      },
    ],
    [
      "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
      {
        old_criterion_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        old_noi_dung: "Không được quy đổi dù có id mới giả",
        new_criterion_id: NEW_ID,
        match_confidence: "legacy",
      },
    ],
  ]);
  const live = new Map<string, string>([[NEW_ID, "TC01 Tháo trang sức (mẫu mới)"]]);

  it("exact chưa có live → tên cũ; legacy → nhóm «Tiêu chí cũ (không quy đổi)»", () => {
    expect(resolveCriterionLabel(ORPHAN_ID, new Map(), orphanMap)).toBe(
      "Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng)",
    );
    expect(resolveCriterionLabel(NEW_ID, live, orphanMap)).toBe(
      "TC01 Tháo trang sức (mẫu mới)",
    );
    expect(resolveCriterionLabel(LEGACY_ID, live, orphanMap)).toBe(
      LEGACY_ORPHAN_CRITERION_GROUP,
    );
  });

  it("agg: exact/fuzzy → new id; legacy không nhận id mới dù cột có giá trị", () => {
    expect(resolveCriterionIdForAgg(ORPHAN_ID, orphanMap)).toBe(NEW_ID);
    expect(resolveCriterionIdForAgg(LEGACY_ID, orphanMap)).toBe(LEGACY_ID);
    expect(
      resolveCriterionIdForAgg("bbbbbbbb-cccc-4ddd-8eee-ffffffffffff", orphanMap),
    ).toBe("bbbbbbbb-cccc-4ddd-8eee-ffffffffffff");
  });

  it("Σ cấp tiêu chí (mapped + unmapped) = cấp BK", () => {
    expect(
      assertCriterionTotalsMatchBk({ bkQuanSat: 100, mappedQuanSat: 84, unmappedQuanSat: 16 }),
    ).toBe(true);
    expect(
      assertCriterionTotalsMatchBk({ bkQuanSat: 100, mappedQuanSat: 84, unmappedQuanSat: 15 }),
    ).toBe(false);
  });
});

describe("GSC-MAP-DUYET — migration map invariants", () => {
  const rows = parseOrphanMapMigration();
  const resolved = simulateResolve(rows);
  const byOldMa = new Map(rows.map((r) => [r.old_ma_tc, r]));

  it("165 dòng; chỉ exact|fuzzy|legacy; 34/24/107 (GSC-MAP-2DONG)", () => {
    expect(rows).toHaveLength(165);
    const confs = new Set(rows.map((r) => r.match_confidence));
    expect([...confs].sort()).toEqual(["exact", "fuzzy", "legacy"]);
    expect(rows.filter((r) => r.match_confidence === "exact")).toHaveLength(34);
    expect(rows.filter((r) => r.match_confidence === "fuzzy")).toHaveLength(24);
    expect(rows.filter((r) => r.match_confidence === "legacy")).toHaveLength(107);
  });

  it("N-TIEM 1504→TC06 fuzzy; N-MDRO 3601→TC01 fuzzy; đích 1-1 chưa bị chiếm trước khi gán", () => {
    const tiem = byOldMa.get("1504");
    expect(tiem?.ma_bk_short).toBe("BM.09.01");
    expect(tiem?.old_criterion_id).toBe("93112c7a-1aaa-428a-acc8-052c292d9a87");
    expect(tiem?.new_ma_tc).toBe("TC06");
    expect(tiem?.match_confidence).toBe("fuzzy");

    const mdro = byOldMa.get("3601");
    expect(mdro?.ma_bk_short).toBe("BM.31.03");
    expect(mdro?.new_ma_tc).toBe("TC01");
    expect(mdro?.match_confidence).toBe("fuzzy");

    const dest0906 = rows.filter(
      (r) =>
        r.ma_bk_short === "BM.09.01" &&
        r.new_ma_tc === "TC06" &&
        isMappedOrphanConfidence(r.match_confidence),
    );
    expect(dest0906).toHaveLength(1);
    expect(dest0906[0]?.old_ma_tc).toBe("1504");

    const dest3101 = rows.filter(
      (r) =>
        r.ma_bk_short === "BM.31.03" &&
        r.new_ma_tc === "TC01" &&
        isMappedOrphanConfidence(r.match_confidence),
    );
    expect(dest3101).toHaveLength(1);
    expect(dest3101[0]?.old_ma_tc).toBe("3601");
  });

  it("17 dòng N-GHEP vẫn legacy trong map 1-1 (ghép bảng riêng)", () => {
    const mergeOldMa = [
      "1102", "1112", "1109", "1110", "1111",
      "1506", "1507", "1509", "1511", "1510", "1513",
      "1807", "1811", "1906", "1907", "2006", "2007",
    ];
    expect(mergeOldMa).toHaveLength(17);
    for (const ma of mergeOldMa) {
      const r = byOldMa.get(ma);
      expect(r?.match_confidence, ma).toBe("legacy");
      expect(r?.new_ma_tc, ma).toBeNull();
    }
    // Không gộp BM.07.03 TC04
    expect(byOldMa.get("1204")?.match_confidence).toBe("legacy");
    expect(byOldMa.get("1205")?.match_confidence).toBe("legacy");
  });

  it("sau resolve: không 2 TC cũ trùng 1 đích trong cùng BK; legacy không có id mới", () => {
    const map = new Map(resolved.map((r) => [r.old_criterion_id, r]));
    const destByBk = new Map<string, Set<string>>();
    for (const row of rows) {
      const r = map.get(row.old_criterion_id)!;
      if (row.match_confidence === "legacy") {
        expect(r.new_criterion_id).toBeNull();
        expect(resolveCriterionIdForAgg(row.old_criterion_id, map)).toBe(
          row.old_criterion_id,
        );
        continue;
      }
      expect(r.new_criterion_id).toBeTruthy();
      const dest = resolveCriterionIdForAgg(row.old_criterion_id, map);
      const key = row.ma_bk_short;
      const set = destByBk.get(key) ?? new Set();
      expect(set.has(dest), `trùng đích ${dest} trong ${key}`).toBe(false);
      set.add(dest);
      destByBk.set(key, set);
    }
  });

  it("6 dòng sửa đích Domain + 8 dòng map thêm có đích", () => {
    expect(byOldMa.get("1103")?.new_ma_tc).toBe("TC03");
    expect(byOldMa.get("1105")?.new_ma_tc).toBe("TC05");
    expect(byOldMa.get("1107")?.new_ma_tc).toBe("TC07");
    expect(byOldMa.get("1103")?.ma_bk_short).toBe("BM.07.02");
    expect(byOldMa.get("1612")?.new_ma_tc).toBe("TC12");
    expect(byOldMa.get("1910")?.new_ma_tc).toBe("TC10");
    expect(byOldMa.get("5903")?.new_ma_tc).toBe("TC06");
    for (const ma of ["5901", "3603", "3607", "1303", "1802", "1904", "1909", "1913"]) {
      const r = byOldMa.get(ma);
      expect(r?.new_ma_tc, ma).toBeTruthy();
      expect(isMappedOrphanConfidence(r?.match_confidence)).toBe(true);
    }
  });

  it("BM.11.01 và BM.19.01 toàn legacy; UPDATE resolve không còn nhánh stt/none→fuzzy", () => {
    for (const bk of ["BM.11.01", "BM.19.01"]) {
      const subset = rows.filter((r) => r.ma_bk_short === bk);
      expect(subset.length).toBeGreaterThan(0);
      expect(subset.every((r) => r.match_confidence === "legacy")).toBe(true);
      expect(subset.every((r) => r.new_ma_tc == null)).toBe(true);
    }
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261005175000_gsc_mod_orphan_tc_and_bk_map.sql"),
      "utf8",
    );
    expect(sql).toMatch(/match_confidence IN \('exact', 'fuzzy'\)/);
    expect(sql).not.toMatch(/tc\.stt = m\.new_stt/);
    expect(sql).not.toMatch(/match_confidence = 'none' THEN 'fuzzy'/);
    const views = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261005175100_gsc_mod_loai_filter_orphan_views.sql",
      ),
      "utf8",
    );
    expect(views).toMatch(
      /fn_gsc_resolve_criterion_id[\s\S]*match_confidence IN \('exact', 'fuzzy'\)/,
    );
  });
});
