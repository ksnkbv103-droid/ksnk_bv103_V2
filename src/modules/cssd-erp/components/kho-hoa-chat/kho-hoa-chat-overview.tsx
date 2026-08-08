"use client";

import React from "react";
import { Beaker, CalendarClock, AlertTriangle, Settings2 } from "lucide-react";
import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_SECTION_TITLE,
} from "../../shared/ui/cssd-ui-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Dm = {
  id: string;
  ma_hoa_chat: string;
};

type Props = {
  countSapHetHan: number;
  countDuoiNguong: number;
  dms: Dm[];
  canEdit: boolean;
  thrDm: string;
  thrVal: string;
  onThrDm: (v: string) => void;
  onThrVal: (v: string) => void;
  onSaveThr: () => void;
};

function StatInline({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "amber" | "rose" | "emerald";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : "text-emerald-600";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneClass}`}>
      {icon}
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-800">{value}</span>
    </span>
  );
}

export default function KhoHoaChatOverview({
  countSapHetHan,
  countDuoiNguong,
  dms,
  canEdit,
  thrDm,
  thrVal,
  onThrDm,
  onThrVal,
  onSaveThr,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
        <StatInline
          label="Hạn ≤ 30 ngày"
          value={countSapHetHan}
          icon={<CalendarClock size={14} className={countSapHetHan > 0 ? "animate-pulse" : undefined} />}
          tone="amber"
        />
        <StatInline
          label="Dưới ngưỡng"
          value={countDuoiNguong}
          icon={<AlertTriangle size={14} className={countDuoiNguong > 0 ? "animate-pulse" : undefined} />}
          tone="rose"
        />
        <StatInline label="Mặt hàng" value={dms.length} icon={<Beaker size={14} />} tone="emerald" />
      </div>

      <div className="flex flex-col gap-2 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Settings2 size={13} className="shrink-0 text-slate-500" />
          <span className={CSSD_UI_SECTION_TITLE}>Ngưỡng an toàn</span>
        </div>
        <div className="grid min-w-0 flex-[2] grid-cols-2 gap-1.5 sm:max-w-md">
          <select
            className={bv103LayoutChrome.controlSelectNative}
            value={thrDm}
            onChange={(e) => onThrDm(e.target.value)}
            disabled={!canEdit}
          >
            <option value="">Chọn HC/VT…</option>
            {dms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ma_hoa_chat}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={bv103LayoutChrome.controlInput}
            placeholder="Số lượng"
            value={thrVal}
            onChange={(e) => onThrVal(e.target.value)}
            disabled={!canEdit || !thrDm}
          />
        </div>
        <button
          type="button"
          className={`${CSSD_UI_ACTION_PRIMARY} w-full shrink-0 sm:w-auto`}
          disabled={!canEdit || !thrDm}
          onClick={() => void onSaveThr()}
        >
          Lưu ngưỡng
        </button>
      </div>
    </div>
  );
}
