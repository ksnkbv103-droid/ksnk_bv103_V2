"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
  fetchSystemHealthBrief,
  type SystemHealthBrief,
} from "../actions/system-health-brief.actions";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

export function SystemHealthPanel() {
  const [data, setData] = useState<SystemHealthBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchSystemHealthBrief();
    if (!res.success) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={UI.sectionGap} aria-labelledby="system-health-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="system-health-heading" className={`${UI.panelTitle} flex items-center gap-2`}>
            <Activity className="h-4 w-4 text-teal-700" aria-hidden />
            Sức khỏe hệ thống
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Thống kê mô tả cho quản trị viên: tài khoản, khoa–khối, mã bộ CSSD, cấu hình bảng kiểm.
            Không liên quan chỉ số tuân thủ CCS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={`${UI.btnSecondary} gap-1.5 px-2.5 text-xs disabled:opacity-50`}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Cập nhật
        </button>
      </div>

      {error ? <div className={`${UI.noticeDanger} px-3 py-2 text-sm`}>{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.metrics ?? []).map((m) => (
          <div
            key={m.id}
            className={`${UI.inset} p-4 ${
              m.severity === "warn" ? "border-amber-200 bg-amber-50/60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">{m.label}</p>
              {m.severity === "warn" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              )}
            </div>
            <p className={`mt-2 ${UI.kpiValueSm}`}>
              {m.count}
              {m.total != null ? (
                <span className="ml-1 text-sm font-medium text-slate-500">/ {m.total}</span>
              ) : null}
            </p>
            <p className={`mt-1 ${UI.kpiCaption}`}>{m.hint}</p>
            <Link
              href={m.href}
              className="mt-2 inline-flex items-center gap-0.5 bv103-type-label font-semibold text-[var(--primary)]"
            >
              Mở sửa <ExternalLink size={11} aria-hidden />
            </Link>
          </div>
        ))}
        {loading && !data ? (
          <p className="col-span-full py-8 text-center text-sm text-slate-400">Đang tải sức khỏe hệ thống…</p>
        ) : null}
      </div>
    </section>
  );
}
