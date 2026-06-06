"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";
import { getQlcvCommandCenterSnapshot } from "@/modules/quan-ly-cong-viec/actions/dashboard.actions";

type Snapshot = Awaited<ReturnType<typeof getQlcvCommandCenterSnapshot>>;

export function QlcvCommandCenterCard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getQlcvCommandCenterSnapshot();
        if (!cancelled) setData(snap);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Công việc KSNK…
      </div>
    );
  }

  if (error || !data) return null;

  const { stats, overdue } = data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList size={16} className="text-[#026f17]" aria-hidden />
          Công việc KSNK
        </h3>
        <Link
          href="/quan-ly-cong-viec"
          className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)] hover:underline"
        >
          Mở module
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Tổng phiếu", v: stats.tong_cong_viec },
          { label: "Đang làm", v: stats.dang_lam },
          { label: "Hoàn thành", v: stats.hoan_thanh },
          { label: "Quá hạn", v: stats.qua_han, warn: true },
        ].map((x) => (
          <div key={x.label} className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">{x.label}</p>
            <p className={`text-lg font-black tabular-nums ${x.warn ? "text-red-700" : "text-slate-800"}`}>{x.v}</p>
          </div>
        ))}
      </div>
      {overdue.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
          {overdue.slice(0, 3).map((t) => (
            <li key={String(t.id)} className="truncate">
              <span className="font-semibold text-red-700">Quá hạn:</span> {String(t.tieu_de || "—")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
