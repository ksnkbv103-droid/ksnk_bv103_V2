"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { listDinhKyMau } from "../actions/dinh-ky.actions";
import { listNhiemVuOptions, type NhiemVuSelectOption } from "../actions/nhiem-vu.actions";
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
  /** Khi bật: bảng/Kanban chỉ hiện phiếu có hạn trong kỳ. */
  filterBoardByPeriod: boolean;
  onFilterBoardByPeriodChange: (v: boolean) => void;
  nhiemVuFilter?: string;
  onNhiemVuFilterChange?: (v: string) => void;
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
  nhiemVuFilter = "",
  onNhiemVuFilterChange,
  onPrintExec,
}: Props) {
  const [activeMauCount, setActiveMauCount] = useState<number | null>(null);
  const [dueMauCount, setDueMauCount] = useState<number | null>(null);
  const [nhiemVuOpts, setNhiemVuOpts] = useState<NhiemVuSelectOption[]>([]);

  const period = useMemo(() => resolveQlcvPeriodRange(periodKind), [periodKind]);

  useEffect(() => {
    void listNhiemVuOptions()
      .then(setNhiemVuOpts)
      .catch(() => setNhiemVuOpts([]));
  }, []);

  useEffect(() => {
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
  }, [period.startIso, period.endIso, period]);

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
  const overdueDk = dinhKyInPeriod.filter((t) => t.is_qua_han || normalizeQlcvTrangThaiToCanonical(t.trang_thai) === "QUA_HAN").length;

  return (
    <div className="rounded-[var(--radius-shell)] border border-emerald-100/90 bg-emerald-50/40 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarRange className="h-4 w-4 text-[var(--primary)]" aria-hidden />
            Tổng hợp kỳ — {period.label}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Mẫu đang bật: <strong>{activeMauCount ?? "—"}</strong>
            {dueMauCount != null ? (
              <>
                {" "}
                · Mẫu đến hạn trong kỳ: <strong>{dueMauCount}</strong>
              </>
            ) : null}
            {" · "}
            Phiếu định kỳ trong kỳ: mở {openDk} / xong {doneDk}
            {overdueDk > 0 ? ` / quá hạn ${overdueDk}` : ""}
          </p>
        </div>
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
          {onNhiemVuFilterChange ? (
            <select
              className="h-10 max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm"
              value={nhiemVuFilter}
              onChange={(e) => onNhiemVuFilterChange(e.target.value)}
              aria-label="Lọc theo kế hoạch năm / nhiệm vụ"
            >
              <option value="">Tất cả (kế hoạch năm)</option>
              <option value="__NONE__">Chưa gắn nhiệm vụ</option>
              {nhiemVuOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}
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
            Lọc bảng theo kỳ
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
    </div>
  );
}
