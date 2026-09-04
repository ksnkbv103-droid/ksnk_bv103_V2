"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  fetchSystemHealthBrief,
  type SystemHealthMetric,
} from "@/modules/quan-tri-he-thong/actions/system-health-brief.actions";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

type Props = { onOpen: (path: string) => void };

export default function QuanTriHubWorkQueue({ onOpen }: Props) {
  const [warns, setWarns] = useState<SystemHealthMetric[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemHealthBrief().then((res) => {
      if (cancelled || !res.success) return;
      setWarns(res.data.metrics.filter((m) => m.severity === "warn"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (warns.length === 0) return null;

  return (
    <section className={`${UI.inset} border-amber-200 bg-amber-50/50 p-3`} aria-labelledby="hub-can-xu-ly">
      <h2 id="hub-can-xu-ly" className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Cần xử lý
      </h2>
      <ul className="mt-2 space-y-1.5">
        {warns.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m.href)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/80"
            >
              <span className="font-medium text-slate-800">{m.label}</span>
              <span className="tabular-nums text-xs font-semibold text-amber-800">
                {m.count}
                {m.total != null ? <span className="font-medium text-slate-500"> / {m.total}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
