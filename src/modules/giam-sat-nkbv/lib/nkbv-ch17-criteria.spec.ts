import { describe, expect, it } from "vitest";
import {
  all,
  any,
  atLeast,
  collectEvidenceKeys,
  evalCh17Node,
  evaluateCh17TypeDef,
  ev,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";
import { allCh17EvidenceKeys, getCh17Evidence } from "./nkbv-ch17-evidence-catalog";

describe("nkbv-ch17-criteria", () => {
  it("AND thiếu 1 mắt xích → fail + missing đúng key", () => {
    const node = all(ev("a"), ev("b"), ev("c"));
    const r = evalCh17Node(node, { evidence: { a: true, b: true } });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["c"]);
  });

  it("≥3/5 đạt → pass", () => {
    const node = atLeast(3, ev("a"), ev("b"), ev("c"), ev("d"), ev("e"));
    const r = evalCh17Node(node, {
      evidence: { a: true, c: true, e: true },
    });
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("infant gate chặn nhánh người lớn", () => {
    const node = {
      kind: "ageGate" as const,
      age: "OVER_1Y" as const,
      of: ev("sx_fever_gt38"),
    };
    const blocked = evalCh17Node(node, {
      evidence: { sx_fever_gt38: true },
      isInfantLe1: true,
    });
    expect(blocked.ok).toBe(false);

    const ok = evalCh17Node(node, {
      evidence: { sx_fever_gt38: true },
      isInfantLe1: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("OR chọn nhánh đạt; evaluateCh17TypeDef trả metCriterion", () => {
    const def: Ch17TypeDef = {
      code: "DEMO",
      group: "BJ",
      name_vi: "Demo",
      criteria: [
        { code: "DEMO1", label_vi: "Vi sinh", node: ev("micro_bone_tissue") },
        {
          code: "DEMO3",
          label_vi: "Lâm sàng",
          node: all(
            atLeast(2, ev("sx_fever_gt38"), ev("sx_bone_pain")),
            any(ev("img_bone_definitive"), all(ev("img_equivocal"), ev("abx_note_site_specific"))),
          ),
        },
      ],
    };
    const r = evaluateCh17TypeDef(def, {
      evidence: {
        sx_fever_gt38: true,
        sx_bone_pain: true,
        img_bone_definitive: true,
      },
    });
    expect(r.met).toBe(true);
    expect(r.metCriterion).toBe("DEMO3");
  });

  it("procedureGate và allowed_procedures từ chối mã PT sai", () => {
    const def: Ch17TypeDef = {
      code: "PJI",
      group: "BJ",
      name_vi: "PJI",
      allowed_procedures: ["HPRO", "KPRO"],
      criteria: [{ code: "PJI2", label_vi: "Sinus", node: ev("sx_pji_sinus_tract") }],
    };
    const r = evaluateCh17TypeDef(def, {
      evidence: { sx_pji_sinus_tract: true },
      procedureCode: "COLO",
    });
    expect(r.met).toBe(false);
    expect(r.reason).toMatch(/COLO/);
  });

  it("collectEvidenceKeys gom key lá", () => {
    const keys = collectEvidenceKeys(any(ev("a"), all(ev("b"), ev("c"))));
    expect([...keys].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("nkbv-ch17-evidence-catalog", () => {
  it("keys unique và lookup được", () => {
    const keys = allCh17EvidenceKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(getCh17Evidence("sx_fever_gt38")?.label_vi).toMatch(/38/);
  });
});
