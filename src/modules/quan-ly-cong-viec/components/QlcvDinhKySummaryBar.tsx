"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ChevronUp } from "lucide-react";
import { listDinhKyMau } from "../actions/dinh-ky.actions";
import { filterMauDueInPeriod } from "../lib/qlcv-dinh-ky-period-match";
import {
  labelQlcvPeriodKind,
  resolveQlcvPeriodRange,
  type QlcvPeriodKind,
} from "../lib/qlcv-period-range";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import type { CongViecView } from "../types";

export type QlcvLoaiFilter = "ALL" | "DOT_XUAT" | "DINH_KY";

type Props = {
  tasks: CongViecView[];
  loaiFilter: QlcvLoaiFilter;
  onLoaiFilterChange: (v: QlcvLoaiFilter) => void;
  periodKind: QlcvPeriodKind;
  onPeriodKindChange: (v: QlcvPeriodKind) => void;
  filterBoardByPeriod: boolean;
  onFilterBoardByPeriodChange: (v: boolean) => void;
  onPrintExec?: () => void;
};

export function QlcvDinhKySummaryBar({
  tasks,
  loaiFilter,
  onLoaiFilterChange,
  periodKind,
  onPeriodKindChange,
  filterBoardByPeriod,
  onFilterBoardByPeriodChange,
  onPrintExec,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeMauCount, setActiveMauCount] = useState<number | null>(null);
  const [dueMauCount, setDueMauCount] = useState<number | null>(null);

  const period = useMemo(() => resolveQlcvPeriodRange(periodKind), [periodKind]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listDinhKyMau()
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((r) => r.is_active);
        setActiveMauCount(active.length);
        setDueMauCount(filterMauDueInPeriod(active, period).length);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveMauCount(null);
          setDueMauCount(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, period.startIso, period.endIso, period]);

  const periodTasks = useMemo(() => {
    return tasks.filter((t) => {
      const han = t.han_hoan_thanh ? String(t.han_hoan_thanh).slice(0, 10) : "";
      if (han && han >= period.startIso && han <= period.endIso) return true;
      const created = t.created_at ? String(t.created_at).slice(0, 10) : "";
      if (!han && created && created >= period.startIso && created <= period.endIso) return true;
      return false;
    });
  }, [tasks, period.startIso, period.endIso]);

  const dinhKyInPeriod = periodTasks.filter((t) => t.loai_cong_viec === "DINH_KY");
  const openDk = dinhKyInPeriod.filter((t) => {
    const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
    return st !== "HOAN_THANH" && st !== "DA_HUY";
  }).length;
  const doneDk = dinhKyInPeriod.filter(
    (t) => normalizeQlcvTrangThaiToCanonical(t.trang_thai) === "HOAN_THANH",
  ).length;

  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-700"
      >
        <span className="inline-flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-slate-500" aria-hidden />
          Xem theo kỳ · in thực thi
        </span>
        {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
      </button>
      {open ? (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-600">
            Kỳ {period.label}
            {activeMauCount != null ? (
              <>
                {" "}
                · Mẫu bật {activeMauCount}
                {dueMauCount != null ? ` · đến hạn ${dueMauCount}` : ""}
              </>
            ) : null}
            {" · "}
            Phiếu định kỳ: mở {openDk} / xong {doneDk}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm"
              value={loaiFilter}
              onChange={(e) => onLoaiFilterChange(e.target.value as QlcvLoaiFilter)}
              aria-label="Lọc loại công việc"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="DOT_XUAT">Đột xuất / khẩn cấp</option>
              <option value="DINH_KY">Định kỳ</option>
            </select>
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm"
              value={periodKind}
              onChange={(e) => onPeriodKindChange(e.target.value as QlcvPeriodKind)}
              aria-label="Kỳ tổng hợp"
            >
              {(["WEEK", "MONTH", "QUARTER", "YEAR"] as const).map((k) => (
                <option key={k} value={k}>
                  {labelQlcvPeriodKind(k)}
                </option>
              ))}
            </select>
            <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={filterBoardByPeriod}
                onChange={(e) => onFilterBoardByPeriodChange(e.target.checked)}
                className="rounded border-slate-300 text-[var(--primary)]"
              />
              Chỉ việc trong kỳ
            </label>
            {onPrintExec ? (
              <button
                type="button"
                onClick={onPrintExec}
                className="bv103-control-h rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                In bảng thực thi
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
