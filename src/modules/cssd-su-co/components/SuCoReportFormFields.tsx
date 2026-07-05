// src/modules/cssd-su-co/components/SuCoReportFormFields.tsx
"use client";

import React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  FlaskConical,
  Cpu,
  Wrench,
  Layers,
  AlertTriangle,
  QrCode,
  Printer,
  PlusCircle,
} from "lucide-react";
import QrCameraButton from "@/components/shared/QrCameraButton";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import {
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import IncidentPrintView from "./IncidentPrintView";

const GROUP_ICONS: Record<IncidentGroup, React.ComponentType<{ className?: string; size?: number }>> = {
  PROCESS: Layers,
  INSTRUMENT: Wrench,
  CHEMICAL: FlaskConical,
  EQUIPMENT: Cpu,
  OTHER: AlertTriangle,
};

const GROUP_SUBTITLES: Record<IncidentGroup, string> = {
  PROCESS: "Sai thao tác, QC khâu, chất lượng tiệt khuẩn…",
  INSTRUMENT: "Hỏng, mất, bổ sung, điều chuyển dụng cụ",
  CHEMICAL: "Sự cố chất lượng hóa chất / vật tư",
  EQUIPMENT: "Máy hỏng, thông số bất thường…",
  OTHER: "Tình huống đặc thù — form tối giản",
};

export function QrField({
  label,
  value,
  onChange,
  onKeyDown,
  onScanComplete,
  loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>{label}</label>
      <div className="relative flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          disabled={loading}
          className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-4 text-lg font-black uppercase tracking-widest text-red-600 outline-none transition-all focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-60"
          placeholder="QUÉT QR..."
        />
        <QrCameraButton
          disabled={loading}
          onScan={(code) => {
            onChange(code);
            onScanComplete?.(code);
          }}
          className="h-14 w-14 shrink-0 px-0"
          label=""
        />
        <div className="pointer-events-none absolute right-16 top-4 text-slate-300 sm:right-20">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} className={value ? "text-[var(--primary)]" : ""} />}
        </div>
      </div>
    </div>
  );
}

export function TypePicker({
  options,
  typeId,
  onChange,
}: {
  options: Array<{ code: string; label: string }>;
  typeId: string;
  onChange: (id: string, ten: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>Loại sự cố</label>
      <div className="relative">
        <select
          value={typeId}
          onChange={(e) => {
            const sel = options.find((c) => c.code === e.target.value);
            onChange(e.target.value, sel?.label || "");
          }}
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-[var(--primary)] focus:bg-white sm:text-base"
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={16} />
      </div>
    </div>
  );
}

export function IncidentGroupPicker({
  incidentGroup,
  onSelect,
  compact = false,
}: {
  incidentGroup: IncidentGroup;
  onSelect: (group: IncidentGroup) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`space-y-3 rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] ${compact ? "p-4" : "p-5"}`}
    >
      <h4 className={bv103LayoutChrome.labelBlockAccent}>Bước 1: Chọn nhóm sự cố</h4>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
        {INCIDENT_GROUPS.map((g) => {
          const IconComp = GROUP_ICONS[g];
          const isSelected = incidentGroup === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelect(g)}
              className={`group relative flex min-h-[5.5rem] touch-manipulation flex-col items-start rounded-xl border p-3 text-left transition-all sm:min-h-[6.5rem] sm:p-4 ${
                isSelected
                  ? "border-[var(--primary)] bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100/70 active:scale-[0.98]"
              }`}
            >
              <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg sm:mb-3 sm:h-9 sm:w-9 ${isSelected ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-white text-slate-400"}`}>
                <IconComp size={20} />
              </div>
              <span className={`text-xs font-semibold uppercase leading-tight tracking-wide sm:text-[11px] ${isSelected ? "text-[var(--primary)]" : "text-slate-700"}`}>
                {INCIDENT_GROUP_LABEL[g].split(" (")[0]}
              </span>
              <span className="mt-1 hidden text-[11px] font-medium leading-relaxed text-slate-400 sm:block">{GROUP_SUBTITLES[g]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StationOverrideSelect({
  value,
  onChange,
}: {
  value: Station;
  onChange: (station: Station) => void;
}) {
  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-3">
      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Station)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
      >
        {INCIDENT_STATION_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmittedSuccessView({
  incident,
  details,
  onReset,
}: {
  incident: any;
  details: any[];
  onReset: () => void;
}) {
  return (
    <div className="mx-auto my-4 max-w-2xl animate-in space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] fade-in duration-300 sm:my-6 sm:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-500/10">
        <CheckCircle2 size={36} />
      </div>
      <h3 className={UI.modalTitle}>Ghi nhận sự cố thành công!</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        Biên bản đã lưu. Hộp thoại in sẽ mở tự động.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-semibold uppercase tracking-wide text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
        >
          <Printer size={16} /> In biên bản
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-all hover:bg-slate-100 active:scale-[0.98] sm:w-auto"
        >
          <PlusCircle size={16} /> Báo cáo mới
        </button>
      </div>
      <IncidentPrintView incident={incident} details={details} />
    </div>
  );
}

export function ChemicalContextFields({
  machineId,
  setMachineId,
  maLo,
  setMaLo,
  chemicals,
  renderStationOverride,
}: {
  machineId: string;
  setMachineId: (v: string) => void;
  maLo: string;
  setMaLo: (v: string) => void;
  chemicals: { id: string; ten: string; ma: string }[];
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Hóa chất / vật tư *</label>
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-[var(--primary)]"
          required
        >
          <option value="">— Chọn từ danh mục —</option>
          {chemicals.map((c) => (
            <option key={c.id} value={c.id}>{c.ma} — {c.ten}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Mã lô (tùy chọn)</label>
        <input
          value={maLo}
          onChange={(e) => setMaLo(e.target.value.toUpperCase())}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none focus:border-[var(--primary)]"
          placeholder="Nhập mã lô nếu có..."
        />
      </div>
      {renderStationOverride}
    </div>
  );
}

export function EquipmentContextFields({
  maQR,
  setMaQR,
  onQrKeyDown,
  onScanComplete,
  loading,
  machineId,
  setMachineId,
  machines,
  typeOptions,
  typeId,
  onTypeChange,
  renderStationOverride,
}: {
  maQR: string;
  setMaQR: (v: string) => void;
  onQrKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanComplete?: (code: string) => void;
  loading: boolean;
  machineId: string;
  setMachineId: (v: string) => void;
  machines: { id: string; ten: string }[];
  typeOptions: Array<{ code: string; label: string }>;
  typeId: string;
  onTypeChange: (id: string, ten: string) => void;
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
      <QrField
        label="Quét mã QR máy (hoặc chọn bên dưới)"
        value={maQR}
        onChange={setMaQR}
        onKeyDown={onQrKeyDown}
        onScanComplete={onScanComplete}
        loading={loading}
      />
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Thiết bị gặp sự cố *</label>
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-[var(--primary)]"
        >
          <option value="">— Chọn máy —</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.ten}</option>
          ))}
        </select>
      </div>
      <TypePicker options={typeOptions} typeId={typeId} onChange={onTypeChange} />
      {renderStationOverride}
    </div>
  );
}

export function OtherContextFields({
  viTriPhatHien,
  setViTriPhatHien,
  renderStationOverride,
}: {
  viTriPhatHien: string;
  setViTriPhatHien: (v: string) => void;
  renderStationOverride: React.ReactNode;
}) {
  return (
    <div className={UI.sectionGap}>
      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>Vị trí phát hiện</label>
        <select
          value={viTriPhatHien}
          onChange={(e) => setViTriPhatHien(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700 outline-none focus:border-[var(--primary)]"
        >
          <option value="">— Chọn vị trí —</option>
          {INCIDENT_STATION_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {renderStationOverride}
    </div>
  );
}
