"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import type { DanhMucHubRow } from "@/lib/master-data/danh-muc-hub-catalog";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";
import { formatDateVi } from "@/lib/format-datetime-vi";

/** Sơ đồ tổ chức nhẹ: Khối khoa → Khoa phòng (Wave 4). */
export default function OrgStructurePanel(props: { khoiCount?: number; khoaCount?: number }) {
  const khoi = props.khoiCount ?? 0;
  const khoa = props.khoaCount ?? 0;
  return (
    <div className={`${UI.sectionGap} rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cấu trúc tổ chức</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/quan-tri-he-thong/danh-muc/chuyen-biet/KHOI_KHOA"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-[var(--primary)]/30"
        >
          <Building2 className="h-4 w-4 text-slate-500" aria-hidden />
          <span>
            <strong className="font-semibold text-slate-800">{khoi}</strong> khối khoa
          </span>
        </Link>
        <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden />
        <Link
          href="/quan-tri-he-thong/danh-muc/khoa-phong"
          className="inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 hover:border-rose-300"
        >
          <Building2 className="h-4 w-4 text-rose-600" aria-hidden />
          <span>
            <strong className="font-semibold text-slate-800">{khoa}</strong> khoa phòng
          </span>
        </Link>
      </div>
    </div>
  );
}

export function DanhMucRecentChangesPanel(props: { rows: DanhMucHubRow[]; onOpen: (path: string) => void }) {
  if (!props.rows.length) return null;
  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cập nhật gần đây</p>
      <ul className="mt-2 space-y-1">
        {props.rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => props.onOpen(r.path)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-700">{r.name}</span>
              <time className="text-xs tabular-nums text-slate-400" dateTime={r.stats?.last}>
                {formatDateVi(r.stats?.last)}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
