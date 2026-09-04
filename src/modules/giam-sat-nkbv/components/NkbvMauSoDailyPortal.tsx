"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Calendar, ShieldCheck, Heart, Users, Plus, Zap } from "lucide-react";
import { formatDateVi, todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  getNkbvMauSoMonthCoverage,
  saveNkbvMauSoDaily,
  saveNkbvMauSoPhauThuat,
} from "../actions/giam-sat-nkbv-mau-so.actions";
import { previewMauSoFromDeviceRegistryAction } from "../actions/giam-sat-nkbv-device-registry.actions";
import {
  listCalendarDaysInMonth,
  softWarnMauSoDailyCensus,
} from "../lib/nkbv-mau-so-daily-rules";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import {
  formatNhsnOptionLabel,
  NKBV_NHSN_PROCEDURES,
  softWarnMauSoSurgery,
} from "../lib/nkbv-ssi-nhsn-catalog";

type NkbvMauSoDailyPortalProps = {
  khoas: Array<{ id: string; ten_danh_muc: string; ma_danh_muc?: string }>;
  selectedKhoaId: string;
  onKhoaChange: (id: string) => void;
};

type CoverageState = {
  submitted_dates: string[];
  missing_dates: string[];
  missing_count: number;
  bed_capacity: number | null;
};

export default function NkbvMauSoDailyPortal({
  khoas,
  selectedKhoaId,
  onKhoaChange,
}: NkbvMauSoDailyPortalProps) {
  const [subTab, setSubTab] = useState<"daily" | "surgery">("daily");

  const [ngayGhiNhan, setNgayGhiNhan] = useState(() => todayYmdInVn());
  const [foleyDays, setFoleyDays] = useState<number>(0);
  const [cvcDays, setCvcDays] = useState<number>(0);
  const [ventDays, setVentDays] = useState<number>(0);
  const [patientDays, setPatientDays] = useState<number>(0);
  const [emvEpisodes, setEmvEpisodes] = useState<number>(0);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [registryPreview, setRegistryPreview] = useState<string>("");
  const [coverage, setCoverage] = useState<CoverageState | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);

  const yearMonth = useMemo(() => {
    const [y, m] = ngayGhiNhan.slice(0, 7).split("-").map(Number);
    return { year: y, month: m };
  }, [ngayGhiNhan]);

  const loadCoverage = useCallback(async () => {
    if (!selectedKhoaId) {
      setCoverage(null);
      return;
    }
    setCoverageLoading(true);
    try {
      const res = await getNkbvMauSoMonthCoverage({
        khoa_id: selectedKhoaId,
        year: yearMonth.year,
        month: yearMonth.month,
      });
      if (!res.success) {
        setCoverage(null);
        return;
      }
      setCoverage({
        submitted_dates: res.data.submitted_dates,
        missing_dates: res.data.missing_dates,
        missing_count: res.data.missing_count,
        bed_capacity: res.data.bed_capacity,
      });
    } finally {
      setCoverageLoading(false);
    }
  }, [selectedKhoaId, yearMonth.year, yearMonth.month]);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  const liveSoftWarns = useMemo(
    () =>
      softWarnMauSoDailyCensus(
        {
          so_ngay_dieu_tri: patientDays,
          so_ngay_catheter_cvc: cvcDays,
          so_ngay_sonde_tieu: foleyDays,
          so_ngay_tho_may: ventDays,
        },
        coverage?.bed_capacity,
      ).filter((w) => w.code !== "PATIENT_ZERO"),
    [patientDays, cvcDays, foleyDays, ventDays, coverage?.bed_capacity],
  );

  const calendarDays = useMemo(
    () => listCalendarDaysInMonth(yearMonth.year, yearMonth.month),
    [yearMonth.year, yearMonth.month],
  );

  const submittedSet = useMemo(
    () => new Set(coverage?.submitted_dates ?? []),
    [coverage?.submitted_dates],
  );
  const missingSet = useMemo(
    () => new Set(coverage?.missing_dates ?? []),
    [coverage?.missing_dates],
  );

  const handlePreviewRegistry = async () => {
    if (!selectedKhoaId) {
      toast.error("Chọn khoa trước khi preview Registry");
      return;
    }
    const res = await previewMauSoFromDeviceRegistryAction({
      khoa_id: selectedKhoaId,
      from: ngayGhiNhan,
      to: ngayGhiNhan,
    });
    if (!res.success) {
      toast.error(res.error || "Preview thất bại");
      return;
    }
    const p = res.data;
    setRegistryPreview(
      `Registry → CVC ${p.so_ngay_catheter_cvc} · Foley ${p.so_ngay_sonde_tieu} · Vent ${p.so_ngay_tho_may} (${p.device_rows_considered} dòng)`,
    );
    toast.message("Xem trước từ sổ đăng ký dụng cụ (không ghi đè form)");
  };

  const [ngayPhauThuat, setNgayPhauThuat] = useState(() => todayYmdInVn());
  const [maBenhNhan, setMaBenhNhan] = useState("");
  const [hoTenBenhNhan, setHoTenBenhNhan] = useState("");
  const [tenPhauThuat, setTenPhauThuat] = useState("");
  const [loaiPhauThuatNhsn, setLoaiPhauThuatNhsn] = useState("COLO");
  const [phanLoaiVetMo, setPhanLoaiVetMo] = useState<"SACH" | "SACH_NHIEM" | "NHIEM" | "BAN">("SACH");
  const [coDatImplant, setCoDatImplant] = useState(false);
  const [asaScore, setAsaScore] = useState<number>(2);
  const [thoiGianMoPhut, setThoiGianMoPhut] = useState<number>(90);
  const [thoiGianNguongNhsn, setThoiGianNguongNhsn] = useState<number>(120);
  const [isLaparoscopic, setIsLaparoscopic] = useState(false);
  const [surgeryLoading, setSurgeryLoading] = useState(false);

  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKhoaId) {
      toast.error("Vui lòng chọn khoa để báo cáo!");
      return;
    }
    if (patientDays <= 0) {
      toast.error("Số BN hiện diện đúng ngày báo cáo (patient-days) phải lớn hơn 0!");
      return;
    }

    const warns = softWarnMauSoDailyCensus(
      {
        so_ngay_dieu_tri: patientDays,
        so_ngay_catheter_cvc: cvcDays,
        so_ngay_sonde_tieu: foleyDays,
        so_ngay_tho_may: ventDays,
      },
      coverage?.bed_capacity,
    ).filter((w) => w.code !== "PATIENT_ZERO");

    let softWarnAck = false;
    if (warns.length > 0) {
      const ok = window.confirm(
        `Cảnh báo census (nghi nhập tổng tuần vào 1 ngày):\n\n${warns
          .map((w) => `• ${w.message}`)
          .join("\n")}\n\nVẫn lưu đúng ngày ${formatDateVi(ngayGhiNhan)}? Hệ thống không nội suy ngày thiếu.`,
      );
      if (!ok) return;
      softWarnAck = true;
    }

    setDailyLoading(true);
    try {
      const res = await saveNkbvMauSoDaily({
        khoa_id: selectedKhoaId,
        ngay_ghi_nhan: ngayGhiNhan,
        so_ngay_tho_may: ventDays,
        so_ngay_catheter_cvc: cvcDays,
        so_ngay_sonde_tieu: foleyDays,
        so_ngay_dieu_tri: patientDays,
        so_dot_tho_may_emv: emvEpisodes,
        metadata: softWarnAck
          ? {
              soft_warn_ack: true,
              soft_warn_codes: warns.map((w) => w.code),
              soft_warn_at: new Date().toISOString(),
            }
          : {},
      });

      if (res.success) {
        toast.success(`Đã ghi nhận census đúng ngày ${formatDateVi(ngayGhiNhan)}`);
        setFoleyDays(0);
        setCvcDays(0);
        setVentDays(0);
        setEmvEpisodes(0);
        void loadCoverage();
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi lưu số liệu";
      toast.error(msg);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleSurgerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKhoaId) {
      toast.error("Vui lòng chọn khoa phẫu thuật!");
      return;
    }
    if (!maBenhNhan.trim() || !hoTenBenhNhan.trim() || !tenPhauThuat.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin ca phẫu thuật!");
      return;
    }

    const surgeryWarns = softWarnMauSoSurgery({
      loai_phau_thuat_nhsn: loaiPhauThuatNhsn,
      phan_loai_vet_mo: phanLoaiVetMo,
      asa_score: asaScore,
      thoi_gian_mo_phut: thoiGianMoPhut,
    });
    for (const w of surgeryWarns) {
      toast.warning(w.message);
    }

    setSurgeryLoading(true);
    try {
      const res = await saveNkbvMauSoPhauThuat({
        khoa_id: selectedKhoaId,
        ngay_phau_thuat: ngayPhauThuat,
        ma_benh_nhan: maBenhNhan.trim(),
        ho_ten_benh_nhan: hoTenBenhNhan.trim(),
        ten_phau_thuat: tenPhauThuat.trim(),
        loai_phau_thuat_nhsn: loaiPhauThuatNhsn,
        phan_loai_vet_mo: phanLoaiVetMo,
        co_dat_implant: coDatImplant,
        asa_score: asaScore,
        thoi_gian_mo_phut: thoiGianMoPhut,
        thoi_gian_nguong_nhsn: thoiGianNguongNhsn,
        is_laparoscopic: isLaparoscopic,
      });

      if (res.success) {
        toast.success(
          `Đã lưu thông số phẫu thuật cho BN ${hoTenBenhNhan} (Expected SSI Prob: ${(res.data.expected_ssi_prob * 100).toFixed(2)}%)!`,
        );
        setMaBenhNhan("");
        setHoTenBenhNhan("");
        setTenPhauThuat("");
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi lưu số liệu";
      toast.error(msg);
    } finally {
      setSurgeryLoading(false);
    }
  };

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSubTab("daily")}
            className={`${C.segmentTab} ${
              subTab === "daily"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Activity className="h-4 w-4" /> Mẫu số Ngày - Thiết bị
          </button>
          <button
            type="button"
            onClick={() => setSubTab("surgery")}
            className={`${C.segmentTab} ${
              subTab === "surgery"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Zap className="h-4 w-4" /> Mẫu số phẫu thuật (SSI)
          </button>
        </div>
      </div>

      {subTab === "daily" ? (
        <form onSubmit={handleDailySubmit} className={`${C.shell} p-5 space-y-[var(--bv103-space-3)]`}>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--primary)]" />
              Census mẫu số theo từng ngày lịch
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mỗi dòng = số BN / dụng cụ hiện diện đúng ngày báo cáo. Bắt buộc nhập từng ngày — hệ thống
              chỉ cộng các ngày đã nộp, không nội suy / không chia từ tổng tuần.
            </p>
          </div>

          <div
            className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 space-y-1"
            role="note"
          >
            <p className="font-semibold">Quy tắc vận hành</p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90">
              <li>Nhập đủ mọi ngày lịch trong tháng (không bỏ ngày, không gộp tuần vào 1 ô).</li>
              <li>Ngày thiếu trên lưới sẽ làm mẫu số tháng thấp hơn thực tế khi tính tỷ lệ.</li>
              {coverage?.bed_capacity != null ? (
                <li>
                  Sức chứa khoa (MDM): ~{coverage.bed_capacity} giường — số census ngày vượt rõ ngưỡng
                  này sẽ được cảnh báo trước khi lưu.
                </li>
              ) : (
                <li>Chưa có số giường MDM cho khoa — vẫn cảnh báo khi số ngày rất lớn (≥80).</li>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={C.labelField}>Khoa ghi nhận</label>
              <select
                value={selectedKhoaId}
                onChange={(e) => onKhoaChange(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                required
              >
                <option value="">Chọn khoa phòng...</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {formatKhoaPickerLabel({
                      ma_danh_muc: k.ma_danh_muc,
                      ten_danh_muc: k.ten_danh_muc,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Ngày báo cáo (census đúng ngày này)</label>
              <div className="relative">
                <input
                  type="date"
                  value={ngayGhiNhan}
                  onChange={(e) => setNgayGhiNhan(e.target.value)}
                  className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  required
                />
                <Calendar className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedKhoaId ? (
            <div className={`${C.panelInset} p-4 space-y-3`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  Phủ ngày tháng {String(yearMonth.month).padStart(2, "0")}/{yearMonth.year}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {coverageLoading
                    ? "Đang tải…"
                    : coverage
                      ? `Đã nộp ${coverage.submitted_dates.length} · Thiếu ${coverage.missing_count} ngày (đến hôm nay)`
                      : "Không tải được lịch phủ"}
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day) => {
                  const d = Number(day.slice(8, 10));
                  const isSubmitted = submittedSet.has(day);
                  const isMissing = missingSet.has(day);
                  const isSelected = day === ngayGhiNhan;
                  const isFuture = !isSubmitted && !isMissing && day > todayYmdInVn();
                  let tone =
                    "bg-slate-50 text-slate-400 border-slate-100";
                  if (isSubmitted) tone = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  else if (isMissing) tone = "bg-rose-50 text-rose-800 border-rose-200 font-semibold";
                  else if (isFuture) tone = "bg-white text-slate-300 border-dashed border-slate-200";
                  return (
                    <button
                      key={day}
                      type="button"
                      title={
                        isSubmitted
                          ? `${formatDateVi(day)}: đã nộp`
                          : isMissing
                            ? `${formatDateVi(day)}: thiếu — bấm để nhập`
                            : formatDateVi(day)
                      }
                      onClick={() => setNgayGhiNhan(day)}
                      className={`rounded-md border px-1 py-1.5 text-center text-[11px] tabular-nums ${tone} ${
                        isSelected ? "ring-2 ring-[var(--primary)] ring-offset-1" : ""
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                Xanh = đã nộp · Đỏ = thiếu (cần nhập) · Xám nhạt = ngày tương lai · Bấm ngày để chọn vào
                form.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2">
            <button
              type="button"
              className={C.ctaSecondary}
              onClick={() => void handlePreviewRegistry()}
            >
              Xem trước từ sổ đăng ký
            </button>
            {registryPreview ? (
              <span className="text-xs font-mono text-slate-600">{registryPreview}</span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Song song nhập tay — không ghi đè ô bên dưới
              </span>
            )}
          </div>

          {liveSoftWarns.length > 0 ? (
            <div
              className="rounded-[var(--radius-shell)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 space-y-1"
              role="status"
            >
              {liveSoftWarns.map((w) => (
                <p key={w.code + w.message}>⚠ {w.message}</p>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[var(--bv103-space-3)] pt-2">
            <div className={`${C.panelInset} p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={C.labelField}>BN hiện diện (patient-days)</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <input
                type="number"
                min="0"
                value={patientDays || ""}
                onChange={(e) => setPatientDays(parseInt(e.target.value) || 0)}
                placeholder="Số BN đúng ngày này"
                className="w-full border-0 bg-transparent text-xl font-semibold focus:ring-0 p-0 text-slate-800"
                required
              />
              <p className="text-[11px] text-slate-400">
                Số bệnh nhân hiện diện tại khoa đúng ngày báo cáo (không phải tổng tuần).
              </p>
            </div>

            <div className={`${C.panelInset} p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={C.labelField}>BN có CVC (ngày đó)</span>
                <Heart className="h-4 w-4 text-red-500" />
              </div>
              <input
                type="number"
                min="0"
                value={cvcDays || ""}
                onChange={(e) => setCvcDays(parseInt(e.target.value) || 0)}
                placeholder="CVC-days đúng ngày"
                className="w-full border-0 bg-transparent text-xl font-semibold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Số BN đang đặt catheter TMTT đúng ngày báo cáo.
              </p>
            </div>

            <div className={`${C.panelInset} p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={C.labelField}>BN có sonde tiểu (ngày đó)</span>
                <Activity className="h-4 w-4 text-amber-500" />
              </div>
              <input
                type="number"
                min="0"
                value={foleyDays || ""}
                onChange={(e) => setFoleyDays(parseInt(e.target.value) || 0)}
                placeholder="Foley-days đúng ngày"
                className="w-full border-0 bg-transparent text-xl font-semibold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Số BN đang đặt ống thông tiểu Foley đúng ngày báo cáo.
              </p>
            </div>

            <div className={`${C.panelInset} p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={C.labelField}>BN thở máy (ngày đó)</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <input
                type="number"
                min="0"
                value={ventDays || ""}
                onChange={(e) => setVentDays(parseInt(e.target.value) || 0)}
                placeholder="Vent-days đúng ngày"
                className="w-full border-0 bg-transparent text-xl font-semibold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Số BN đang thở máy xâm lấn đúng ngày báo cáo.
              </p>
            </div>

            <div className={`${C.panelInset} p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={C.labelField}>Số đợt thở máy mới (EMV)</span>
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <input
                type="number"
                min="0"
                value={emvEpisodes || ""}
                onChange={(e) => setEmvEpisodes(parseInt(e.target.value) || 0)}
                placeholder="Đợt bắt đầu đúng ngày"
                className="w-full border-0 bg-transparent text-xl font-semibold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Số đợt bắt đầu thở máy mới đúng ngày báo cáo.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={dailyLoading}
              className={`${C.ctaPrimary} disabled:opacity-50`}
            >
              {dailyLoading ? "Đang lưu..." : "Ghi nhận census ngày này"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSurgerySubmit} className={`${C.shell} p-5 space-y-[var(--bv103-space-3)]`}>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[var(--primary)]" />
              Mẫu số ca phẫu thuật (SSI)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ghi nhận từng ca mổ để tính mẫu số theo dõi nhiễm khuẩn vết mổ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={C.labelField}>Khoa thực hiện mổ</label>
              <select
                value={selectedKhoaId}
                onChange={(e) => onKhoaChange(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                required
              >
                <option value="">Chọn khoa phòng...</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {formatKhoaPickerLabel({
                      ma_danh_muc: k.ma_danh_muc,
                      ten_danh_muc: k.ten_danh_muc,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Ngày phẫu thuật</label>
              <input
                type="date"
                value={ngayPhauThuat}
                onChange={(e) => setNgayPhauThuat(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Loại phẫu thuật (mã giám sát)</label>
              <select
                value={loaiPhauThuatNhsn}
                onChange={(e) => setLoaiPhauThuatNhsn(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                required
              >
                {NKBV_NHSN_PROCEDURES.map((opt) => (
                  <option key={opt.code} value={opt.code} title={opt.name_en}>
                    {formatNhsnOptionLabel(opt)}
                    {opt.deep_organ_surveillance_days === 90 ? " · SP90" : " · SP30"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={C.labelField}>Mã bệnh nhân (PID)</label>
              <input
                type="text"
                placeholder="Nhập mã bệnh nhân..."
                value={maBenhNhan}
                onChange={(e) => setMaBenhNhan(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Họ và tên bệnh nhân</label>
              <input
                type="text"
                placeholder="Nhập tên bệnh nhân..."
                value={hoTenBenhNhan}
                onChange={(e) => setHoTenBenhNhan(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Tên cuộc mổ cụ thể</label>
              <input
                type="text"
                placeholder="Ví dụ: Cắt đại tràng Sigma nội soi..."
                value={tenPhauThuat}
                onChange={(e) => setTenPhauThuat(e.target.value)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={C.labelField}>Phân loại vết mổ</label>
              <select
                value={phanLoaiVetMo}
                onChange={(e) => setPhanLoaiVetMo(e.target.value as "SACH" | "SACH_NHIEM" | "NHIEM" | "BAN")}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
              >
                <option value="SACH">Sạch (Class I)</option>
                <option value="SACH_NHIEM">Sạch - Nhiễm (Class II)</option>
                <option value="NHIEM">Nhiễm (Class III)</option>
                <option value="BAN">Bẩn (Class IV)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Chỉ số thể trạng ASA</label>
              <select
                value={asaScore}
                onChange={(e) => setAsaScore(parseInt(e.target.value))}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
              >
                <option value={1}>ASA 1 - Khỏe mạnh</option>
                <option value={2}>ASA 2 - Bệnh nhẹ</option>
                <option value={3}>ASA 3 - Bệnh nặng</option>
                <option value={4}>ASA 4 - Bệnh đe dọa tính mạng</option>
                <option value={5}>ASA 5 - Hấp hối</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Thời gian mổ (phút)</label>
              <input
                type="number"
                min="1"
                value={thoiGianMoPhut}
                onChange={(e) => setThoiGianMoPhut(parseInt(e.target.value) || 0)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={C.labelField}>Ngưỡng thời gian mổ (phút)</label>
              <input
                type="number"
                min="1"
                value={thoiGianNguongNhsn}
                onChange={(e) => setThoiGianNguongNhsn(parseInt(e.target.value) || 120)}
                className="w-full rounded-[var(--radius-shell)] border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[var(--primary)]"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-[var(--bv103-space-3)] pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={coDatImplant}
                onChange={(e) => setCoDatImplant(e.target.checked)}
                className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="flex items-center gap-1">
                Có đặt Thiết bị nhân tạo (Implant)
                <span className="text-[11px] text-slate-400 lowercase">
                  (thuộc tính ca — độc lập cửa sổ SP 30/90)
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLaparoscopic}
                onChange={(e) => setIsLaparoscopic(e.target.checked)}
                className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="flex items-center gap-1">
                Phẫu thuật nội soi (Laparoscopic)
                <span className="text-[11px] text-[var(--primary)] lowercase">
                  (giảm nhẹ hệ số rủi ro SSI)
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={surgeryLoading}
              className={`${C.ctaPrimary} disabled:opacity-50`}
            >
              {surgeryLoading ? "Đang lưu..." : "Ghi nhận ca phẫu thuật"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
