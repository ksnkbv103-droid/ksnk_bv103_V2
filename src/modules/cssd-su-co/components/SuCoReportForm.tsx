// src/modules/cssd-su-co/components/SuCoReportForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, Loader2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { fetchSuCoFormCatalog, resolveSuCoFaultTrace } from "../actions/su-co-form-catalog.actions";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createIncidentReport, getIncidentForPrint } from "../actions/su-co-report.actions";
import {
  INCIDENT_GROUP_LABEL,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { isInstrumentIncidentImageRequired } from "../domain/cssd-incident-trace";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import InstrumentIncidentFields, { type InstrumentIncidentFormState } from "./InstrumentIncidentFields";
import SuCoIncidentMetaFields, {
  defaultDetectionDateTimeLocal,
  type SuCoIncidentMetaState,
} from "./SuCoIncidentMetaFields";
import {
  ChemicalContextFields,
  EquipmentContextFields,
  IncidentGroupPicker,
  OtherContextFields,
  QrField,
  StationOverrideSelect,
  SubmittedSuccessView,
  TypePicker,
} from "./SuCoReportFormFields";
import { groupTypeDefaults } from "./su-co-report-form.helpers";

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
      <SubmittedSuccessView
        incident={submittedIncident.incident}
        details={submittedIncident.details}
        onReset={resetAfterSubmit}
      />
    );
  }

  const renderStationOverride = allowStationOverride ? (
    <StationOverrideSelect value={detectionStation} onChange={setDetectionStation} />
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
          <IncidentGroupPicker incidentGroup={incidentGroup} onSelect={setIncidentGroup} />

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
                <ChemicalContextFields
                  machineId={machineId}
                  setMachineId={setMachineId}
                  maLo={maLo}
                  setMaLo={setMaLo}
                  chemicals={chemicals}
                  renderStationOverride={renderStationOverride}
                />
              ) : null}

              {incidentGroup === "EQUIPMENT" ? (
                <EquipmentContextFields
                  maQR={maQR}
                  setMaQR={setMaQR}
                  onQrKeyDown={(e) => void handleQrKeyDown(e, "MACHINE")}
                  loading={loading}
                  machineId={machineId}
                  setMachineId={setMachineId}
                  machines={machines}
                  typeOptions={activeGroupOptions}
                  typeId={typeId}
                  onTypeChange={(id, ten) => {
                    setTypeId(id);
                    setTypeTen(ten);
                  }}
                  renderStationOverride={renderStationOverride}
                />
              ) : null}

              {incidentGroup === "OTHER" ? (
                <OtherContextFields
                  viTriPhatHien={viTriPhatHien}
                  setViTriPhatHien={setViTriPhatHien}
                  renderStationOverride={renderStationOverride}
                />
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
