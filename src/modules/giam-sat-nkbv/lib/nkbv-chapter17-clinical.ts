/**
 * Facade Ch.17 — tương thích API cũ; chấm điểm qua cây tiêu chuẩn mới.
 */
import { ch17EvidenceLabel } from "./nkbv-ch17-evidence-catalog";
import {
  ch17EvidenceKeysForType,
  ch17OperationalTypeCodes,
  ch17TypeDef,
  evaluateCh17Type,
} from "./nkbv-ch17-definitions";
import { normalizeCh17EvidenceFlags } from "./nkbv-ch17-legacy-flags";

export type Ch17SignDef = {
  key: string;
  label_vi: string;
};

export type Ch17SiteRule = {
  site: string;
  name_vi: string;
  /** @deprecated Dùng evaluateCh17Type — giữ để UI cũ đếm tạm */
  min_signs: number;
  signs: readonly Ch17SignDef[];
  allowed_procedures?: readonly string[];
};

export function ch17RuleForSite(siteCode: string | null | undefined): Ch17SiteRule | null {
  const def = ch17TypeDef(siteCode);
  if (!def) return null;
  const keys = ch17EvidenceKeysForType(def.code);
  return {
    site: def.code,
    name_vi: def.name_vi,
    min_signs: 1,
    allowed_procedures: def.allowed_procedures,
    signs: keys.map((key) => ({ key, label_vi: ch17EvidenceLabel(key) })),
  };
}

export function countCh17Signs(
  rule: Ch17SiteRule,
  flags: Record<string, boolean> | null | undefined,
): number {
  const f = normalizeCh17EvidenceFlags(flags);
  return rule.signs.reduce((n, s) => n + (f[s.key] === true ? 1 : 0), 0);
}

export function isCh17SiteCriteriaMet(input: {
  siteCode: string | null | undefined;
  flags?: Record<string, boolean> | null;
  procedureCode?: string | null;
  isInfantLe1?: boolean;
}): { applicable: boolean; met: boolean; reason: string; rule: Ch17SiteRule | null } {
  const rule = ch17RuleForSite(input.siteCode);
  const r = evaluateCh17Type({
    typeCode: input.siteCode,
    evidence: normalizeCh17EvidenceFlags(input.flags),
    procedureCode: input.procedureCode,
    isInfantLe1: input.isInfantLe1,
  });
  return {
    applicable: r.applicable,
    met: r.met,
    reason: r.reason,
    rule,
  };
}

export function ch17OperationalSites(): string[] {
  return ch17OperationalTypeCodes();
}
