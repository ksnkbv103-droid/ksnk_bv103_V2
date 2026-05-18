"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, Save } from "lucide-react";
import { exportQlcvMonthlyKpiCsv, getQlcvMonthlyKpiRows, upsertQlcvMonthEvaluation } from "../actions/qlcv-monthly.actions";
import type { QlcvMonthlyEvalRow } from "../types";
import {
  computeQlcvFinalScore,
  qlcvTierLabelVietnamese,
  QLCV_MONTHLY_SCORE_FORMULA_VI,
} from "../lib/qlcv-monthly-score";

function defaultMonthYyyyMm(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function monthStartFromYyyyMm(yyyyMm: string): string {
  return `${yyyyMm}-01`;
}

interface Props {
  canEdit: boolean;
}

export function QlcvMonthlyKpiPanel({ canEdit }: Props) {
  const [yyyyMm, setYyyyMm] = useState(defaultMonthYyyyMm);
  const thang = useMemo(() => monthStartFromYyyyMm(yyyyMm), [yyyyMm]);
  const [rows, setRows] = useState<QlcvMonthlyEvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { quality: string; comment: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQlcvMonthlyKpiRows(thang);
      setRows(data);
      const next: Record<string, { quality: string; comment: string }> = {};
      for (const r of data) {
        next[r.nhan_su_id] = {
          quality: r.quality_score != null ? String(r.quality_score) : "",
          comment: r.manager_comment ?? "",
        };
      }
      setDraft(next);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải KPI tháng.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.completion_pct - a.completion_pct), [rows]);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();

  const previewFinal = (r: QlcvMonthlyEvalRow) => {
    const d = draft[r.nhan_su_id];
    const q = d?.quality === "" ? null : Number(d?.quality);
    return computeQlcvFinalScore(r.on_time_pct, r.completion_pct, q);
  };

  const handleSave = async (r: QlcvMonthlyEvalRow) => {
    if (!canEdit) return;
    const d = draft[r.nhan_su_id];
    const qRaw = d?.quality?.trim() ?? "";
    const q = qRaw === "" ? null : Number(qRaw);
    if (q != null && (!Number.isInteger(q) || q < 1 || q > 5)) {
      toast.error("Chất lượng phải từ 1 đến 5 hoặc để trống.");
      return;
    }
    try {
      await upsertQlcvMonthEvaluation({
        thang,
        nhan_su_id: r.nhan_su_id,
        quality_score: q,
        manager_comment: d?.comment?.trim() || null,
      });
      toast.success("Đã lưu đánh giá.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không lưu được.");
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportQlcvMonthlyKpiCsv(thang);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qlcv-kpi-${yyyyMm}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải CSV.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không xuất được CSV.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">KPI & đánh giá tháng (server)</h3>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-500" title={QLCV_MONTHLY_SCORE_FORMULA_VI}>
            {QLCV_MONTHLY_SCORE_FORMULA_VI}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            Tháng
            <input
              type="month"
              value={yyyyMm}
              onChange={(e) => setYyyyMm(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} aria-hidden /> Tải lại
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} aria-hidden /> CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Top hoàn thành (% trong tháng)</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-950">
            {top.map((r, i) => (
              <li key={r.nhan_su_id} className="flex justify-between gap-2">
                <span>
                  {i + 1}. {r.ho_ten || r.nhan_su_id}
                </span>
                <span className="font-black tabular-nums">{r.completion_pct}%</span>
              </li>
            ))}
            {top.length === 0 && !loading ? <li className="text-slate-500">Không có dữ liệu</li> : null}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-950">Cần theo dõi (5 thấp nhất)</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-950">
            {bottom.map((r, i) => (
              <li key={r.nhan_su_id} className="flex justify-between gap-2">
                <span>
                  {i + 1}. {r.ho_ten || r.nhan_su_id}
                </span>
                <span className="font-black tabular-nums">{r.completion_pct}%</span>
              </li>
            ))}
            {bottom.length === 0 && !loading ? <li className="text-slate-500">Không có dữ liệu</li> : null}
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 py-10 text-center text-xs text-slate-500">
          Đang tải KPI từ RPC…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-slate-500">Không có phiếu gốc trong phạm vi tháng (theo RPC).</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-600">
                <th className="px-2 py-2">Họ tên</th>
                <th className="px-2 py-2 text-right" title="Phiếu gốc trong phạm vi tháng">
                  Phiếu
                </th>
                <th className="px-2 py-2 text-right">HT tháng</th>
                <th className="px-2 py-2 text-right">Đúng hạn</th>
                <th className="px-2 py-2 text-right" title="% hoàn thành trong tháng đúng hạn (có hạn)">
                  %ĐH
                </th>
                <th className="px-2 py-2 text-right" title="% hoàn thành / phiếu trong phạm vi">
                  %HT
                </th>
                <th className="px-2 py-2">Xếp loại</th>
                <th className="px-2 py-2">CL (1–5)</th>
                <th className="px-2 py-2 text-right">Điểm</th>
                <th className="px-2 py-2 min-w-[8rem]">Nhận xét</th>
                {canEdit ? <th className="px-2 py-2 w-24" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = draft[r.nhan_su_id] ?? { quality: "", comment: "" };
                const pv = previewFinal(r);
                const tier = qlcvTierLabelVietnamese(pv ?? r.final_score);
                return (
                  <tr key={r.nhan_su_id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-2 py-2 font-bold text-slate-800">{r.ho_ten}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.phieu_trong_thang}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.hoan_thanh_trong_thang}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.dung_han}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-700">{r.on_time_pct}%</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-slate-700">{r.completion_pct}%</td>
                    <td className="px-2 py-2 text-[11px] text-slate-600">{tier}</td>
                    <td className="px-2 py-2">
                      {canEdit ? (
                        <select
                          className="w-full rounded border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold"
                          value={d.quality}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.nhan_su_id]: { ...d, quality: e.target.value },
                            }))
                          }
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={String(n)}>
                              {n} sao
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px]">{r.quality_score ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-black text-[#026f17]">
                      {pv != null ? pv.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-2">
                      {canEdit ? (
                        <textarea
                          rows={2}
                          className="w-full min-w-[10rem] resize-y rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px]"
                          value={d.comment}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.nhan_su_id]: { ...d, comment: e.target.value },
                            }))
                          }
                        />
                      ) : (
                        <span className="text-[11px] text-slate-600">{r.manager_comment || "—"}</span>
                      )}
                    </td>
                    {canEdit ? (
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => void handleSave(r)}
                          className="bv103-control-h inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#026f17] px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#025a12]"
                        >
                          <Save size={12} aria-hidden /> Lưu
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canEdit ? (
        <p className="text-[10px] text-slate-400">Chỉ xem: cần quyền chỉnh sửa công việc để chấm sao và nhận xét.</p>
      ) : null}
    </div>
  );
}
