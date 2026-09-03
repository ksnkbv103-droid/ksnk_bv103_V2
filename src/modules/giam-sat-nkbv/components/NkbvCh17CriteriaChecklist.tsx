"use client";

/**
 * Checklist Ch.17 sinh từ cây tiêu chuẩn — dùng SSI Organ/Space và ca độc lập.
 */
import { ch17CriterionVisibleForAge } from "../lib/nkbv-age-ui";
import { evalCh17Node } from "../lib/nkbv-ch17-criteria";
import { ch17EvidenceLabel } from "../lib/nkbv-ch17-evidence-catalog";
import {
  ch17CriteriaSummaryForType,
  ch17TypeDef,
  evaluateCh17Type,
} from "../lib/nkbv-ch17-definitions";
import { normalizeCh17EvidenceFlags } from "../lib/nkbv-ch17-legacy-flags";

type Props = {
  typeCode: string | null | undefined;
  flags: Record<string, boolean>;
  procedureCode?: string | null;
  isInfantLe1?: boolean;
  allowedEdit: boolean;
  onFlagsChange: (flags: Record<string, boolean>) => void;
};

export default function NkbvCh17CriteriaChecklist({
  typeCode,
  flags,
  procedureCode,
  isInfantLe1,
  allowedEdit,
  onFlagsChange,
}: Props) {
  const def = ch17TypeDef(typeCode);
  if (!def) {
    return typeCode ? (
      <p className="text-[11px] text-slate-500">
        Site {typeCode}: dùng tiêu chí Organ/Space chung (mủ dẫn lưu / cấy / áp xe) nếu không có
        định nghĩa cây Ch.17.
      </p>
    ) : null;
  }

  const infant = !!isInfantLe1;
  const summary = ch17CriteriaSummaryForType(def.code).filter((c) => {
    const crit = def.criteria.find((x) => x.code === c.code);
    if (!crit) return true;
    return ch17CriterionVisibleForAge(crit.node, infant);
  });
  const evidence = normalizeCh17EvidenceFlags(flags);
  const ctx = { evidence, procedureCode, isInfantLe1: infant };
  const status = evaluateCh17Type({
    typeCode: def.code,
    ...ctx,
  });

  const toggle = (key: string, checked: boolean) => {
    onFlagsChange({ ...flags, [key]: checked });
  };

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-violet-950">
          Tiêu chuẩn Chương 17 — {def.name_vi}
        </p>
        <p
          className={`text-[11px] font-medium ${status.met ? "text-emerald-800" : "text-amber-900"}`}
        >
          {status.met
            ? `Đạt ${status.metCriterion}`
            : status.missing.length
              ? `Chưa đạt — thiếu: ${status.missing
                  .slice(0, 4)
                  .map((k) => ch17EvidenceLabel(k))
                  .join("; ")}`
              : "Chưa đạt tiêu chuẩn"}
        </p>
      </div>
      {summary.map((c) => {
        const crit = def.criteria.find((x) => x.code === c.code);
        const thisMet = crit ? evalCh17Node(crit.node, ctx).ok : false;
        return (
          <div key={c.code} className="rounded-lg border border-violet-100/80 bg-white/80 p-2 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-800">
              {c.code}
              {thisMet ? " ✓" : ""} — {c.label_vi}
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {c.keys.map((key) => (
                <label
                  key={`${c.code}-${key}`}
                  className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={evidence[key] === true}
                    disabled={!allowedEdit}
                    onChange={(e) => toggle(key, e.target.checked)}
                  />
                  <span>{ch17EvidenceLabel(key)}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <p className="bv103-type-label text-slate-500">
        Đạt khi thỏa <strong>ít nhất một</strong> tiêu chuẩn (OR). Trong mỗi tiêu chuẩn: AND / ≥N
        theo NHSN.
      </p>
    </div>
  );
}
