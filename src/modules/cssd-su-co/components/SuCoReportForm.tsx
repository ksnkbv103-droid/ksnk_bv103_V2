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
} from "lucide-react";
import { toast } from "sonner";
import { fetchSuCoFormCatalog } from "../actions/su-co-form-catalog.actions";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createIncidentReport } from "../actions/su-co-report.actions";
import {
  classifyIncidentGroupByTypeName,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export type SuCoReportFormProps = {
  /** Trạm phát hiện ban đầu (từ ERP) hoặc mặc định trên trang riêng */
  initialStation: Station;
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
  allowStationOverride = false,
  enabled,
  onSubmitted,
}: SuCoReportFormProps) {
  const [loading, setLoading] = useState(false);
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [detectionStation, setDetectionStation] = useState<Station>(initialStation);
  const [incidentGroup, setIncidentGroup] = useState<IncidentGroup>("PROCESS");
  const [form, setForm] = useState({
    maQR: "",
    typeId: "",
    typeTen: "",
    desc: "",
    errorQR: "",
    machineId: "",
    faultStation: initialStation as string,
    faultOperator: "",
  });
  const [categories, setCategories] = useState<{ id: string; ten: string }[]>([]);
  const [machines, setMachines] = useState<{ id: string; ten: string }[]>([]);

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
          typeId: "OTHER_CUSTOM",
          typeTen: "",
          faultStation: "",
          faultOperator: "",
        };
      }
      return {
        ...f,
        typeId: activeGroupOptions.some((x) => x.id === f.typeId) ? f.typeId : first?.id || "",
        typeTen: activeGroupOptions.some((x) => x.id === f.typeId)
          ? activeGroupOptions.find((x) => x.id === f.typeId)?.ten || f.typeTen
          : first?.ten || "",
        faultStation: f.faultStation || st,
      };
    });
  }, [incidentGroup, detectionStation, activeGroupOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maQR || !form.desc) return toast.error("Vui lòng điền đủ thông tin bắt buộc");
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
        maQR: form.maQR,
        typeId: form.typeId,
        typeTen: form.typeTen,
        desc: form.desc,
        errorQR: form.errorQR?.trim() || undefined,
        machineId: form.machineId?.trim() || undefined,
        faultOperator: form.faultOperator?.trim() || undefined,
        station: st,
        incidentGroup,
        faultStation: faultStationPayload,
      };

      try {
        const res = await createIncidentReport(payload);
        if (res.isRedAlert)
          toast.error("⚠️ CẢNH BÁO ĐỎ: Mã QR này đã có từ 2 sự cố trước — lần báo này được đánh dấu đỏ.", {
            duration: 8000,
          });
        else toast.success("Đã ghi nhận sự cố thành công!");
      } catch (err: unknown) {
        const { isNetworkError, pushOfflineTask } = await import("@/lib/offline-sync");
        if (isNetworkError(err)) {
          await pushOfflineTask("REPORT_INCIDENT", payload);
          toast.info("Đã lưu ngoại tuyến", {
            description: "Báo cáo sự cố sẽ được tự động đồng bộ khi có mạng."
          });
        } else {
          throw err;
        }
      }

      setForm((f) => ({
        ...f,
        maQR: "",
        desc: "",
        errorQR: "",
        machineId: "",
        faultOperator: "",
        ...(incidentGroup === "OTHER" ? { typeTen: "" } : {}),
      }));
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không gửi được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

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
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)]">
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

          {/* BƯỚC 2: ĐIỀN THÔNG TIN BẢN GHI THEO NGỮ CẢNH */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in duration-300">
            {/* CỘT TRÁI: THÔNG TIN TRUY VẾT & NGỮ CẢNH THEO TỪNG NHÓM SỰ CỐ */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
                <h4 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  <QrCode size={16} className="text-[#026f17]" />
                  Thông tin truy vết &amp; Ngữ cảnh
                </h4>

                {/* TRƯỜNG QR CHÍNH (BỘ DỤNG CỤ / MÁY MÓC / HÓA CHẤT) DÀNH CHO BÁO CÁO */}
                <div className="space-y-1.5">
                  <label className={bv103LayoutChrome.labelBlock}>
                    {incidentGroup === "EQUIPMENT"
                      ? "Mã QR bộ dụng cụ bị ảnh hưởng"
                      : incidentGroup === "CHEMICAL"
                        ? "Mã QR bộ dụng cụ hoặc mã hóa chất chịu ảnh hưởng"
                        : "Quét mã QR Bộ dụng cụ"}
                  </label>
                  <div className="group relative">
                    <input
                      value={form.maQR}
                      onChange={(e) => handleFieldChange("maQR", e.target.value.toUpperCase())}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-lg font-black tracking-widest text-red-600 outline-none transition-all focus:border-[#026f17] focus:bg-white focus:ring-2 focus:ring-[#026f17]/10"
                      placeholder="QUÉT QR BỘ DỤNG CỤ..."
                      autoFocus={allowStationOverride}
                    />
                    <div className="absolute right-4 top-4 text-slate-300">
                      <QrCode size={20} className={form.maQR ? "text-emerald-600" : ""} />
                    </div>
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 italic">
                    * Bắt buộc quét mã QR hợp lệ trong quy trình CSSD.
                  </p>
                </div>

                {/* CÁC TRƯỜNG DỮ LIỆU ĐỘNG THEO TỪNG NHÓM SỰ CỐ */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* DỤNG CỤ */}
                  {incidentGroup === "INSTRUMENT" && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <label className={bv103LayoutChrome.labelBlock}>Mã QR Dụng cụ lẻ lỗi (nếu có)</label>
                      <div className="relative">
                        <input
                          value={form.errorQR}
                          onChange={(e) => handleFieldChange("errorQR", e.target.value.toUpperCase())}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                          placeholder="QUÉT MÃ DỤNG CỤ LẺ..."
                        />
                      </div>
                    </div>
                  )}

                  {/* QUY TRÌNH */}
                  {incidentGroup === "PROCESS" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2">
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
                        <label className={bv103LayoutChrome.labelBlock}>Nhân sự gây lỗi (nếu rõ)</label>
                        <input
                          value={form.faultOperator}
                          onChange={(e) => handleFieldChange("faultOperator", e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                          placeholder="Mã/Tên nhân viên..."
                        />
                      </div>
                    </div>
                  )}

                  {/* THIẾT BỊ / MÁY MÓC */}
                  {incidentGroup === "EQUIPMENT" && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <label className={bv103LayoutChrome.labelBlock}>Thiết bị gặp sự cố</label>
                      <select
                        value={form.machineId}
                        onChange={(e) => handleFieldChange("machineId", e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                      >
                        <option value="">-- Chọn máy từ danh mục --</option>
                        {machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.ten}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* HÓA CHẤT */}
                  {incidentGroup === "CHEMICAL" && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <label className={bv103LayoutChrome.labelBlock}>Mã lô hóa chất / vật tư liên quan</label>
                      <input
                        value={form.errorQR}
                        onChange={(e) => handleFieldChange("errorQR", e.target.value.toUpperCase())}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                        placeholder="NHẬP MÃ LÔ / HÓA CHẤT..."
                      />
                    </div>
                  )}

                  {/* KHÁC */}
                  {incidentGroup === "OTHER" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2">
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
                        <label className={bv103LayoutChrome.labelBlock}>Mã tham chiếu khác</label>
                        <input
                          value={form.errorQR}
                          onChange={(e) => handleFieldChange("errorQR", e.target.value.toUpperCase())}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none transition-all focus:border-[#026f17]"
                          placeholder="MÃ PHỤ THAM CHIẾU..."
                        />
                      </div>
                    </div>
                  )}
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

            {/* CỘT PHẢI: CHI TIẾT SỰ CỐ & PHẢN HỒI GỬI BÁO CÁO */}
            <div className="lg:col-span-7 space-y-6">
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
                        placeholder="Nhập loại sự cố khác..."
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
                    <label className={bv103LayoutChrome.labelBlock}>Diễn giải chi tiết tình huống</label>
                    <textarea
                      value={form.desc}
                      onChange={(e) => handleFieldChange("desc", e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                      placeholder="Mô tả cụ thể sự việc để phục vụ hậu kiểm..."
                    />
                  </div>

                  {/* TẢI ẢNH MINH CHỨNG */}
                  <button
                    type="button"
                    className="flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] cursor-pointer"
                  >
                    <Camera size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Tải lên / Chụp ảnh minh chứng</span>
                  </button>
                </div>
              </div>

              {/* NÚT GỬI BÁO CÁO */}
              <button
                type="submit"
                disabled={loading || !!fError || fLoading}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-red-600 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
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
