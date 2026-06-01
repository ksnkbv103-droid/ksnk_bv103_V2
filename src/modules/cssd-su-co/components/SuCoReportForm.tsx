// src/modules/cssd-su-co/components/SuCoReportForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Camera,
  FileText,
  Printer,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { fetchSuCoFormCatalog } from "../actions/su-co-form-catalog.actions";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createIncidentReport, getIncidentForPrint } from "../actions/su-co-report.actions";
import {
  classifyIncidentGroupByTypeName,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import IncidentPrintView, { getGoogleDriveDirectLink } from "./IncidentPrintView";

export type SuCoReportFormProps = {
  /** Trạm phát hiện ban đầu (từ ERP) hoặc mặc định trên trang riêng */
  initialStation: Station;
  /** Nhóm sự cố ban đầu */
  initialGroup?: IncidentGroup;
  /** Trang riêng: cho chọn trạm phát hiện */
  allowStationOverride?: boolean;
  /** Chỉ tải danh mục khi bật (modal khi mở) */
  enabled: boolean;
  onSubmitted?: () => void;
};

function emptyCategoryBuckets(): Record<IncidentGroup, { id: string; ten: string }[]> {
  return INCIDENT_GROUPS.reduce(
    (acc, g) => {
      acc[g] = [];
      return acc;
    },
    {} as Record<IncidentGroup, { id: string; ten: string }[]>,
  );
}

const GROUP_ICONS: Record<IncidentGroup, React.ComponentType<{ className?: string; size?: number }>> = {
  PROCESS: Layers,
  INSTRUMENT: Wrench,
  CHEMICAL: FlaskConical,
  EQUIPMENT: Cpu,
  OTHER: AlertTriangle,
};

const GROUP_SUBTITLES: Record<IncidentGroup, string> = {
  PROCESS: "Sai thao tác, QC khâu, chất lượng tiệt khuẩn / mẻ...",
  INSTRUMENT: "Dụng cụ hỏng, mất chi tiết, cần bổ sung...",
  CHEMICAL: "Sai nồng độ hóa chất, quá hạn dùng...",
  EQUIPMENT: "Máy hỏng, dừng hoạt động, lỗi thông số...",
  OTHER: "Các tình huống phát sinh đặc thù khác...",
};

export default function SuCoReportForm({
  initialStation,
  initialGroup,
  allowStationOverride = false,
  enabled,
  onSubmitted,
}: SuCoReportFormProps) {
  const [loading, setLoading] = useState(false);
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [detectionStation, setDetectionStation] = useState<Station>(initialStation);
  const [incidentGroup, setIncidentGroup] = useState<IncidentGroup>(initialGroup || "PROCESS");
  const [form, setForm] = useState({
    maQR: "",
    typeId: "",
    typeTen: "",
    desc: "",
    errorQR: "",
    machineId: "",
    faultStation: initialStation as string,
    faultOperator: "",
    anhMinhChung: "",
  });
  const [categories, setCategories] = useState<{ id: string; ten: string }[]>([]);
  const [machines, setMachines] = useState<{ id: string; ten: string }[]>([]);
  const [chemicals, setChemicals] = useState<{ id: string; ten: string; ma: string }[]>([]);

  // State lưu trữ sự cố vừa gửi thành công để phục vụ in ấn
  const [submittedIncident, setSubmittedIncident] = useState<{
    incident: any;
    details: any[];
  } | null>(null);

  useEffect(() => {
    if (!allowStationOverride) setDetectionStation(initialStation);
  }, [initialStation, allowStationOverride]);

  const categoryGroups = useMemo(
    () =>
      categories.reduce<Record<IncidentGroup, { id: string; ten: string }[]>>((acc, c) => {
        const g = classifyIncidentGroupByTypeName(c.ten);
        acc[g].push(c);
        return acc;
      }, emptyCategoryBuckets()),
    [categories],
  );

  const activeGroupOptions = useMemo(() => {
    if (incidentGroup === "OTHER") {
      return INCIDENT_TYPE_PRESETS.OTHER.map((x) => ({ id: x.code, ten: x.label }));
    }
    return categoryGroups[incidentGroup].length
      ? categoryGroups[incidentGroup]
      : INCIDENT_TYPE_PRESETS[incidentGroup].map((x) => ({ id: x.code, ten: x.label }));
  }, [categoryGroups, incidentGroup]);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      setFLoading(true);
      setFError(null);
      try {
        const res = await fetchSuCoFormCatalog();
        if (!res.success) throw new Error(res.error);
        setCategories(res.categories);
        setMachines(res.machines);
        if ("chemicals" in res) {
          setChemicals((res as any).chemicals || []);
        }
      } catch (err: unknown) {
        setFError(err instanceof Error ? err.message : "Lỗi tải danh mục");
      } finally {
        setFLoading(false);
      }
    })();
  }, [enabled]);

  useEffect(() => {
    const first = activeGroupOptions[0];
    const st = detectionStation;
    setForm((f) => {
      if (incidentGroup === "OTHER") {
        return {
          ...f,
          maQR: "",
          errorQR: "",
          machineId: "",
          typeId: "OTHER_CUSTOM",
          typeTen: "",
          faultStation: "",
          faultOperator: "",
        };
      }
      return {
        ...f,
        maQR: "",
        errorQR: "",
        machineId: "",
        typeId: activeGroupOptions.some((x) => x.id === f.typeId) ? f.typeId : first?.id || "",
        typeTen: activeGroupOptions.some((x) => x.id === f.typeId)
          ? activeGroupOptions.find((x) => x.id === f.typeId)?.ten || f.typeTen
          : first?.ten || "",
        faultStation: f.faultStation || st,
        faultOperator: "",
      };
    });
  }, [incidentGroup, detectionStation, activeGroupOptions]);

  // Xử lý quét QR nhận diện nhanh thực thể
  const handleQrKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const raw = form.maQR.trim();
      if (!raw) return;

      setLoading(true);
      try {
        const { resolveCssdCodeAction } = await import("@/modules/cssd-erp/actions/cssd-qr.actions");
        const res = await resolveCssdCodeAction(raw);
        if (res.success) {
          if (res.targetType === "MACHINE") {
            setIncidentGroup("EQUIPMENT");
            setForm((f) => ({
              ...f,
              maQR: "", // Nhóm máy móc không bắt buộc maQR bộ dụng cụ, ta xóa để tránh gây hiểu nhầm
              machineId: res.machineId || "",
            }));
            toast.success(`Nhận diện mã máy: ${res.machineCode || res.machineId}. Đã tự động chuyển sang tab "Thiết bị / Máy móc".`, {
              duration: 4000,
            });
          } else if (res.targetType === "INSTRUMENT_SET") {
            setForm((f) => ({
              ...f,
              maQR: res.code,
            }));
            toast.success(`Nhận diện mã bộ dụng cụ: ${res.code}`);
          } else {
            setForm((f) => ({ ...f, maQR: res.code }));
            toast.success(`Đã quét mã QR: ${res.code}`);
          }
        } else {
          toast.error(res.error || "Không nhận diện được mã QR này. Vui lòng thử lại.");
        }
      } catch (err: any) {
        toast.error("Lỗi quét QR: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isQrRequired = incidentGroup === "PROCESS" || incidentGroup === "INSTRUMENT";
    
    if (isQrRequired && !form.maQR) {
      return toast.error(`Nhóm "${INCIDENT_GROUP_LABEL[incidentGroup]}" bắt buộc phải quét mã QR bộ dụng cụ.`);
    }
    
    if (!form.desc.trim()) {
      return toast.error("Vui lòng điền mô tả chi tiết tình huống.");
    }
    
    if (incidentGroup === "OTHER" && !form.typeTen.trim()) {
      return toast.error("Nhóm Khác: vui lòng ghi tóm tắt loại sự cố (ô loại chi tiết).");
    }
    
    setLoading(true);
    try {
      const st = detectionStation;
      const faultStationPayload =
        incidentGroup === "OTHER"
          ? form.faultStation && form.faultStation.length > 0
            ? (form.faultStation as Station)
            : undefined
          : incidentGroup === "PROCESS"
            ? (form.faultStation as Station) || st
            : undefined;

      const payload = {
        maQR: form.maQR || undefined,
        typeId: form.typeId,
        typeTen: form.typeTen,
        desc: form.desc,
        errorQR: form.errorQR?.trim() || undefined,
        machineId: form.machineId?.trim() || undefined,
        faultOperator: form.faultOperator?.trim() || undefined,
        anhMinhChung: form.anhMinhChung?.trim() || undefined,
        station: st,
        incidentGroup,
        faultStation: faultStationPayload,
      };

      let res;
      try {
        res = await createIncidentReport(payload);
        if (res.isRedAlert) {
          toast.error("⚠️ CẢNH BÁO ĐỎ: Bộ dụng cụ này đã xảy ra sự cố từ 2 lần trở lên. Hệ thống đã đánh dấu đỏ báo cáo này.", {
            duration: 8000,
          });
        } else {
          toast.success("Đã ghi nhận báo cáo sự cố thành công!");
        }

        // Tải thông tin in ấn tức thì từ server
        if (res.incident_id) {
          const printData = await getIncidentForPrint(res.incident_id);
          if (printData.success) {
            setSubmittedIncident({
              incident: printData.incident,
              details: printData.details,
            });
          }
        }
      } catch (err: unknown) {
        const { isNetworkError, pushOfflineTask } = await import("@/lib/offline-sync");
        if (isNetworkError(err)) {
          await pushOfflineTask("REPORT_INCIDENT", payload);
          toast.info("Đã lưu ngoại tuyến", {
            description: "Báo cáo sự cố sẽ được tự động đồng bộ khi kết nối mạng được khôi phục."
          });
          onSubmitted?.();
        } else {
          throw err;
        }
      }

      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không gửi được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const resetAfterSubmit = () => {
    setForm({
      maQR: "",
      typeId: "",
      typeTen: "",
      desc: "",
      errorQR: "",
      machineId: "",
      faultStation: initialStation as string,
      faultOperator: "",
      anhMinhChung: "",
    });
    setSubmittedIncident(null);
  };

  // NẾU ĐÃ GỬI BÁO CÁO THÀNH CÔNG -> HIỂN THỊ MÀN HÌNH BÁO THÀNH CÔNG VÀ IN
  if (submittedIncident) {
    return (
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] text-center max-w-2xl mx-auto my-6 animate-in fade-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 ring-8 ring-emerald-500/10">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-lg font-black uppercase tracking-wide text-slate-800">
          Ghi nhận sự cố thành công!
        </h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Biên bản sự cố đã được lưu trữ an toàn trong hệ thống và các liên kết domino tự động đã được kích hoạt. Hãy in phiếu biên bản sự cố để lưu trữ hồ sơ giấy/phòng ban nếu cần thiết.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-12 w-full sm:w-auto px-6 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            <Printer size={16} /> 🖨️ In biên bản sự cố
          </button>
          <button
            type="button"
            onClick={resetAfterSubmit}
            className="flex h-12 w-full sm:w-auto px-6 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-black uppercase tracking-widest text-slate-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={16} /> Báo cáo sự cố mới
          </button>
        </div>

        {/* COMPONENT IN ẨN TRỰC TIẾP (Sẽ chỉ xuất hiện khi gọi window.print()) */}
        <IncidentPrintView
          incident={submittedIncident.incident}
          details={submittedIncident.details}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fError && (
        <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-xs font-bold leading-tight">Không tải được danh mục: {fError}</div>
        </div>
      )}

      {fLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-[#026f17]">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Đang tải danh mục…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* BƯỚC 1: PHÂN LOẠI NHÓM SỰ CỐ */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
            <h4 className={bv103LayoutChrome.labelBlockAccent}>
              Bước 1: Chọn Phân loại Nhóm Sự Cố
            </h4>
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
                        ? "border-[#026f17] bg-emerald-50/50 ring-2 ring-emerald-500/10 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#026f17] text-white">
                        <CheckCircle2 size={12} />
                      </div>
                    )}
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 transition-all ${
                        isSelected ? "bg-[#026f17]/10 text-[#026f17]" : "bg-white text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      <IconComp size={18} />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-wide leading-tight ${isSelected ? "text-[#026f17]" : "text-slate-700"}`}>
                      {INCIDENT_GROUP_LABEL[g].split(" (")[0]}
                    </span>
                    <span className="mt-1 text-[9px] font-medium leading-relaxed text-slate-400">
                      {GROUP_SUBTITLES[g]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BƯỚC 2: ĐIỀN THÔNG TIN BẢN GHI THEO NGỮ CẢNH THEO TỪNG TAB DÂN DỤNG */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* CỘT TRÁI: DYNAMIC THEO NHÓM SỰ CỐ */}
            {incidentGroup === "PROCESS" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <Layers size={16} className="text-[#026f17]" />
                  Thông tin truy vết Quy trình
                </h4>
                <div className="space-y-4">
                  {/* Quét mã QR bộ dụng cụ (Bắt buộc) */}
                  <div className="space-y-1.5">
                    <label className={bv103LayoutChrome.labelBlock}>
                      Quét mã QR Bộ dụng cụ <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="group relative">
                      <input
                        value={form.maQR}
                        onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                        onKeyDown={handleQrKeyDown}
                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-lg font-black tracking-widest text-red-600 outline-none transition-all focus:border-[#026f17] focus:bg-white focus:ring-2 focus:ring-[#026f17]/10"
                        placeholder="QUÉT QR BỘ DỤNG CỤ..."
                        autoFocus={allowStationOverride}
                      />
                      <div className="absolute right-4 top-4 text-slate-300">
                        <QrCode size={20} className={form.maQR ? "text-[#026f17]" : ""} />
                      </div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 italic">
                      * Nhấn Enter sau khi quét để hệ thống truy vết khâu làm việc trước.
                    </p>
                  </div>

                  {/* Khâu phát sinh lỗi & Nhân sự liên quan */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Khâu phát sinh lỗi</label>
                      <select
                        value={form.faultStation || detectionStation}
                        onChange={(e) => handleFieldChange("faultStation", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Nhân sự liên quan / Người liên quan</label>
                      <input
                        value={form.faultOperator}
                        onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Mã hoặc tên nhân viên..."
                      />
                    </div>
                  </div>

                  {allowStationOverride && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
                      <select
                        value={detectionStation}
                        onChange={(e) => setDetectionStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {incidentGroup === "INSTRUMENT" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <Wrench size={16} className="text-[#026f17]" />
                  Thông tin truy vết Dụng cụ
                </h4>
                <div className="space-y-4">
                  {/* Quét mã QR bộ dụng cụ (Bắt buộc) */}
                  <div className="space-y-1.5">
                    <label className={bv103LayoutChrome.labelBlock}>
                      Quét mã QR Bộ dụng cụ lỗi <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="group relative">
                      <input
                        value={form.maQR}
                        onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                        onKeyDown={handleQrKeyDown}
                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-lg font-black tracking-widest text-red-600 outline-none transition-all focus:border-[#026f17] focus:bg-white focus:ring-2 focus:ring-[#026f17]/10"
                        placeholder="QUÉT QR BỘ DỤNG CỤ..."
                        autoFocus={allowStationOverride}
                      />
                      <div className="absolute right-4 top-4 text-slate-300">
                        <QrCode size={20} className={form.maQR ? "text-[#026f17]" : ""} />
                      </div>
                    </div>
                  </div>

                  {/* QR Dụng cụ lẻ & Nhân sự liên quan */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Dụng cụ lẻ lỗi / thiếu / mất (nếu có)</label>
                      <input
                        value={form.errorQR}
                        onChange={(e) => handleFieldChange("errorQR", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Quét QR dụng cụ lẻ hoặc nhập tên..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Nhân sự liên quan / Người liên quan</label>
                      <input
                        value={form.faultOperator}
                        onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Mã hoặc tên nhân viên..."
                      />
                    </div>
                  </div>

                  {allowStationOverride && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
                      <select
                        value={detectionStation}
                        onChange={(e) => setDetectionStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {incidentGroup === "EQUIPMENT" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <Cpu size={16} className="text-[#026f17]" />
                  Thông tin truy vết Thiết bị / Máy móc
                </h4>
                <div className="space-y-4">
                  {/* Chọn máy gặp sự cố (Bắt buộc) */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                      Thiết bị gặp sự cố <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={form.machineId}
                      onChange={(e) => handleFieldChange("machineId", e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                      required={incidentGroup === "EQUIPMENT"}
                    >
                      <option value="">-- Chọn máy gặp sự cố --</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.ten}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nhân sự liên quan & QR Bộ dụng cụ bị ảnh hưởng (Tùy chọn) */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Nhân sự liên quan / Người liên quan</label>
                      <input
                        value={form.faultOperator}
                        onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Người vận hành, giám sát..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Mã QR Bộ dụng cụ bị ảnh hưởng (nếu có)</label>
                      <input
                        value={form.maQR}
                        onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                        onKeyDown={handleQrKeyDown}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-red-600 tracking-wider outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Quét/nhập mã QR bộ..."
                      />
                    </div>
                  </div>

                  {allowStationOverride && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
                      <select
                        value={detectionStation}
                        onChange={(e) => setDetectionStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {incidentGroup === "CHEMICAL" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <FlaskConical size={16} className="text-[#026f17]" />
                  Thông tin truy vết Hóa chất / Vật tư
                </h4>
                <div className="space-y-4">
                  {/* Chọn hóa chất / vật tư */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                      Hóa chất / Vật tư gặp sự cố <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={form.machineId}
                      onChange={(e) => handleFieldChange("machineId", e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                      required={incidentGroup === "CHEMICAL"}
                    >
                      <option value="">-- Chọn hóa chất từ danh mục --</option>
                      {chemicals.map((c) => (
                        <option key={c.id} value={`${c.ma} - ${c.ten}`}>
                          {c.ma} - {c.ten}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mã lô & Nhân sự liên quan */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                        Mã lô hóa chất / vật tư <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        value={form.errorQR}
                        onChange={(e) => handleFieldChange("errorQR", e.target.value.toUpperCase())}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Nhập mã lô hàng..."
                        required={incidentGroup === "CHEMICAL"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Nhân sự liên quan / Người liên quan</label>
                      <input
                        value={form.faultOperator}
                        onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Người pha chế, giám sát..."
                      />
                    </div>
                  </div>

                  {/* Mã QR bộ dụng cụ bị ảnh hưởng (Tùy chọn) */}
                  <div className="space-y-1.5">
                    <label className={bv103LayoutChrome.labelBlock}>Mã QR Bộ dụng cụ bị ảnh hưởng (Tùy chọn)</label>
                    <input
                      value={form.maQR}
                      onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                      onKeyDown={handleQrKeyDown}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-red-600 tracking-wider outline-none transition-all focus:border-[#026f17] focus:bg-white"
                      placeholder="Quét hoặc nhập QR bộ..."
                    />
                  </div>

                  {allowStationOverride && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
                      <select
                        value={detectionStation}
                        onChange={(e) => setDetectionStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {incidentGroup === "OTHER" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <AlertTriangle size={16} className="text-[#026f17]" />
                  Thông tin truy vết Sự cố khác
                </h4>
                <div className="space-y-4">
                  {/* Khâu rollback & Mã tham chiếu khác */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Giai đoạn xử lý lại</label>
                      <select
                        value={form.faultStation}
                        onChange={(e) => handleFieldChange("faultStation", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                      >
                        <option value="">— Tự động Rollback —</option>
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Mã tham chiếu phụ (nếu có)</label>
                      <input
                        value={form.errorQR}
                        onChange={(e) => handleFieldChange("errorQR", e.target.value.toUpperCase())}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Số phiếu, mã đặc thù..."
                      />
                    </div>
                  </div>

                  {/* Nhân sự liên quan & Bộ dụng cụ liên quan */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Nhân sự liên quan / Người liên quan</label>
                      <input
                        value={form.faultOperator}
                        onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="Mã hoặc tên nhân viên..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={bv103LayoutChrome.labelBlock}>Mã QR bộ dụng cụ liên quan (nếu có)</label>
                      <input
                        value={form.maQR}
                        onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                        onKeyDown={handleQrKeyDown}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-red-600 tracking-wider outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Quét hoặc nhập QR bộ..."
                      />
                    </div>
                  </div>

                  {allowStationOverride && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <label className={bv103LayoutChrome.labelBlock}>Trạm phát hiện</label>
                      <select
                        value={detectionStation}
                        onChange={(e) => setDetectionStation(e.target.value as Station)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#026f17]"
                      >
                        {INCIDENT_STATION_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CỘT PHẢI: CHI TIẾT SỰ CỐ & PHẢN HỒI GỬI BÁO CÁO (DÙNG CHUNG CỰC KỲ CÂN ĐỐI) */}
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <FileText size={16} className="text-[#026f17]" />
                  Chi tiết sự cố &amp; Minh chứng
                </h4>

                <div className="space-y-4">
                  {/* TIÊU ĐỀ HẠNG MỤC SỰ CỐ CHỌN NHANH */}
                  <div className="space-y-1.5">
                    <label className={bv103LayoutChrome.labelBlock}>Loại sự cố chi tiết</label>
                    {incidentGroup === "OTHER" ? (
                      <input
                        value={form.typeTen}
                        onChange={(e) => handleFieldChange("typeTen", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Gõ tóm tắt loại sự cố phát sinh..."
                      />
                    ) : (
                      <div className="relative">
                        <select
                          value={form.typeId}
                          onChange={(e) => {
                            const sel = activeGroupOptions.find((c) => c.id === e.target.value);
                            setForm((f) => ({ ...f, typeId: e.target.value, typeTen: sel?.ten || "" }));
                          }}
                          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        >
                          {activeGroupOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.ten}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={16} />
                      </div>
                    )}
                  </div>

                  {/* DIỄN GIẢI CHI TIẾT TÌNH HUỐNG */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                      Diễn giải chi tiết tình huống <span className="text-red-500 font-bold">*</span>
                    </label>
                    <textarea
                      value={form.desc}
                      onChange={(e) => handleFieldChange("desc", e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                      placeholder="Mô tả cụ thể sự việc để phục vụ hậu kiểm..."
                    />
                  </div>

                  {/* ẢNH MINH CHỨNG (TÙY CHỌN - ĐƯỜNG DẪN HOẶC GOOGLE DRIVE LINK) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className={bv103LayoutChrome.labelBlock}>Ảnh minh chứng (Tùy chọn)</label>
                    <div className="relative">
                      <input
                        value={form.anhMinhChung}
                        onChange={(e) => handleFieldChange("anhMinhChung", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                        placeholder="Dán link ảnh hoặc link chia sẻ từ Google Drive..."
                      />
                      <div className="absolute right-3.5 top-3.5 text-slate-400">
                        <Camera size={16} />
                      </div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 leading-relaxed">
                      * Bản in chuẩn y tế tự động bóc tách ID Google Drive và hiển thị ảnh thô sắc nét.
                    </p>

                    {form.anhMinhChung && (
                      <div className="mt-3 flex flex-col items-center justify-center border border-slate-200 bg-slate-50 rounded-xl p-3 max-h-48 overflow-hidden animate-in fade-in duration-300">
                        <img
                          src={getGoogleDriveDirectLink(form.anhMinhChung)}
                          alt="Preview ảnh minh chứng"
                          className="max-h-40 object-contain rounded-lg shadow-sm border border-slate-100 bg-white"
                          onError={(e) => {
                            // Ẩn thumbnail nếu link không tải được
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">Xem trước ảnh minh chứng</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NÚT GỬI BÁO CÁO */}
              <button
                type="submit"
                disabled={loading || !!fError || fLoading}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-red-600 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <CheckCircle2 size={18} /> Gửi báo cáo &amp; Xử lý Rollback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
