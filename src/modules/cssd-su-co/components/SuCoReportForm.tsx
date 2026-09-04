// src/modules/cssd-su-co/components/SuCoReportForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  fetchSuCoFormCatalog,
  listSuCoNhanSuOptionsAction,
  resolveSuCoFaultTrace,
} from "../actions/su-co-form-catalog.actions";
import { listActiveBoForInstrumentTransferAction } from "../actions/su-co-bo-picker.actions";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createIncidentReport, getIncidentForPrint } from "../actions/su-co-report.actions";
import {
  INCIDENT_GROUP_LABEL,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  coerceInstrumentFormTypeId,
  groupTypeDefaults,
  instrumentFormTypeOptions,
  isBatchLinkedTypeId,
  resolveInstrumentFormSubmitTypeId,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import {
  buildSuCoStaffOptions,
  type SuCoCyclePerformerOption,
  type SuCoNhanSuRow,
} from "../domain/cssd-incident-staff-options";
import { isInstrumentIncidentImageRequired } from "../domain/cssd-incident-trace";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import InstrumentSetReconcileTable, { type SetReconcileFormState } from "./InstrumentSetReconcileTable";
import {
  INSTRUMENT_MOVE_TYPE_ID,
  INSTRUMENT_PHYSICAL_DOOR_ID,
  SET_RECONCILE_TYPE_ID,
  resolveInstrumentMoveSubmitTypeId,
  validateInstrumentDoorLines,
} from "@/lib/domain/cssd-set-reconcile";
import InstrumentMoveDualTable from "./InstrumentMoveDualTable";
import SuCoIncidentMetaFields, {
  defaultDetectionDateTimeLocal,
  type SuCoIncidentMetaState,
} from "./SuCoIncidentMetaFields";
import {
  BatchRecallEntryBanner,
  BatchRecallReasonPicker,
  BoSourceFields,
  ChemicalContextFields,
  EquipmentContextFields,
  IncidentGroupPicker,
  InstrumentDoorTabs,
  OtherContextFields,
  ProcessMaLoField,
  StationOverrideSelect,
  SubmittedSuccessView,
  TypePicker,
  type BoCatalogOption,
} from "./SuCoReportFormFields";
import {
  batchRecallReasonFromTypeId,
  resolveBatchRecallReason,
  type BatchRecallReasonCode,
} from "../domain/cssd-batch-recall";

export type SuCoReportFormProps = {
  initialStation: Station;
  initialGroup?: IncidentGroup;
  initialMaQR?: string;
  initialChiTietId?: string;
  initialLoaiDungCuId?: string;
  initialTypeId?: string;
  quyTrinhId?: string | null;
  initialMaLo?: string;
  initialLoTietKhuanId?: string;
  /** QT.24 entry rõ: thu hồi theo mẻ (không lẫn 3 cửa dụng cụ). */
  batchRecallEntry?: boolean;
  allowStationOverride?: boolean;
  enabled: boolean;
  onSubmitted?: (incidentId?: string) => void;
  onDismiss?: () => void;
  layout?: "page" | "modal";
};

const emptyMeta = (): SuCoIncidentMetaState => ({
  thoiGianPhatHien: defaultDetectionDateTimeLocal(),
  nguoiPhatHien: "",
  nguoiPhatHienId: "",
  nguoiLienQuan: "",
  nguoiLienQuanId: "",
  moTa: "",
  anhMinhChung: "",
});

export default function SuCoReportForm({
  initialStation,
  initialGroup,
  initialMaQR,
  initialChiTietId,
  initialLoaiDungCuId,
  initialTypeId,
  quyTrinhId,
  initialMaLo,
  initialLoTietKhuanId,
  batchRecallEntry = false,
  allowStationOverride = false,
  enabled,
  onSubmitted,
  onDismiss,
  layout = "page",
}: SuCoReportFormProps) {
  const isModal = layout === "modal";
  const { userData } = usePermission();
  const nguoiLapLabel =
    String(userData?.ho_ten || "").trim() || String(userData?.email || "").trim() || "Nhân viên CSSD";

  const [loading, setLoading] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [detectionStation, setDetectionStation] = useState<Station>(initialStation);
  const [incidentGroup, setIncidentGroup] = useState<IncidentGroup>(initialGroup || "PROCESS");
  const [setReconcileState, setSetReconcileState] = useState<SetReconcileFormState | null>(null);
  const [destMa, setDestMa] = useState("");
  const [moveUsesKho, setMoveUsesKho] = useState(true);
  const [typeId, setTypeId] = useState(
    initialGroup === "INSTRUMENT"
      ? coerceInstrumentFormTypeId(initialTypeId)
      : initialTypeId || INCIDENT_TYPE_PRESETS.PROCESS[0]?.code || "",
  );
  const [typeTen, setTypeTen] = useState(() => {
    if (initialGroup === "INSTRUMENT") {
      const coerced = coerceInstrumentFormTypeId(initialTypeId);
      return INCIDENT_TYPE_PRESETS.INSTRUMENT.find((x) => x.code === coerced)?.label || "Đổi danh mục";
    }
    return (
      INCIDENT_TYPE_PRESETS.PROCESS.find((x) => x.code === initialTypeId)?.label ||
      INCIDENT_TYPE_PRESETS.PROCESS[0]?.label ||
      ""
    );
  });
  const [maQR, setMaQR] = useState(initialMaQR || "");
  const [faultStation, setFaultStation] = useState<Station>(initialStation);
  const [machineId, setMachineId] = useState("");
  const [maLo, setMaLo] = useState(initialMaLo || "");
  const [loTietKhuanId, setLoTietKhuanId] = useState(initialLoTietKhuanId || "");
  const [batchRecallReason, setBatchRecallReason] = useState<BatchRecallReasonCode>(() => {
    return batchRecallReasonFromTypeId(initialTypeId) || "BI_POSITIVE";
  });
  const [viTriPhatHien, setViTriPhatHien] = useState("");
  const [meta, setMeta] = useState<SuCoIncidentMetaState>(emptyMeta);
  const [machines, setMachines] = useState<{ id: string; ten: string }[]>([]);
  const [chemicals, setChemicals] = useState<{ id: string; ten: string; ma: string }[]>([]);
  const [boOptions, setBoOptions] = useState<BoCatalogOption[]>([]);
  const [boLoading, setBoLoading] = useState(false);
  const [nhanSu, setNhanSu] = useState<SuCoNhanSuRow[]>([]);
  const [cyclePerformers, setCyclePerformers] = useState<SuCoCyclePerformerOption[]>([]);
  const [submittedIncident, setSubmittedIncident] = useState<{ incident: unknown; details: unknown[] } | null>(null);
  const confirmDuplicateRef = useRef(false);

  useEffect(() => {
    if (!allowStationOverride) setDetectionStation(initialStation);
  }, [initialStation, allowStationOverride]);

  useEffect(() => {
    if (!enabled) return;
    if (initialMaQR) setMaQR(initialMaQR);
    if (initialMaLo) setMaLo(initialMaLo);
    if (initialLoTietKhuanId) setLoTietKhuanId(initialLoTietKhuanId);
  }, [enabled, initialMaQR, initialMaLo, initialLoTietKhuanId]);

  useEffect(() => {
    if (!enabled || !batchRecallEntry) return;
    setIncidentGroup("PROCESS");
    const reason = resolveBatchRecallReason(batchRecallReasonFromTypeId(initialTypeId) || "BI_POSITIVE");
    setBatchRecallReason(reason.code);
    setTypeId(reason.typeId);
    setTypeTen(reason.typeTen);
    if (allowStationOverride) setDetectionStation("TIET_KHUAN");
    setFaultStation("TIET_KHUAN");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entry lock once when opening batch-recall
  }, [enabled, batchRecallEntry]);

  const activeGroupOptions = useMemo(
    () => (incidentGroup === "INSTRUMENT" ? instrumentFormTypeOptions() : INCIDENT_TYPE_PRESETS[incidentGroup]),
    [incidentGroup],
  );
  const isInstrument = incidentGroup === "INSTRUMENT";
  const isMoveDoor = isInstrument && typeId === INSTRUMENT_MOVE_TYPE_ID;
  const isPhysicalDoor = isInstrument && typeId === INSTRUMENT_PHYSICAL_DOOR_ID;
  const isReconcileDoor = isInstrument && !isMoveDoor;
  const imageRequired =
    (isInstrument && isInstrumentIncidentImageRequired(typeId)) ||
    (isMoveDoor && moveUsesKho) ||
    (isReconcileDoor && (setReconcileState?.lines.some((l) => l.kind === "HONG") ?? false));
  const imageHidden =
    (isMoveDoor && !moveUsesKho) ||
    (isPhysicalDoor && (setReconcileState?.lines.every((l) => l.kind !== "HONG") ?? true));
  const needsBoCatalog = incidentGroup === "PROCESS" || incidentGroup === "INSTRUMENT";
  const isBatchRecallEntry =
    batchRecallEntry ||
    Boolean(initialLoTietKhuanId && isBatchLinkedTypeId(initialTypeId)) ||
    (isBatchLinkedTypeId(typeId) && Boolean(initialLoTietKhuanId || initialMaLo));

  const { detectorOptions, relatedOptions } = useMemo(
    () =>
      buildSuCoStaffOptions({
        cyclePerformers,
        nhanSu,
        preferCycleForRelated: incidentGroup === "PROCESS",
      }),
    [cyclePerformers, nhanSu, incidentGroup],
  );

  const relatedHint =
    incidentGroup === "PROCESS"
      ? maQR.trim()
        ? "Ưu tiên người đã thực hiện khâu phát sinh lỗi trên chu kỳ đã chọn."
        : "Chọn hoặc quét bộ để hệ thống đề xuất người từ khâu đã lưu."
      : undefined;

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      setFLoading(true);
      setFError(null);
      try {
        const [catalog, staff] = await Promise.all([
          fetchSuCoFormCatalog(),
          listSuCoNhanSuOptionsAction(),
        ]);
        if (!catalog.success) throw new Error(catalog.error);
        setMachines(catalog.machines);
        setChemicals(catalog.chemicals || []);
        if (staff.success) setNhanSu(staff.data);
      } catch (err: unknown) {
        setFError(err instanceof Error ? err.message : "Lỗi tải danh mục");
      } finally {
        setFLoading(false);
      }
    })();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !needsBoCatalog) {
      setBoOptions([]);
      return;
    }
    let alive = true;
    setBoLoading(true);
    void listActiveBoForInstrumentTransferAction().then((res) => {
      if (!alive) return;
      setBoLoading(false);
      if (!res.success) {
        toast.error(res.error || "Không tải danh sách bộ.");
        return;
      }
      setBoOptions(res.data);
    });
    return () => {
      alive = false;
    };
  }, [enabled, needsBoCatalog]);

  useEffect(() => {
    const defaults = groupTypeDefaults(incidentGroup);
    if (incidentGroup === "INSTRUMENT") {
      const coerced = coerceInstrumentFormTypeId(initialTypeId);
      const preset = INCIDENT_TYPE_PRESETS.INSTRUMENT.find((x) => x.code === coerced);
      setTypeId(preset?.code || defaults.typeId);
      setTypeTen(preset?.label || defaults.typeTen);
    } else {
      const presetMatch = INCIDENT_TYPE_PRESETS[incidentGroup].find((x) => x.code === initialTypeId);
      if (presetMatch) {
        setTypeId(presetMatch.code);
        setTypeTen(presetMatch.label);
      } else {
        setTypeId(defaults.typeId);
        setTypeTen(defaults.typeTen);
      }
    }
    setFaultStation(detectionStation);
    if (incidentGroup === "OTHER" || incidentGroup === "CHEMICAL") {
      if (!initialMaQR) setMaQR("");
      setMachineId("");
      setMaLo("");
    }
    if (incidentGroup !== "PROCESS" && incidentGroup !== "INSTRUMENT" && incidentGroup !== "EQUIPMENT") {
      setMaQR("");
    }
    if (incidentGroup !== "PROCESS") setCyclePerformers([]);
  }, [incidentGroup, detectionStation, initialTypeId, initialMaQR]);

  const applyFaultTraceResult = useCallback(
    (
      res: Extract<Awaited<ReturnType<typeof resolveSuCoFaultTrace>>, { success: true }>,
      station: Station,
      silent: boolean,
    ) => {
      setCyclePerformers(res.cyclePerformers || []);
      if (res.operatorId && res.operatorName) {
        setMeta((m) => ({
          ...m,
          nguoiLienQuan: res.operatorName!,
          nguoiLienQuanId: res.operatorId!,
        }));
        if (!silent) {
          toast.success(
            `Truy vết: ${res.operatorName} (${INCIDENT_STATION_OPTIONS.find((s) => s.value === station)?.label})`,
          );
        }
      } else if (!silent) {
        toast.info("Khâu này chưa ghi nhận người thực hiện — chọn từ danh sách chu kỳ hoặc danh mục.");
      }
    },
    [],
  );

  const runFaultTrace = useCallback(
    async (qr: string, station: Station, silent = false) => {
      const code = qr.trim().toUpperCase();
      if (!code || incidentGroup !== "PROCESS") return;
      setTracing(true);
      try {
        const res = await resolveSuCoFaultTrace(code, station);
        if (!res.success) {
          if (!silent) toast.error(res.error || "Không truy vết được người liên quan.");
          setCyclePerformers([]);
          return;
        }
        applyFaultTraceResult(res, station, silent);
      } finally {
        setTracing(false);
      }
    },
    [incidentGroup, applyFaultTraceResult],
  );

  useEffect(() => {
    if (incidentGroup !== "PROCESS" || !maQR.trim()) {
      if (incidentGroup !== "PROCESS") setCyclePerformers([]);
      return;
    }
    void runFaultTrace(maQR, faultStation, true);
  }, [incidentGroup, maQR, faultStation, runFaultTrace]);

  const processQrCode = async (raw: string, mode: "SET" | "MACHINE" = "SET") => {
    const code = raw.trim();
    if (!code) return;

    setLoading(true);
    try {
      const { resolveCssdCodeAction } = await import("@/modules/cssd-erp/actions/cssd-qr.actions");
      const res = await resolveCssdCodeAction(code);
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
      toast.success(`Đã chọn bộ: ${res.code}`);
      if (incidentGroup === "PROCESS") await runFaultTrace(res.code, faultStation);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi quét QR");
    } finally {
      setLoading(false);
    }
  };

  const handleQrKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, mode: "SET" | "MACHINE" = "SET") => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    await processQrCode(maQR, mode);
  };

  const handleMetaChange = (key: keyof SuCoIncidentMetaState, val: string) => {
    setMeta((m) => ({ ...m, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasBatchContext = Boolean(maLo.trim() || loTietKhuanId.trim());
    const batchLinked = incidentGroup === "PROCESS" && isBatchLinkedTypeId(typeId);
    if (incidentGroup === "INSTRUMENT" && !maQR.trim()) {
      return toast.error(
        isMoveDoor
          ? "Cửa Chuyển cần chọn bộ dụng cụ (ít nhất một bên là bộ)."
          : `Nhóm "${INCIDENT_GROUP_LABEL.INSTRUMENT}" cần chọn hoặc quét mã bộ dụng cụ.`,
      );
    }
    if (incidentGroup === "PROCESS" && !maQR.trim() && !(batchLinked && hasBatchContext)) {
      return toast.error("Nhóm Quy trình cần mã bộ dụng cụ — hoặc mã lô nếu là sự cố mẻ / BI+.");
    }
    if (typeId === "PROCESS_BI_POSITIVE" && !hasBatchContext) {
      return toast.error("Sự cố BI dương tính cần mã lô mẻ tiệt khuẩn.");
    }
    if (isBatchRecallEntry && !hasBatchContext) {
      return toast.error("Thu hồi theo mẻ cần mã lô hoặc id mẻ tiệt khuẩn.");
    }
    const descText =
      meta.moTa.trim() ||
      (isMoveDoor
        ? moveUsesKho
          ? "Điều chuyển dụng cụ giữa kho lẻ và bộ."
          : "Điều chuyển dụng cụ giữa hai bộ."
        : isPhysicalDoor
          ? "Ghi nhận dụng cụ hỏng hoặc mất trên bộ (ghi sổ ngay)."
          : isReconcileDoor
            ? "Đề nghị đổi mã, tên hoặc số lượng chuẩn bộ dụng cụ."
            : "");
    if (!descText) {
      return toast.error(
        isInstrument
          ? "Vui lòng điền mô tả chi tiết phiếu biến động."
          : "Vui lòng điền mô tả chi tiết sự cố an toàn.",
      );
    }
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
      if (!setReconcileState) return toast.error("Chưa tải được bảng thành phần bộ.");
      const lineErr = validateInstrumentDoorLines(
        resolveInstrumentFormSubmitTypeId(typeId),
        setReconcileState.lines,
      );
      if (lineErr) return toast.error(lineErr);
    }

    setLoading(true);
    try {
      const faultStationPayload =
        incidentGroup === "PROCESS"
          ? faultStation
          : incidentGroup === "OTHER" && viTriPhatHien
            ? (viTriPhatHien as Station)
            : undefined;

      const submitTypeId =
        isMoveDoor && setReconcileState
          ? resolveInstrumentMoveSubmitTypeId(setReconcileState.lines) || typeId
          : isInstrument
            ? resolveInstrumentFormSubmitTypeId(typeId)
            : typeId;
      const submitTypeTen =
        submitTypeId === "INSTRUMENT_TRANSFER"
          ? "Điều chuyển bộ ↔ bộ"
          : submitTypeId === "INSTRUMENT_REPLENISH"
            ? "Kho ↔ bộ"
            : submitTypeId === SET_RECONCILE_TYPE_ID
              ? typeTen || (isPhysicalDoor ? "Hỏng/Mất" : "Đổi danh mục")
              : typeTen;

      const payload = {
        maQR: maQR.trim() || undefined,
        typeId: submitTypeId,
        typeTen: submitTypeTen,
        desc: descText,
        errorQR: maLo.trim() || undefined,
        machineId: machineId.trim() || undefined,
        faultOperator: meta.nguoiLienQuan.trim() || undefined,
        faultOperatorId: meta.nguoiLienQuanId.trim() || undefined,
        nguoiPhatHien: meta.nguoiPhatHien.trim() || undefined,
        nguoiPhatHienId: meta.nguoiPhatHienId.trim() || undefined,
        thoiGianPhatHien: meta.thoiGianPhatHien || undefined,
        anhMinhChung: meta.anhMinhChung.trim() || undefined,
        station: detectionStation,
        incidentGroup,
        faultStation: faultStationPayload,
        setReconcilePayload:
          incidentGroup === "INSTRUMENT" && setReconcileState
            ? {
                boDungCuId: setReconcileState.boDungCuId,
                draftIncidentId: setReconcileState.draftIncidentId,
                quyTrinhId: quyTrinhId || undefined,
                maBo: setReconcileState.maBo,
                tenBo: setReconcileState.tenBo,
                lines: setReconcileState.lines,
              }
            : undefined,
        processPayload:
          incidentGroup === "PROCESS"
            ? {
                loTietKhuanId: loTietKhuanId.trim() || undefined,
                maLo: maLo.trim() || undefined,
                quyTrinhId: quyTrinhId || undefined,
              }
            : undefined,
        confirmDuplicate: confirmDuplicateRef.current,
      };

      try {
        const res = await createIncidentReport(payload);
        confirmDuplicateRef.current = false;
        if (res.deduped) {
          toast.message("Phiếu cùng mẻ và bộ đã có. Lập thêm nếu cần bổ sung mô tả.", {
            action: {
              label: "Lập phiếu mới",
              onClick: () => {
                confirmDuplicateRef.current = true;
                const form = document.querySelector<HTMLFormElement>("form");
                form?.requestSubmit();
              },
            },
          });
        } else if (res.isRedAlert) {
          toast.error("⚠️ CẢNH BÁO ĐỎ: Bộ dụng cụ đã sự cố từ 2 lần trở lên.", { duration: 8000 });
        } else {
          toast.success("Đã ghi nhận báo cáo sự cố!");
        }
        if (res.recalledCount || res.machineHeld) {
          const recallBit = res.recalledCount ? `đã thu hồi ${res.recalledCount} bộ cùng mẻ` : "";
          const holdBit = res.machineHeld ? "máy tạm giữ QC (HOLD_QC)" : "";
          toast.message([recallBit, holdBit].filter(Boolean).join(" — ") + ".");
        }
        if (res.incident_id) {
          const printData = await getIncidentForPrint(res.incident_id);
          if (printData.success) {
            setSubmittedIncident({ incident: printData.incident, details: printData.details });
            toast.message("Đã lưu sự cố — bấm In biên bản nếu cần.");
          }
        }
        onSubmitted?.(res.incident_id);
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
    setCyclePerformers([]);
    setTypeId(INCIDENT_TYPE_PRESETS.PROCESS[0]?.code || "");
    setTypeTen(INCIDENT_TYPE_PRESETS.PROCESS[0]?.label || "");
    setFaultStation(initialStation);
    setMeta(emptyMeta());
    setSubmittedIncident(null);
  };

  if (submittedIncident) {
    return (
      <SubmittedSuccessView
        incident={submittedIncident.incident}
        details={submittedIncident.details}
        onReset={resetAfterSubmit}
        onClose={onDismiss}
      />
    );
  }

  const renderStationOverride = allowStationOverride ? (
    <StationOverrideSelect value={detectionStation} onChange={setDetectionStation} embedded={!isModal} />
  ) : null;

  const setInstrumentDoor = (id: string, ten: string) => {
    setTypeId(id);
    setTypeTen(ten);
    setSetReconcileState(null);
    setDestMa("");
    setMoveUsesKho(id === INSTRUMENT_MOVE_TYPE_ID);
  };

  return (
    <form onSubmit={handleSubmit} className={"bv103-stack-in"}>
      {fError ? (
        <div className="flex gap-2 text-[12px] text-red-600">
          <AlertCircle className="shrink-0" size={16} />
          Không tải được danh mục: {fError}
        </div>
      ) : null}

      {fLoading ? (
        <div className="flex items-center gap-2 py-10 text-[var(--primary)]">
          <Loader2 className="animate-spin" size={20} />
          <p className="text-[11px] font-semibold">Đang tải danh mục…</p>
        </div>
      ) : (
        <div className={"bv103-stack-in"}>
          {isBatchRecallEntry ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 pb-2" data-testid="batch-recall-group-lock">
              <span className="text-[12px] font-semibold text-amber-900">An toàn QT · Thu hồi theo mẻ</span>
              <span className="text-[11px] text-slate-500">(không mở 3 cửa biến động dụng cụ)</span>
            </div>
          ) : (
            <IncidentGroupPicker incidentGroup={incidentGroup} onSelect={setIncidentGroup} />
          )}
          <div className="flex flex-wrap items-end gap-3">
            {incidentGroup !== "INSTRUMENT" && !isBatchRecallEntry ? (
              <TypePicker
                options={activeGroupOptions}
                typeId={typeId}
                onChange={(id, ten) => {
                  setTypeId(id);
                  setTypeTen(ten);
                }}
              />
            ) : null}
            {renderStationOverride}
          </div>

          {incidentGroup === "INSTRUMENT" ? (
            <InstrumentDoorTabs
              typeId={typeId}
              options={activeGroupOptions}
              onChange={setInstrumentDoor}
            />
          ) : null}

          {incidentGroup === "PROCESS" && isBatchRecallEntry ? <BatchRecallEntryBanner /> : null}

          {incidentGroup === "PROCESS" ? (
            <div className="space-y-3">
              {isBatchRecallEntry ? (
                <BatchRecallReasonPicker
                  reason={batchRecallReason}
                  onChange={(code, id, ten) => {
                    setBatchRecallReason(code);
                    setTypeId(id);
                    setTypeTen(ten);
                  }}
                />
              ) : null}
              <BoSourceFields
                maQR={maQR}
                setMaQR={setMaQR}
                boOptions={boOptions}
                boLoading={boLoading}
                onKeyDown={(e) => void handleQrKeyDown(e)}
                onScanComplete={(code) => void processQrCode(code)}
                onSelectBo={(code) => void processQrCode(code)}
                loading={loading || tracing}
                maLoHint={maLo.trim() || undefined}
                qrRequired={!(isBatchLinkedTypeId(typeId) && Boolean(maLo.trim() || loTietKhuanId.trim()))}
                layout={isModal ? "stack" : "row"}
              />
              <div className={isModal ? "space-y-3" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
                <ProcessMaLoField
                  maLo={maLo}
                  setMaLo={setMaLo}
                  readOnly={Boolean(initialMaLo || initialLoTietKhuanId)}
                  batchRecall={isBatchRecallEntry}
                />
                <div className="space-y-1.5">
                  <label className={bv103LayoutChrome.labelBlock}>Khâu phát sinh lỗi</label>
                  <select
                    value={faultStation}
                    onChange={(e) => setFaultStation(e.target.value as Station)}
                    className={bv103LayoutChrome.controlSelectNative}
                  >
                    {INCIDENT_STATION_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {isReconcileDoor ? (
            <InstrumentSetReconcileTable
              maQR={maQR}
              enabled={enabled}
              station={detectionStation}
              initialChiTietId={initialChiTietId}
              initialKindHint={
                initialTypeId === "INSTRUMENT_BROKEN"
                  ? "HONG"
                  : initialTypeId === "INSTRUMENT_MISSING"
                    ? "MAT"
                    : null
              }
              toolbar={
                <BoSourceFields
                  maQR={maQR}
                  setMaQR={setMaQR}
                  boOptions={boOptions}
                  boLoading={boLoading}
                  onKeyDown={(e) => void handleQrKeyDown(e)}
                  onScanComplete={(code) => void processQrCode(code)}
                  onSelectBo={(code) => void processQrCode(code)}
                  loading={loading}
                  layout="stack"
                  compact
                />
              }
              onChange={setSetReconcileState}
            />
          ) : null}

          {isMoveDoor ? (
            <InstrumentMoveDualTable
              enabled={enabled}
              station={detectionStation}
              sourceMa={maQR}
              destMa={destMa}
              boOptions={boOptions}
              boLoading={boLoading}
              loadingScan={loading}
              onSourceMa={setMaQR}
              onDestMa={setDestMa}
              onScanSource={(code) => void processQrCode(code)}
              onScanDest={(code) => setDestMa(code.trim().toUpperCase())}
              onChange={setSetReconcileState}
              onUsesKho={setMoveUsesKho}
            />
          ) : null}

          {incidentGroup === "CHEMICAL" ? (
            <ChemicalContextFields
              machineId={machineId}
              setMachineId={setMachineId}
              maLo={maLo}
              setMaLo={setMaLo}
              chemicals={chemicals}
              typeOptions={activeGroupOptions}
              typeId={typeId}
              onTypeChange={(id, ten) => {
                setTypeId(id);
                setTypeTen(ten);
              }}
              hideType
              wide={!isModal}
              renderStationOverride={null}
            />
          ) : null}

          {incidentGroup === "EQUIPMENT" ? (
            <EquipmentContextFields
              maQR={maQR}
              setMaQR={setMaQR}
              onQrKeyDown={(e) => void handleQrKeyDown(e, "MACHINE")}
              onScanComplete={(code) => void processQrCode(code, "MACHINE")}
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
              hideType
              wide={!isModal}
              renderStationOverride={null}
            />
          ) : null}

          {incidentGroup === "OTHER" ? (
            <OtherContextFields
              viTriPhatHien={viTriPhatHien}
              setViTriPhatHien={setViTriPhatHien}
              renderStationOverride={null}
              wide={!isModal}
            />
          ) : null}

          <SuCoIncidentMetaFields
            values={meta}
            nguoiLapLabel={nguoiLapLabel}
            imageRequired={imageRequired}
            imageHidden={imageHidden}
            detectorOptions={detectorOptions}
            relatedOptions={relatedOptions}
            relatedHint={relatedHint}
            wide={!isModal}
            onChange={handleMetaChange}
            onSelectDetector={(id, label) => {
              const row = nhanSu.find((n) => n.id === id);
              setMeta((m) => ({
                ...m,
                nguoiPhatHienId: id,
                nguoiPhatHien: row?.ho_ten || label,
              }));
            }}
            onSelectRelated={(id, label) => {
              const fromCycle = cyclePerformers.find((p) => p.operatorId === id);
              const row = nhanSu.find((n) => n.id === id);
              setMeta((m) => ({
                ...m,
                nguoiLienQuanId: id,
                nguoiLienQuan: fromCycle?.operatorName || row?.ho_ten || label,
              }));
            }}
          />

          <div
            className={
              isModal
                ? "sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6"
                : ""
            }
          >
            <button
              type="submit"
              disabled={loading || tracing || !!fError || fLoading}
              className={`${bv103LayoutChrome.btnPrimaryBlock} normal-case tracking-normal touch-manipulation`}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Gửi</>}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
