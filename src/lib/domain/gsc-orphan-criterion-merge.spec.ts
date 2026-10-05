import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMergeTargetsFreeFromOneToOne,
  expandSessionResultsForTcAgg,
  mergeScoredValues,
  type MergeGroup,
} from "./gsc-orphan-criterion-merge";
import {
  isMappedOrphanConfidence,
  type OrphanCriterionMapRow,
} from "./gsc-orphan-criterion-resolve";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TARGET = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const group2: MergeGroup = {
  merge_group: "BM.TEST:TC01",
  ma_bk_short: "BM.TEST",
  target_ma_tc: "TC01",
  target_criterion_id: TARGET,
  members: [{ old_criterion_id: A }, { old_criterion_id: B }],
};

function scored(rows: ReturnType<typeof expandSessionResultsForTcAgg>) {
  return rows.filter((r) => r.value === "DAT" || r.value === "KHONG_DAT");
}

describe("gsc-orphan-criterion-merge DoD", () => {
  const orphanMap = new Map<string, OrphanCriterionMapRow>();

  it("Đạt+Đạt → Đạt", () => {
    const out = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "DAT" },
        ],
        orphanMap,
        [group2],
      ),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      resolved_criterion_id: TARGET,
      value: "DAT",
      merge_applied: true,
    });
  });

  it("Đạt+Không đạt → Không đạt", () => {
    const out = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "KHONG_DAT" },
        ],
        orphanMap,
        [group2],
      ),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.value).toBe("KHONG_DAT");
    expect(mergeScoredValues(["DAT", "KHONG_DAT"])).toBe("KHONG_DAT");
  });

  it("Đạt+thiếu → legacy (không ghép)", () => {
    const out = scored(
      expandSessionResultsForTcAgg(
        [{ criterion_id: A, value: "DAT" }],
        orphanMap,
        [group2],
      ),
    );
    expect(out.every((r) => !r.merge_applied)).toBe(true);
    expect(out.map((r) => r.resolved_criterion_id).sort()).toEqual([A]);
  });

  it("Đạt+N/A → legacy (không ghép)", () => {
    const out = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "NA" },
        ],
        orphanMap,
        [group2],
      ),
    );
    expect(out.every((r) => !r.merge_applied)).toBe(true);
    expect(out.map((r) => r.resolved_criterion_id)).toEqual([A]);
  });

  it("1 phiên → tối đa 1 kết quả TC đích; phần ngoài nhóm giữ nguyên", () => {
    const out = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "DAT" },
          { criterion_id: OTHER, value: "KHONG_DAT" },
        ],
        orphanMap,
        [group2],
      ),
    );
    const targets = out.filter((r) => r.resolved_criterion_id === TARGET);
    expect(targets).toHaveLength(1);
    expect(out).toHaveLength(2);
    expect(out.some((r) => r.resolved_criterion_id === OTHER)).toBe(true);
  });

  it("nhóm 3 phần: đủ Đạt → 1 Đạt; thiếu 1 → legacy cả ba", () => {
    const g3: MergeGroup = {
      ...group2,
      merge_group: "BM.TEST:TC02",
      target_ma_tc: "TC02",
      members: [
        { old_criterion_id: A },
        { old_criterion_id: B },
        { old_criterion_id: C },
      ],
    };
    const ok = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "DAT" },
          { criterion_id: C, value: "DAT" },
        ],
        orphanMap,
        [g3],
      ),
    );
    expect(ok).toHaveLength(1);
    const miss = scored(
      expandSessionResultsForTcAgg(
        [
          { criterion_id: A, value: "DAT" },
          { criterion_id: B, value: "DAT" },
        ],
        orphanMap,
        [g3],
      ),
    );
    expect(miss.every((r) => !r.merge_applied)).toBe(true);
    expect(miss).toHaveLength(2);
  });
});

describe("GSC-MAP-2DONG — merge migration invariants", () => {
  function parseMergeMigration(): MergeGroup[] {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261005175300_gsc_mod_orphan_merge_map.sql",
      ),
      "utf8",
    );
    const re =
      /\('([0-9a-f-]{36})'::uuid, '([^']+)', '([^']+)', '([^']+)', '([^']*)', '([^']+)', (\d+)\)/g;
    const byGroup = new Map<string, MergeGroup>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      const merge_group = m[2]!;
      const g =
        byGroup.get(merge_group) ??
        ({
          merge_group,
          ma_bk_short: m[3]!,
          target_ma_tc: m[6]!,
          target_stt: Number(m[7]),
          target_criterion_id: `new:${m[3]}:${m[6]}`,
          members: [],
        } satisfies MergeGroup);
      g.members.push({ old_criterion_id: m[1]!, old_ma_tc: m[5]! });
      byGroup.set(merge_group, g);
    }
    return [...byGroup.values()];
  }

  function parseOrphanRows() {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261005175000_gsc_mod_orphan_tc_and_bk_map.sql",
      ),
      "utf8",
    );
    const re =
      /\('([0-9a-f-]{36})'::uuid, '([^']*)', (?:'([^']*)'|NULL), (?:NULL|\d+), '([^']*)', '((?:[^']|'')*)', (?:'([^']*)'|NULL), (NULL|\d+), '([^']+)'\)/g;
    const rows: Array<{
      old_criterion_id: string;
      ma_bk_short: string;
      old_ma_tc: string;
      new_ma_tc: string | null;
      match_confidence: string;
    }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      rows.push({
        old_criterion_id: m[1]!,
        ma_bk_short: m[2]!,
        old_ma_tc: m[4]!,
        new_ma_tc: m[6] ?? null,
        match_confidence: m[8]!,
      });
    }
    return rows;
  }

  const groups = parseMergeMigration();
  const orphanRows = parseOrphanRows();

  it("8 nhóm / 17 dòng; không gộp BM.07.03 TC04 (1204+1205)", () => {
    expect(groups).toHaveLength(8);
    expect(groups.reduce((n, g) => n + g.members.length, 0)).toBe(17);
    const oldMas = new Set(
      groups.flatMap((g) => g.members.map((m) => m.old_ma_tc)),
    );
    expect(oldMas.has("1204")).toBe(false);
    expect(oldMas.has("1205")).toBe(false);
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261005175300_gsc_mod_orphan_merge_map.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/fn_gsc_expand_session_results_for_tc/);
    expect(sql).toMatch(/gstt_map_tieu_chi_merge/);
  });

  it("8 TC đích không trùng đích map 1-1", () => {
    const check = assertMergeTargetsFreeFromOneToOne(groups, orphanRows);
    expect(check.conflicts).toEqual([]);
    expect(check.ok).toBe(true);
  });

  it("17 dòng ghép vẫn legacy trong map 1-1", () => {
    const mergeIds = new Set(
      groups.flatMap((g) => g.members.map((m) => m.old_criterion_id)),
    );
    for (const id of mergeIds) {
      const row = orphanRows.find((r) => r.old_criterion_id === id);
      expect(row?.match_confidence, id).toBe("legacy");
      expect(isMappedOrphanConfidence(row?.match_confidence)).toBe(false);
    }
  });

  it("tỷ lệ phiên: dashboard_summary migration không dùng expand ghép", () => {
    const views = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20261005175100_gsc_mod_loai_filter_orphan_views.sql",
      ),
      "utf8",
    );
    const dash = views.match(
      /CREATE OR REPLACE VIEW public\.gstt_fact_gsc_dashboard_summary[\s\S]*?(?=CREATE OR REPLACE VIEW public\.gstt_fact_gsc_violations)/,
    )?.[0];
    expect(dash).toBeTruthy();
    expect(dash!).not.toMatch(/fn_gsc_expand_session_results_for_tc/);
    expect(dash!).toMatch(/jsonb_array_elements/);
  });
});
