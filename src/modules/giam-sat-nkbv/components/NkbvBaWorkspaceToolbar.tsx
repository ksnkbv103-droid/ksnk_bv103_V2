"use client";

import type { BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";

type Props = {
  analysisMode: BaAnalysisMode;
  isManual: boolean;
  preferVae: boolean;
  autoPreferVae: boolean;
  onSwitchMode: (mode: BaAnalysisMode) => void;
  onPreferVaeChange: (next: boolean) => void;
};

/** Thanh chú thích + chế độ CDC/Tự phân tích — tách khỏi mega workspace (UI only). */
export default function NkbvBaWorkspaceToolbar({
  analysisMode: _analysisMode,
  isManual,
  preferVae,
  autoPreferVae,
  onSwitchMode,
  onPreferVaeChange,
}: Props) {
  const effectivePreferVae = autoPreferVae || preferVae;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-[11px]">
      <span className="font-semibold text-slate-800">Bảng BA dọc (hàng = ngày)</span>
      <span className="text-slate-500">
        Cột chung gọn + cột phân tích cùng hàng (trượt ngang). Highlight theo cột: IPW / RIT / SBAP
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5 text-slate-600" title="Chú thích màu mốc thời gian">
        <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-950">Ngày X</span>
        <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-800">IPW</span>
        <span className="rounded bg-red-300 px-1.5 py-0.5 font-bold text-red-950">DOE</span>
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900">RIT</span>
        <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-900">SBAP</span>
      </span>
      <div
        className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5"
        title="Theo CDC: máy gợi ý kết luận. Tự phân tích: bạn tự viết kết luận."
      >
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-semibold ${
            !isManual ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-white"
          }`}
          onClick={() => onSwitchMode("CDC")}
        >
          Theo CDC
        </button>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-semibold ${
            isManual ? "bg-violet-700 text-white" : "text-slate-600 hover:bg-white"
          }`}
          onClick={() => onSwitchMode("MANUAL")}
        >
          Tự phân tích
        </button>
      </div>
      {isManual ? (
        <span className="rounded bg-violet-50 px-2 py-0.5 font-semibold text-violet-900">
          Tự phân tích — kết luận do bạn nhập
        </span>
      ) : null}
      <label className="ml-auto flex items-center gap-1 text-slate-600">
        <input
          type="checkbox"
          checked={effectivePreferVae}
          disabled={autoPreferVae}
          onChange={(e) => onPreferVaeChange(e.target.checked)}
        />
        Hô hấp → ưu tiên VAE
      </label>
      {autoPreferVae ? (
        <span className="rounded bg-purple-50 px-2 py-0.5 font-semibold text-purple-900">
          Người lớn thở máy ≥4 ngày — mở VAE, không cây PNEU/VAP
        </span>
      ) : null}
    </div>
  );
}
