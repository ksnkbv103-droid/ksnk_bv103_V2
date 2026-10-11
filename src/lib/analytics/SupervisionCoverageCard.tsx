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
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Độ phủ giám sát">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="bv103-type-section text-slate-800">Độ phủ giám sát</h2>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-800">
            {loading ? "…" : `${covered}/${total} khoa`}
          </span>
          {!loading && pct != null ? <span className="tabular-nums"> ({pct}%)</span> : null}
          {!loading && tongPhien != null ? (
            <span className="tabular-nums"> · {tongPhien.toLocaleString()} phiên</span>
          ) : null}
        </p>
      </div>
      {!loading && total > 0 ? (
        <p className="mt-1 text-[11px] text-slate-500">
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
