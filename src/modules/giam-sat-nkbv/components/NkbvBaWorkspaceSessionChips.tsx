"use client";

import {
  formatSessionChipLabel,
  type BaAnalysisSession,
} from "../lib/nkbv-ba-analysis-session";
import {
  shouldDeferPrimaryBsi,
  type SessionIndexSuggestion,
} from "../lib/nkbv-specimen-syndrome";
import { validateChronoPrecedence } from "../lib/nkbv-chrono-precedence";
import type { BaGridXnCell } from "../lib/nkbv-ba-grid-engine";
import type { ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";

type Props = {
  sessionSuggestions: SessionIndexSuggestion[];
  sessions: BaAnalysisSession[];
  openSessionId: string | null;
  establishedSiteSbaps: Array<{ start: string; end: string }>;
  xnList?: BaGridXnCell[];
  xnStatusById?: Record<string, ViSinhAnalysisStatus>;
  onOpenSuggestion: (s: SessionIndexSuggestion) => void;
  onSelectSession: (id: string) => void;
  onRemoveSession: (id: string) => void;
};

/** Chip gợi ý phiên + phiên đang mở — UI chrome có hiển thị thứ tự ưu tiên thời gian CDC/BYT. */
export default function NkbvBaWorkspaceSessionChips({
  sessionSuggestions,
  sessions,
  openSessionId,
  establishedSiteSbaps,
  xnList,
  xnStatusById,
  onOpenSuggestion,
  onSelectSession,
  onRemoveSession,
}: Props) {
  // Tìm index của gợi ý đầu tiên được phép phân tích (mốc sớm nhất chưa xử lý)
  let firstEligibleIndex = -1;
  for (let i = 0; i < sessionSuggestions.length; i++) {
    const s = sessionSuggestions[i];
    const chronoCheck =
      xnList && xnList.length
        ? validateChronoPrecedence({
            targetDate: s.index.date,
            targetId: s.index.id,
            xnList,
            statusById: xnStatusById,
          })
        : { allowed: true as const };
    if (chronoCheck.allowed) {
      firstEligibleIndex = i;
      break;
    }
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 font-semibold text-slate-600">Gợi ý phiên (theo Index):</span>
        {!sessionSuggestions.length ? (
          <span className="text-slate-400">—</span>
        ) : (
          sessionSuggestions.map((s, idx) => {
            const opened = sessions.some((x) => x.id === s.id);
            const active = s.id === openSessionId;
            const bloodInSiteSbap =
              s.panel === "BSI" &&
              shouldDeferPrimaryBsi({
                selectedSpecimenPanel: "BSI",
                bloodDate: s.index.date,
                establishedSiteSbaps,
              });

            const chronoCheck =
              xnList && xnList.length
                ? validateChronoPrecedence({
                    targetDate: s.index.date,
                    targetId: s.index.id,
                    xnList,
                    statusById: xnStatusById,
                  })
                : { allowed: true as const };

            const isBlockedByChrono = !chronoCheck.allowed;
            const isPriority = idx === firstEligibleIndex;
            const orderNum = idx + 1;

            const tooltip = isBlockedByChrono
              ? chronoCheck.message
              : bloodInSiteSbap
                ? "Máu ∈ SBAP ổ tại chỗ — bấm để rà Secondary trước; chỉ Primary khi không khớp/loại trừ"
                : isPriority
                  ? `Mốc ưu tiên phân tích theo dòng thời gian (${s.index.date}) — ${s.source} → ${s.panel}`
                  : `${orderNum}. ${s.source} → ${s.panel} (${s.index.date})`;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSuggestion(s)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors ${
                  isBlockedByChrono
                    ? "border-dashed border-amber-300 bg-amber-50/50 text-amber-900/80 hover:border-amber-400"
                    : bloodInSiteSbap
                      ? "border-amber-200 bg-amber-50/70 text-amber-900/80"
                      : active
                        ? "border-rose-400 bg-rose-50 text-rose-900 shadow-xs"
                        : opened
                          ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                          : isPriority
                            ? "border-sky-300 bg-sky-50 text-sky-900 shadow-xs hover:border-sky-400"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                title={tooltip}
              >
                {isBlockedByChrono ? (
                  <span className="text-amber-600 font-normal">⏳ {orderNum}.</span>
                ) : isPriority && !opened && !active ? (
                  <span className="rounded bg-sky-200/80 px-1 py-0.2 text-[11px] font-bold text-sky-900">
                    {orderNum}. Ưu tiên
                  </span>
                ) : (
                  <span className="text-slate-500 font-normal">{orderNum}.</span>
                )}
                <span>
                  {s.panel} · {s.label}
                </span>
                {bloodInSiteSbap ? <span className="text-amber-800">· rà SBAP</span> : null}
                {isBlockedByChrono && chronoCheck.earliestUnresolved ? (
                  <span className="text-[11px] text-amber-700 font-medium">
                    · chờ {chronoCheck.earliestUnresolved.date.slice(5)}
                  </span>
                ) : null}
                {opened && !active && !bloodInSiteSbap && !isBlockedByChrono ? (
                  <span className="text-emerald-700">· đã mở</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 font-semibold text-slate-600">Đang phân tích:</span>
        {!sessions.length ? (
          <span className="text-slate-400">Chưa mở phiên</span>
        ) : (
          sessions.map((s) => {
            const active = s.id === openSessionId;
            return (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                  active
                    ? "border-rose-400 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <button type="button" onClick={() => onSelectSession(s.id)} title="Mở lại phiên">
                  {formatSessionChipLabel(s)}
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-600"
                  title="Xóa phiên nháp"
                  onClick={() => onRemoveSession(s.id)}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
        <span className="ml-auto text-[11px] text-slate-400">
          Chỉ từ XN / CĐHA / TC DOE SSI — phiếu khi bấm «Tạo phiếu»
        </span>
      </div>
    </div>
  );
}
