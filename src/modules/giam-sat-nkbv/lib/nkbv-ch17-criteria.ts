/**
 * Chương 17 — ngôn ngữ cây tiêu chuẩn (AND / OR / ≥N / age / procedure gates).
 * Pure; không I/O. Định nghĩa loại nằm ở nkbv-ch17-def-*.
 */

export type Ch17Node =
  | { kind: "evidence"; key: string }
  | { kind: "all"; of: readonly Ch17Node[] }
  | { kind: "any"; of: readonly Ch17Node[] }
  | { kind: "atLeast"; n: number; of: readonly Ch17Node[] }
  | { kind: "ageGate"; age: "INFANT_LE1" | "OVER_1Y"; of: Ch17Node }
  | { kind: "procedureGate"; procedures: readonly string[]; of: Ch17Node };

export type Ch17Criterion = {
  code: string;
  label_vi: string;
  node: Ch17Node;
};

export type Ch17Group = "BJ" | "CNS" | "CVS" | "GI" | "LRI" | "REPR" | "EENT" | "SST";

export type Ch17TypeDef = {
  code: string;
  group: Ch17Group;
  name_vi: string;
  criteria: readonly Ch17Criterion[];
  allowed_procedures?: readonly string[];
  window_override?: {
    /** Half-width days around index (ENDO = 10 → IWP 21d). */
    iwp_half_days?: number;
    rit_to_discharge?: boolean;
  };
};

export type Ch17EvalContext = {
  evidence: Record<string, boolean>;
  procedureCode?: string | null;
  isInfantLe1?: boolean;
};

export type Ch17EvalResult = {
  met: boolean;
  metCriterion: string | null;
  reason: string;
  missing: string[];
  applicable: boolean;
};

type NodeEval = { ok: boolean; missing: string[] };

function uniq(keys: string[]): string[] {
  return [...new Set(keys)];
}

export function evalCh17Node(node: Ch17Node, ctx: Ch17EvalContext): NodeEval {
  switch (node.kind) {
    case "evidence": {
      const ok = ctx.evidence[node.key] === true;
      return { ok, missing: ok ? [] : [node.key] };
    }
    case "all": {
      const parts = node.of.map((n) => evalCh17Node(n, ctx));
      const ok = parts.every((p) => p.ok);
      return { ok, missing: ok ? [] : uniq(parts.flatMap((p) => p.missing)) };
    }
    case "any": {
      const parts = node.of.map((n) => evalCh17Node(n, ctx));
      if (parts.some((p) => p.ok)) return { ok: true, missing: [] };
      return { ok: false, missing: uniq(parts.flatMap((p) => p.missing)) };
    }
    case "atLeast": {
      const parts = node.of.map((n) => evalCh17Node(n, ctx));
      const hit = parts.filter((p) => p.ok).length;
      if (hit >= node.n) return { ok: true, missing: [] };
      return {
        ok: false,
        missing: uniq(parts.filter((p) => !p.ok).flatMap((p) => p.missing)),
      };
    }
    case "ageGate": {
      const infant = !!ctx.isInfantLe1;
      const pass =
        (node.age === "INFANT_LE1" && infant) || (node.age === "OVER_1Y" && !infant);
      if (!pass) return { ok: false, missing: [] };
      return evalCh17Node(node.of, ctx);
    }
    case "procedureGate": {
      const proc = String(ctx.procedureCode || "")
        .trim()
        .toUpperCase();
      if (!proc || !node.procedures.map((p) => p.toUpperCase()).includes(proc)) {
        return { ok: false, missing: [] };
      }
      return evalCh17Node(node.of, ctx);
    }
    default:
      return { ok: false, missing: [] };
  }
}

/** Collect evidence keys referenced by a node (UI checklist). */
export function collectEvidenceKeys(node: Ch17Node, out = new Set<string>()): Set<string> {
  switch (node.kind) {
    case "evidence":
      out.add(node.key);
      break;
    case "all":
    case "any":
    case "atLeast":
      for (const n of node.of) collectEvidenceKeys(n, out);
      break;
    case "ageGate":
    case "procedureGate":
      collectEvidenceKeys(node.of, out);
      break;
  }
  return out;
}

export function evaluateCh17TypeDef(
  def: Ch17TypeDef,
  ctx: Ch17EvalContext,
): Ch17EvalResult {
  const proc = String(ctx.procedureCode || "")
    .trim()
    .toUpperCase();
  if (def.allowed_procedures?.length && proc && !def.allowed_procedures.includes(proc)) {
    return {
      applicable: true,
      met: false,
      metCriterion: null,
      reason: `${def.code} không hợp lệ sau thủ thuật ${proc}.`,
      missing: [],
    };
  }

  let bestMissing: string[] = [];
  for (const c of def.criteria) {
    const r = evalCh17Node(c.node, ctx);
    if (r.ok) {
      return {
        applicable: true,
        met: true,
        metCriterion: c.code,
        reason: `${def.code}: thỏa mãn ${c.code} — ${c.label_vi}.`,
        missing: [],
      };
    }
    if (r.missing.length && (bestMissing.length === 0 || r.missing.length < bestMissing.length)) {
      bestMissing = r.missing;
    }
  }

  return {
    applicable: true,
    met: false,
    metCriterion: null,
    reason: `${def.code}: chưa đủ tiêu chuẩn Ch.17.`,
    missing: bestMissing,
  };
}

export function ev(key: string): Ch17Node {
  return { kind: "evidence", key };
}

export function all(...of: Ch17Node[]): Ch17Node {
  return { kind: "all", of };
}

export function any(...of: Ch17Node[]): Ch17Node {
  return { kind: "any", of };
}

export function atLeast(n: number, ...of: Ch17Node[]): Ch17Node {
  return { kind: "atLeast", n, of };
}
