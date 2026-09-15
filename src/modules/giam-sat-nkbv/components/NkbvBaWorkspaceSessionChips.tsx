"use client";

import {
  formatSessionChipLabel,
  type BaAnalysisSession,
} from "../lib/nkbv-ba-analysis-session";
import {
  shouldDeferPrimaryBsi,
  type SessionIndexSuggestion,
} from "../lib/nkbv-specimen-syndrome";

type Props = {
  sessionSuggestions: SessionIndexSuggestion[];
  sessions: BaAnalysisSession[];
  openSessionId: string | null;
  establishedSiteSbaps: Array<{ start: string; end: string }>;
  onOpenSuggestion: (s: SessionIndexSuggestion) => void;
  onSelectSession: (id: string) => void;
  onRemoveSession: (id: string) => void;
};

/** Chip gợi ý phiên + phiên đang mở — UI chrome, không đụng engine phân loại. */
export default function NkbvBaWorkspaceSessionChips({
  sessionSuggestions,
  sessions,
  openSessionId,
  establishedSiteSbaps,
  onOpenSuggestion,
  onSelectSession,
  onRemoveSession,
}: Props) {
  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 font-semibold text-slate-600">Gợi ý phiên (theo Index):</span>
        {!sessionSuggestions.length ? (
          <span className="text-slate-400">—</span>
        ) : (
          sessionSuggestions.map((s) => {
            const opened = sessions.some((x) => x.id === s.id);
            const active = s.id === openSessionId;
            const bloodInSiteSbap =
              s.panel === "BSI" &&
              shouldDeferPrimaryBsi({
                selectedSpecimenPanel: "BSI",
                bloodDate: s.index.date,
                establishedSiteSbaps,
              });
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSuggestion(s)}
                className={`rounded-full border px-2.5 py-1 font-semibold ${
                  bloodInSiteSbap
                    ? "border-amber-200 bg-amber-50/70 text-amber-900/80"
                    : active
                      ? "border-rose-400 bg-rose-50 text-rose-900"
                      : opened
                        ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                title={
                  bloodInSiteSbap
                    ? "Máu ∈ SBAP ổ tại chỗ — bấm để rà Secondary trước; chỉ Primary khi không khớp/loại trừ"
                    : `${s.source} → ${s.panel}`
                }
              >
                {s.panel} · {s.label}
                {bloodInSiteSbap ? " · rà SBAP" : ""}
                {opened && !active && !bloodInSiteSbap ? " · đã mở" : ""}
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
