// src/modules/cssd-su-co/components/SuCoReportForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  AlertCircle,
  FlaskConical,
  Cpu,
  Wrench,
  Layers,
  AlertTriangle,
  QrCode,
  FileText,
  Printer,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { fetchSuCoFormCatalog, resolveSuCoFaultTrace } from "../actions/su-co-form-catalog.actions";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createIncidentReport, getIncidentForPrint } from "../actions/su-co-report.actions";
import {
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import {
  CHEMICAL_QUALITY_INCIDENT,
  isInstrumentIncidentImageRequired,
  OTHER_GENERIC_INCIDENT,
} from "../domain/cssd-incident-trace";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import IncidentPrintView from "./IncidentPrintView";
import InstrumentIncidentFields, { type InstrumentIncidentFormState } from "./InstrumentIncidentFields";
import SuCoIncidentMetaFields, {
  defaultDetectionDateTimeLocal,
  type SuCoIncidentMetaState,
} from "./SuCoIncidentMetaFields";

export type SuCoReportFormProps = {
  initialStation: Station;
  initialGroup?: IncidentGroup;
  initialMaQR?: string;
  initialChiTietId?: string;
  initialLoaiDungCuId?: string;
  initialTypeId?: string;
  quyTrinhId?: string | null;
  allowStationOverride?: boolean;
  enabled: boolean;
  onSubmitted?: () => void;
};

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

function groupTypeDefaults(group: IncidentGroup) {
  if (group === "CHEMICAL") return CHEMICAL_QUALITY_INCIDENT;
  if (group === "OTHER") return OTHER_GENERIC_INCIDENT;
  const options = INCIDENT_TYPE_PRESETS[group];
  const first = options[0];
  return { typeId: first?.code || "", typeTen: first?.label || "" };
}

export default function SuCoReportForm({
  initialStation,
  initialGroup,
  initialMaQR,
  initialChiTietId,
  initialLoaiDungCuId,
  initialTypeId,
  quyTrinhId,
  allowStationOverride = false,
  enabled,
  onSubmitted,
}: SuCoReportFormProps) {
  const { userData } = usePermission();
  const nguoiLapLabel =
    String(userData?.ho_ten || "").trim() || String(userData?.email || "").trim() || "Nhân viên CSSD";

  const [loading, setLoading] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [detectionStation, setDetectionStation] = useState<Station>(initialStation);
  const [incidentGroup, setIncidentGroup] = useState<IncidentGroup>(initialGroup || "PROCESS");
  const [instrumentState, setInstrumentState] = useState<InstrumentIncidentFormState | null>(null);
  const [typeId, setTypeId] = useState(initialTypeId || INCIDENT_TYPE_PRESETS.PROCESS[0]?.code || "");
  const [typeTen, setTypeTen] = useState(
    INCIDENT_TYPE_PRESETS.PROCESS.find((x) => x.code === initialTypeId)?.label ||
      INCIDENT_TYPE_PRESETS.PROCESS[0]?.label ||
      "",
  );
  const [maQR, setMaQR] = useState(initialMaQR || "");
  const [faultStation, setFaultStation] = useState<Station>(initialStation);
  const [machineId, setMachineId] = useState("");
  const [maLo, setMaLo] = useState("");
  const [viTriPhatHien, setViTriPhatHien] = useState("");
  const [meta, setMeta] = useState<SuCoIncidentMetaState>(() => ({
    thoiGianPhatHien: defaultDetectionDateTimeLocal(),
    nguoiPhatHien: "",
    nguoiLienQuan: "",
    moTa: "",
    anhMinhChung: "",
  }));
  const [machines, setMachines] = useState<{ id: string; ten: string }[]>([]);
  const [chemicals, setChemicals] = useState<{ id: string; ten: string; ma: string }[]>([]);
  const [submittedIncident, setSubmittedIncident] = useState<{ incident: any; details: any[] } | null>(null);

  useEffect(() => {
    if (!allowStationOverride) setDetectionStation(initialStation);
  }, [initialStation, allowStationOverride]);

  const activeGroupOptions = useMemo(() => INCIDENT_TYPE_PRESETS[incidentGroup], [incidentGroup]);
  const showTypePicker = incidentGroup === "PROCESS" || incidentGroup === "INSTRUMENT" || incidentGroup === "EQUIPMENT";
  const imageRequired = incidentGroup === "INSTRUMENT" && isInstrumentIncidentImageRequired(typeId);
  const imageHidden = incidentGroup === "INSTRUMENT" && typeId === "INSTRUMENT_MISSING";

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      setFLoading(true);
      setFError(null);
      try {
        const res = await fetchSuCoFormCatalog();
        if (!res.success) throw new Error(res.error);
        setMachines(res.machines);
        setChemicals(res.chemicals || []);
      } catch (err: unknown) {
        setFError(err instanceof Error ? err.message : "Lỗi tải danh mục");
      } finally {
        setFLoading(false);
      }
    })();
  }, [enabled]);

  useEffect(() => {
    const defaults = groupTypeDefaults(incidentGroup);
    setTypeId(defaults.typeId);
    setTypeTen(defaults.typeTen);
    setFaultStation(detectionStation);
    if (incidentGroup === "OTHER" || incidentGroup === "CHEMICAL") {
      setMaQR("");
      setMachineId("");
      setMaLo("");
    }
    if (incidentGroup !== "PROCESS" && incidentGroup !== "INSTRUMENT" && incidentGroup !== "EQUIPMENT") {
      setMaQR("");
    }
  }, [incidentGroup, detectionStation]);

  const runFaultTrace = useCallback(
    async (qr: string, station: Station, silent = false) => {
      const code = qr.trim().toUpperCase();
      if (!code || incidentGroup !== "PROCESS") return;
      setTracing(true);
      try {
        const res = await resolveSuCoFaultTrace(code, station);
        if (!res.success) {
          if (!silent) toast.error(res.error || "Không truy vết được người liên quan.");
          return;
        }
        if (res.operatorName) {
          setMeta((m) => ({ ...m, nguoiLienQuan: res.operatorName! }));
          if (!silent) toast.success(`Truy vết: ${res.operatorName} (${INCIDENT_STATION_OPTIONS.find((s) => s.value === station)?.label})`);
        } else if (!silent) {
          toast.info("Khâu này chưa ghi nhận người thực hiện — bạn có thể nhập tay.");
        }
      } finally {
        setTracing(false);
      }
    },
    [incidentGroup],
  );

  useEffect(() => {
    if (incidentGroup !== "PROCESS" || !maQR.trim()) return;
    void runFaultTrace(maQR, faultStation, true);
  }, [incidentGroup, maQR, faultStation, runFaultTrace]);

  const handleQrKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, mode: "SET" | "MACHINE" = "SET") => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const raw = maQR.trim();
    if (!raw) return;

    setLoading(true);
    try {
      const { resolveCssdCodeAction } = await import("@/modules/cssd-erp/actions/cssd-qr.actions");
      const res = await resolveCssdCodeAction(raw);
      if (!res.success) {
        toast.error(res.error || "Không nhận diện được mã QR.");
        return;
      }
      if (mode === "MACHINE" || res.targetType === "MACHINE") {
        setIncidentGroup("EQUIPMENT");
        setMachineId(res.machineId || "");
        setMaQR("");
        toast.success(`Đã nhận diện máy: ${res.machineCode || res.machineId}`);
        return;
      }
      setMaQR(res.code);
      toast.success(`Đã quét bộ: ${res.code}`);
      if (incidentGroup === "PROCESS") await runFaultTrace(res.code, faultStation);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi quét QR");
    } finally {
      setLoading(false);
    }
  };

  const handleMetaChange = (key: keyof SuCoIncidentMetaState, val: string) => {
    setMeta((m) => ({ ...m, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((incidentGroup === "PROCESS" || incidentGroup === "INSTRUMENT") && !maQR.trim()) {
      return toast.error(`Nhóm "${INCIDENT_GROUP_LABEL[incidentGroup]}" cần quét mã QR bộ dụng cụ.`);
    }
    if (!meta.moTa.trim()) return toast.error("Vui lòng điền mô tả chi tiết sự cố.");
    if (incidentGroup === "EQUIPMENT" && !machineId.trim()) {
      return toast.error("Vui lòng chọn hoặc quét máy gặp sự cố.");
    }
    if (incidentGroup === "CHEMICAL" && !machineId.trim()) {
      return toast.error("Vui lòng chọn hóa chất / vật tư liên quan.");
    }
    if (imageRequired && !meta.anhMinhChung.trim()) {
      return toast.error("Loại sự cố này bắt buộc có ảnh minh chứng.");
    }

    if (incidentGroup === "INSTRUMENT") {
      if (!instrumentState) return toast.error("Vui lòng chọn dụng cụ trong bộ.");
      if (typeId === "INSTRUMENT_TRANSFER" && !instrumentState.maQrDen) {
        return toast.error("Điều chuyển cần quét QR bộ đích.");
      }
      if (
        typeId !== "INSTRUMENT_REPLENISH" &&
        typeId !== "INSTRUMENT_TRANSFER" &&
        instrumentState.quantity > instrumentState.soLuongThucTe
      ) {
        return toast.error(`Số lượng không được vượt quá số thực tế (${instrumentState.soLuongThucTe}).`);
      }
    }

    setLoading(true);
    try {
      const faultStationPayload =
        incidentGroup === "PROCESS"
          ? faultStation
          : incidentGroup === "OTHER" && viTriPhatHien
            ? (viTriPhatHien as Station)
            : undefined;

      const payload = {
        maQR: maQR.trim() || undefined,
        typeId,
        typeTen,
        desc: meta.moTa,
        errorQR: maLo.trim() || undefined,
        machineId: machineId.trim() || undefined,
        faultOperator: meta.nguoiLienQuan.trim() || undefined,
        nguoiPhatHien: meta.nguoiPhatHien.trim() || undefined,
        thoiGianPhatHien: meta.thoiGianPhatHien || undefined,
        anhMinhChung: meta.anhMinhChung.trim() || undefined,
        station: detectionStation,
        incidentGroup,
        faultStation: faultStationPayload,
        instrumentPayload:
          incidentGroup === "INSTRUMENT" && instrumentState
            ? {
                chiTietId: instrumentState.chiTietId,
                loaiDungCuId: instrumentState.loaiDungCuId,
                boDungCuId: instrumentState.boDungCuId,
                quyTrinhId: quyTrinhId || undefined,
                maQrNguon: maQR.trim() || undefined,
                maQrDen: instrumentState.maQrDen || undefined,
                tenDungCuLe: instrumentState.tenDungCuLe,
                quantity: instrumentState.quantity,
              }
            : undefined,
      };

      try {
        const res = await createIncidentReport(payload);
        if (res.isRedAlert) {
          toast.error("⚠️ CẢNH BÁO ĐỎ: Bộ dụng cụ đã sự cố từ 2 lần trở lên.", { duration: 8000 });
        } else {
          toast.success("Đã ghi nhận báo cáo sự cố!");
        }
        if (res.incident_id) {
          const printData = await getIncidentForPrint(res.incident_id);
          if (printData.success) {
            setSubmittedIncident({ incident: printData.incident, details: printData.details });
            setTimeout(() => window.print(), 300);
          }
        }
        onSubmitted?.();
      } catch (err: unknown) {
        const { isNetworkError, pushOfflineTask } = await import("@/lib/offline-sync");
        if (isNetworkError(err)) {
          await pushOfflineTask("REPORT_INCIDENT", payload);
          toast.info("Đã lưu ngoại tuyến — sẽ đồng bộ khi có mạng.");
          onSubmitted?.();
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không gửi được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const resetAfterSubmit = () => {
    setMaQR("");
    setMachineId("");
    setMaLo("");
    setViTriPhatHien("");
    setTypeId(INCIDENT_TYPE_PRESETS.PROCESS[0]?.code || "");
    setTypeTen(INCIDENT_TYPE_PRESETS.PROCESS[0]?.label || "");
    setFaultStation(initialStation);
    setMeta({
      thoiGianPhatHien: defaultDetectionDateTimeLocal(),
      nguoiPhatHien: "",
      nguoiLienQuan: "",
      moTa: "",
      anhMinhChung: "",
    });
    setSubmittedIncident(null);
  };

  if (submittedIncident) {
    return (
      <div className="mx-auto my-6 max-w-2xl animate-in space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] fade-in duration-300">
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
            onClick={resetAfterSubmit}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-all hover:bg-slate-100 active:scale-[0.98] sm:w-auto"
          >
            <PlusCircle size={16} /> Báo cáo mới
          </button>
        </div>
        <IncidentPrintView incident={submittedIncident.incident} details={submittedIncident.details} />
      </div>
    );
  }

  const renderStationOverride = allowStationOverride ? (
    <div className="space-y-1.5 border-t border-slate-100 pt-3">
      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
      <select
        value={detectionStation}
        onChange={(e) => setDetectionStation(e.target.value as Station)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
      >
        {INCIDENT_STATION_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fError ? (
        <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-xs font-bold leading-tight">Không tải được danh mục: {fError}</div>
        </div>
      ) : null}

      {fLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-[var(--primary)]">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-40">Đang tải danh mục…</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
            <h4 className={bv103LayoutChrome.labelBlockAccent}>Bước 1: Chọn nhóm sự cố</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {INCIDENT_GROUPS.map((g) => {
                const IconComp = GROUP_ICONS[g];
                const isSelected = incidentGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setIncidentGroup(g)}
                    className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-[var(--primary)] bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/10"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-white text-slate-400"}`}>
                      <IconComp size={18} />
                    </div>
                    <span className={`text-[11px] font-semibold uppercase leading-tight tracking-wide ${isSelected ? "text-[var(--primary)]" : "text-slate-700"}`}>
                      {INCIDENT_GROUP_LABEL[g].split(" (")[0]}
                    </span>
                    <span className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">{GROUP_SUBTITLES[g]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
              <h4 className={`flex items-center gap-2 border-b border-slate-100 pb-3 ${UI.sectionTitle}`}>
                <FileText size={16} className="text-[var(--primary)]" />
                Ngữ cảnh sự cố
              </h4>

              {incidentGroup === "PROCESS" ? (
                <div className={UI.sectionGap}>
                  <QrField
                    label="Quét mã QR bộ dụng cụ *"
                    value={maQR}
                    onChange={setMaQR}
                    onKeyDown={(e) => void handleQrKeyDown(e)}
                    loading={loading || tracing}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Khâu phát sinh lỗi</label>
                      <select
                        value={faultStation}
                        onChange={(e) => setFaultStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700 outline-none focus:border-[var(--primary)]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    {showTypePicker ? (
                      <TypePicker
                        options={activeGroupOptions}
                        typeId={typeId}
                        onChange={(id, ten) => {
                          setTypeId(id);
                          setTypeTen(ten);
                        }}
                      />
                    ) : null}
                  </div>
                  {renderStationOverride}
                </div>
              ) : null}

              {incidentGroup === "INSTRUMENT" ? (
                <div className={UI.sectionGap}>
                  <QrField
                    label="Quét mã QR bộ dụng cụ *"
                    value={maQR}
                    onChange={setMaQR}
                    onKeyDown={(e) => void handleQrKeyDown(e)}
                    loading={loading}
                  />
                  <TypePicker
                    options={activeGroupOptions}
                    typeId={typeId}
                    onChange={(id, ten) => {
                      setTypeId(id);
                      setTypeTen(ten);
                    }}
                  />
                  <InstrumentIncidentFields
                    maQR={maQR}
                    typeId={typeId}
                    enabled={enabled}
                    quyTrinhId={quyTrinhId}
                    initialChiTietId={initialChiTietId}
                    initialLoaiDungCuId={initialLoaiDungCuId}
                    onChange={setInstrumentState}
                  />
                  {renderStationOverride}
                </div>
              ) : null}

              {incidentGroup === "CHEMICAL" ? (
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
              ) : null}

              {incidentGroup === "EQUIPMENT" ? (
                <div className={UI.sectionGap}>
                  <QrField
                    label="Quét mã QR máy (hoặc chọn bên dưới)"
                    value={maQR}
                    onChange={setMaQR}
                    onKeyDown={(e) => void handleQrKeyDown(e, "MACHINE")}
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
                  <TypePicker
                    options={activeGroupOptions}
                    typeId={typeId}
                    onChange={(id, ten) => {
                      setTypeId(id);
                      setTypeTen(ten);
                    }}
                  />
                  {renderStationOverride}
                </div>
              ) : null}

              {incidentGroup === "OTHER" ? (
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
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
              <h4 className={`flex items-center gap-2 border-b border-slate-100 pb-3 ${UI.sectionTitle}`}>
                <FileText size={16} className="text-[var(--primary)]" />
                Thông tin sự cố
              </h4>
              <SuCoIncidentMetaFields
                values={meta}
                nguoiLapLabel={nguoiLapLabel}
                imageRequired={imageRequired}
                imageHidden={imageHidden}
                onChange={handleMetaChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || tracing || !!fError || fLoading}
            className="flex h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-red-600 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Gửi báo cáo</>}
          </button>
        </div>
      )}
    </form>
  );
}

function QrField({
  label,
  value,
  onChange,
  onKeyDown,
  loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={bv103LayoutChrome.labelBlock}>{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          disabled={loading}
          className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-lg font-black uppercase tracking-widest text-red-600 outline-none transition-all focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-60"
          placeholder="QUÉT QR..."
        />
        <div className="absolute right-4 top-4 text-slate-300">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} className={value ? "text-[var(--primary)]" : ""} />}
        </div>
      </div>
    </div>
  );
}

function TypePicker({
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
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-[var(--primary)] focus:bg-white"
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
