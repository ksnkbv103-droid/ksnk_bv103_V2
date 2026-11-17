import type { SupervisionCoverageSummary } from "./supervision-coverage";

const MAX_LISTED = 6;

export function SupervisionCoverageCard({
  summary,
  tongPhien,
  loading,
}: {
  summary: SupervisionCoverageSummary;
  tongPhien?: number;
  loading?: boolean;
}) {
  const { total, covered, tgsCovered, ksnkCovered, uncovered, pct } = summary;
  const shown = uncovered.slice(0, MAX_LISTED);
  return (
    <section className="bv103-card" aria-label="Độ phủ giám sát">
      <div className="bv103-card-head flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2">
        <h2 className="text-base font-semibold text-slate-900">Độ phủ giám sát</h2>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-800">
            {loading ? "…" : `${covered}/${total} khoa`}
          </span>
          {!loading && pct != null ? <span className="tabular-nums"> ({pct}%)</span> : null}
          {!loading && tongPhien != null ? (
            <span className="tabular-nums"> · {tongPhien.toLocaleString("vi-VN")} phiên</span>
          ) : null}
        </p>
      </div>
      {!loading && total > 0 ? (
        <p className="px-5 py-4 text-sm leading-relaxed text-slate-600">
          Chuyên trách {ksnkCovered}/{total} · tự giám sát {tgsCovered}/{total} (khoa có ít nhất một lượt trong kỳ).
          {uncovered.length > 0 ? (
            <>
              {" "}Chưa có lượt: {shown.join(", ")}
              {uncovered.length > shown.length ? ` và ${uncovered.length - shown.length} khoa khác` : ""}.
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
