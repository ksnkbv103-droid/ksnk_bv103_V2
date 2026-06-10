"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings2,
  Thermometer,
  User,
  CheckCircle,
  Camera,
  AlertCircle,
  ShieldAlert,
  ImageIcon,
  Check,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PassFailToggle } from "./me-tiet-khuan-qc-primitives";

type Tri = "DAT" | "KHONG_DAT" | "" | "NA";

/** Ô upload / nhập URL ảnh minh chứng */
function PhotoProof({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Camera size={12} className={required ? "text-amber-500" : "text-slate-400"} />
        Ảnh minh chứng — {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <ImageIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-full rounded-xl border-2 border-slate-100 bg-slate-50 pl-8 pr-3 text-xs font-medium outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-50"
          placeholder="URL ảnh hoặc mã tham chiếu file..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** Một block chỉ thị — nhãn, badge bắt buộc/tuỳ chọn, toggle đạt/không đạt, ảnh */
function ChiThiBlock({
  label,
  required,
  value,
  onChange,
  photoLabel,
  photoValue,
  onPhotoChange,
  showPhoto,
}: {
  label: string;
  required: boolean;
  value: "DAT" | "KHONG_DAT" | "";
  onChange: (v: "DAT" | "KHONG_DAT" | "") => void;
  photoLabel: string;
  photoValue: string;
  onPhotoChange: (v: string) => void;
  showPhoto: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-slate-700">{label}</span>
        {required ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-600">
            Bắt buộc
          </span>
        ) : (
          <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400">
            Tuỳ chọn
          </span>
        )}
      </div>
      <PassFailToggle value={value} onChange={onChange} />
      {showPhoto && value === "DAT" && (
        <PhotoProof label={photoLabel} value={photoValue} onChange={onPhotoChange} required={required} />
      )}
    </div>
  );
}

export default function MeTietKhuanProcessQcPanel({
  showForm,
  showBowieDick,
  thietBi,
  nguoiUnload,
  setNguoiUnload,
  nhietDo,
  setNhietDo,
  thongSoMay,
  setThongSoMay,
  chiThiTiepXuc,
  setChiThiTiepXuc,
  chiThiDaThongSo,
  setChiThiDaThongSo,
  testSinhHoc,
  setTestSinhHoc,
  testCI,
  setTestCI,
  testBD,
  setTestBD,
  anhMay,
  setAnhMay,
  anhTiepXuc,
  setAnhTiepXuc,
  anhDaThongSo,
  setAnhDaThongSo,
  anhSinhHoc,
  setAnhSinhHoc,
  anhBowieDick,
  setAnhBowieDick,
  onFinish,
}: {
  showForm: boolean;
  showBowieDick: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thietBi: any;
  nguoiUnload: string;
  setNguoiUnload: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  thongSoMay: string;
  setThongSoMay: (v: string) => void;
  chiThiTiepXuc: "DAT" | "KHONG_DAT" | "";
  setChiThiTiepXuc: (v: "DAT" | "KHONG_DAT" | "") => void;
  chiThiDaThongSo: "DAT" | "KHONG_DAT" | "";
  setChiThiDaThongSo: (v: "DAT" | "KHONG_DAT" | "") => void;
  testSinhHoc: "DAT" | "KHONG_DAT" | "NA" | "";
  setTestSinhHoc: (v: "DAT" | "KHONG_DAT" | "NA" | "") => void;
  testCI: "DAT" | "KHONG_DAT" | "";
  setTestCI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testBD: "DAT" | "KHONG_DAT" | "NA";
  setTestBD: (v: "DAT" | "KHONG_DAT" | "NA") => void;
  anhMay: string;
  setAnhMay: (v: string) => void;
  anhTiepXuc: string;
  setAnhTiepXuc: (v: string) => void;
  anhDaThongSo: string;
  setAnhDaThongSo: (v: string) => void;
  anhSinhHoc: string;
  setAnhSinhHoc: (v: string) => void;
  anhBowieDick: string;
  setAnhBowieDick: (v: string) => void;
  onFinish: (isPass: boolean, overrideThongSoMay?: string) => void;
}) {
  // Phân loại máy tiệt khuẩn
  const machineType = useMemo(() => {
    if (!thietBi) return "STEAM";
    const m = Array.isArray(thietBi) ? thietBi[0] : thietBi;
    const combined = [
      m?.ten_thiet_bi,
      m?.loai_thiet_bi,
      m?.loai_ten_hien_thi,
      m?.loai_may?.[0]?.ma_loai_may,
      m?.loai_may?.[0]?.ten_loai_may,
    ]
      .map(String)
      .join(" ")
      .toLowerCase();
    if (/eo|ethylen|oxit|oxide/.test(combined)) return "EO";
    if (/plasma|h2o2|hydro/.test(combined)) return "PLASMA";
    return "STEAM";
  }, [thietBi]);

  // Thông số máy: chỉ pass/fail + ảnh
  const [thongSoMayResult, setThongSoMayResult] = useState<"DAT" | "KHONG_DAT" | "">("");

  useEffect(() => {
    if (thongSoMay) {
      const match = thongSoMay.match(/^\[(DAT|KHONG_DAT|CHUA_DANH_GIA)\]/);
      if (match) {
        setThongSoMayResult(match[1] === "CHUA_DANH_GIA" ? "" : (match[1] as "DAT" | "KHONG_DAT"));
      }
    } else {
      setThongSoMayResult("");
    }
  }, [thongSoMay]);

  // Auto-fail detection
  const hasAnyFailure = useMemo(() => {
    if (thongSoMayResult === "KHONG_DAT") return true;
    if (chiThiTiepXuc === "KHONG_DAT") return true;
    if (testSinhHoc === "KHONG_DAT") return true;
    if (machineType === "STEAM") {
      if (chiThiDaThongSo === "KHONG_DAT") return true;
      if (testBD === "KHONG_DAT") return true;
    } else {
      // EO / Plasma: testCI là chỉ thị hóa học
      if (testCI === "KHONG_DAT") return true;
    }
    return false;
  }, [thongSoMayResult, chiThiTiepXuc, chiThiDaThongSo, testCI, testSinhHoc, testBD, machineType]);

  if (!showForm) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center shadow-inner">
        <Settings2 className="mb-3 h-10 w-10 text-slate-300 animate-pulse" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Chưa mở form đánh giá</p>
        <p className="mt-2 max-w-sm text-[11px] font-medium leading-relaxed text-slate-400">
          Sau khi chạy xong chu trình, bấm{" "}
          <strong className="text-slate-600">«Kết thúc chu trình tiệt khuẩn»</strong> để mở form đánh giá.
        </p>
      </div>
    );
  }

  const handleFinish = (isPass: boolean) => {
    if (!nguoiUnload.trim()) {
      toast.error("Vui lòng nhập Tên người dỡ mẻ!");
      return;
    }
    if (!nhietDo.trim()) {
      toast.error("Vui lòng ghi nhận Nhiệt độ & Áp suất mẻ!");
      return;
    }

    if (isPass) {
      if (hasAnyFailure) {
        toast.error("Không thể kết luận ĐẠT khi có tiêu chí KHÔNG ĐẠT!");
        return;
      }

      // Thông số máy
      if (thongSoMayResult !== "DAT") {
        toast.error("Yêu cầu: Đánh giá thông số máy phải là ĐẠT!");
        return;
      }
      if (!anhMay.trim()) {
        toast.error("Yêu cầu: Phải có ảnh minh chứng thông số máy!");
        return;
      }

      // Chỉ thị tiếp xúc (bắt buộc cả 3 loại máy)
      if (chiThiTiepXuc !== "DAT") {
        toast.error("Yêu cầu: Chỉ thị tiếp xúc phải là ĐẠT!");
        return;
      }
      if (!anhTiepXuc.trim()) {
        toast.error("Yêu cầu: Phải có ảnh chỉ thị tiếp xúc!");
        return;
      }

      if (machineType === "STEAM") {
        // Chỉ thị đa thông số bắt buộc với Steam
        if (chiThiDaThongSo !== "DAT") {
          toast.error("Yêu cầu: Chỉ thị đa thông số phải là ĐẠT (máy hơi nước)!");
          return;
        }
        if (!anhDaThongSo.trim()) {
          toast.error("Yêu cầu: Phải có ảnh chỉ thị đa thông số!");
          return;
        }
        // Test sinh học tùy chọn — nếu chọn ĐẠT thì cần ảnh
        if (testSinhHoc === "DAT" && !anhSinhHoc.trim()) {
          toast.error("Yêu cầu: Phải có ảnh minh chứng test sinh học!");
          return;
        }
        // Bowie-Dick tùy chọn — nếu chọn ĐẠT thì cần ảnh
        if (testBD === "DAT" && !anhBowieDick.trim()) {
          toast.error("Yêu cầu: Phải có ảnh minh chứng Bowie-Dick!");
          return;
        }
      } else {
        // EO / Plasma: Chỉ thị hóa học (testCI) bắt buộc
        if (testCI !== "DAT") {
          toast.error("Yêu cầu: Chỉ thị hóa học phải là ĐẠT (máy EO/Plasma)!");
          return;
        }
        if (!anhDaThongSo.trim()) {
          toast.error("Yêu cầu: Phải có ảnh chỉ thị hóa học (CI)!");
          return;
        }
        // Test sinh học tùy chọn với EO/Plasma — nếu chọn ĐẠT thì cần ảnh
        if (testSinhHoc === "DAT" && !anhSinhHoc.trim()) {
          toast.error("Yêu cầu: Phải có ảnh minh chứng test sinh học!");
          return;
        }
      }
    }

    const packed = `[${thongSoMayResult || "CHUA_DANH_GIA"}]`;
    onFinish(isPass, packed);
  };

  const machineLabel =
    machineType === "EO" ? "Tiệt khuẩn khí EO" :
    machineType === "PLASMA" ? "Tiệt khuẩn Plasma H₂O₂" :
    "Tiệt khuẩn hơi nước (Steam)";

  const machineBadge =
    machineType === "EO" ? "bg-purple-100 text-purple-700 border-purple-200" :
    machineType === "PLASMA" ? "bg-blue-100 text-blue-700 border-blue-200" :
    "bg-emerald-100 text-emerald-700 border-emerald-200";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* QC Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings2 className="text-[var(--primary)] h-5 w-5" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Đánh giá chất lượng QC</h3>
            <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${machineBadge}`}>
              {machineLabel}
            </span>
          </div>
        </div>
        {hasAnyFailure && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
            <ShieldAlert size={16} className="text-red-600 animate-bounce" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Tự động kết luận KHÔNG ĐẠT</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* === NHÂN SỰ & ĐIỀU KIỆN CƠ BẢN === */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ml-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <User size={12} className="text-[var(--primary)]" />
              Người dỡ mẻ <span className="text-red-500">*</span>
            </label>
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-50 transition-all"
              placeholder="Nhập tên người dỡ..."
              value={nguoiUnload}
              onChange={(e) => setNguoiUnload(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="ml-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Thermometer size={12} className="text-[var(--primary)]" />
              Nhiệt độ & Áp suất <span className="text-red-500">*</span>
            </label>
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-50 transition-all"
              placeholder="Ví dụ: 134°C — 2,1 bar"
              value={nhietDo}
              onChange={(e) => setNhietDo(e.target.value)}
            />
          </div>
        </div>

        {/* === 1. THÔNG SỐ MÁY: chỉ Đạt/Không đạt + ảnh === */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-black text-white">1</span>
              Thông số máy chu trình
            </h4>
            <span className="text-[11px] font-bold text-red-500 uppercase">Bắt buộc</span>
          </div>
          <PassFailToggle value={thongSoMayResult} onChange={setThongSoMayResult} />
          {thongSoMayResult === "DAT" && (
            <PhotoProof label="Thông số máy" value={anhMay} onChange={setAnhMay} required />
          )}
          {thongSoMayResult === "KHONG_DAT" && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-[11px] font-semibold text-red-700">
              ⚠ Thông số máy không đạt → Mẻ sẽ bị kết luận KHÔNG ĐẠT
            </p>
          )}
        </div>

        {/* === 2. CHỈ THỊ & TEST CHẤT LƯỢNG theo loại máy === */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
          <h4 className="flex items-center gap-2 border-b border-slate-200/60 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-black text-white">2</span>
            Chỉ thị & Test chất lượng
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Chỉ thị tiếp xúc — bắt buộc cả 3 loại máy */}
            <ChiThiBlock
              label="Chỉ thị tiếp xúc"
              required
              value={chiThiTiepXuc}
              onChange={setChiThiTiepXuc}
              photoLabel="Chỉ thị tiếp xúc"
              photoValue={anhTiepXuc}
              onPhotoChange={setAnhTiepXuc}
              showPhoto
            />

            {/* Máy hơi nước (Steam): Chỉ thị đa thông số — bắt buộc */}
            {machineType === "STEAM" && (
              <ChiThiBlock
                label="Chỉ thị đa thông số"
                required
                value={chiThiDaThongSo}
                onChange={setChiThiDaThongSo}
                photoLabel="Chỉ thị đa thông số"
                photoValue={anhDaThongSo}
                onPhotoChange={setAnhDaThongSo}
                showPhoto
              />
            )}

            {/* Máy EO / Plasma: Chỉ thị hóa học — bắt buộc */}
            {(machineType === "EO" || machineType === "PLASMA") && (
              <ChiThiBlock
                label="Chỉ thị hóa học (CI)"
                required
                value={testCI}
                onChange={setTestCI}
                photoLabel="Chỉ thị hóa học (CI)"
                photoValue={anhDaThongSo}
                onPhotoChange={setAnhDaThongSo}
                showPhoto
              />
            )}

            {/* Test sinh học — tùy chọn cả 3 loại máy */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-slate-700">Test sinh học (BIM)</span>
                <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400">
                  Tuỳ chọn
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTestSinhHoc(testSinhHoc === "DAT" ? "NA" : "DAT")}
                  className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 font-black text-xs uppercase tracking-wide transition-all ${
                    testSinhHoc === "DAT"
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  <Check size={14} />ĐẠT
                </button>
                <button
                  type="button"
                  onClick={() => setTestSinhHoc(testSinhHoc === "KHONG_DAT" ? "NA" : "KHONG_DAT")}
                  className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 font-black text-xs uppercase tracking-wide transition-all ${
                    testSinhHoc === "KHONG_DAT"
                      ? "border-red-500 bg-red-500 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  <XCircle size={14} />KĐ
                </button>
                <button
                  type="button"
                  onClick={() => setTestSinhHoc("NA")}
                  className={`px-3 flex items-center justify-center h-11 rounded-xl border-2 font-black text-[11px] uppercase tracking-wide transition-all ${
                    testSinhHoc === "NA" || testSinhHoc === ""
                      ? "border-slate-300 bg-slate-100 text-slate-500"
                      : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  Bỏ qua
                </button>
              </div>
              {testSinhHoc === "DAT" && (
                <PhotoProof label="Test sinh học" value={anhSinhHoc} onChange={setAnhSinhHoc} required />
              )}
            </div>

            {/* Bowie-Dick — Steam-only, tùy chọn */}
            {machineType === "STEAM" && showBowieDick && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">Bowie–Dick (Steam)</span>
                  <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400">
                    Tuỳ chọn
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTestBD(testBD === "DAT" ? "NA" : "DAT")}
                    className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 font-black text-xs uppercase tracking-wide transition-all ${
                      testBD === "DAT"
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <Check size={14} />ĐẠT
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestBD(testBD === "KHONG_DAT" ? "NA" : "KHONG_DAT")}
                    className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 font-black text-xs uppercase tracking-wide transition-all ${
                      testBD === "KHONG_DAT"
                        ? "border-red-500 bg-red-500 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50"
                    }`}
                  >
                    <XCircle size={14} />KĐ
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestBD("NA")}
                    className={`px-3 flex items-center justify-center h-11 rounded-xl border-2 font-black text-[11px] uppercase tracking-wide transition-all ${
                      testBD === "NA"
                        ? "border-slate-300 bg-slate-100 text-slate-500"
                        : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    Bỏ qua
                  </button>
                </div>
                {testBD === "DAT" && (
                  <PhotoProof label="Bowie–Dick" value={anhBowieDick} onChange={setAnhBowieDick} required />
                )}
              </div>
            )}
          </div>
        </div>

        {/* === AUTO-FAIL NOTICE === */}
        {hasAnyFailure && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 space-y-2">
            <div className="flex items-center gap-2 font-black uppercase tracking-wide text-red-700">
              <ShieldAlert className="h-5 w-5 animate-bounce" />
              Tự động khóa kết quả: KHÔNG ĐẠT
            </div>
            <p className="text-xs font-medium leading-relaxed text-red-600">
              Hệ thống phát hiện có tiêu chí đánh giá là <strong>KHÔNG ĐẠT</strong>. Theo chính sách vô khuẩn BV103, mẻ này bắt buộc phải kết luận{" "}
              <strong>KHÔNG ĐẠT</strong>.
            </p>
          </div>
        )}

        {/* === KẾT LUẬN === */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={hasAnyFailure}
            onClick={() => handleFinish(true)}
            className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.99] ${
              hasAnyFailure
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200"
                : "bg-[var(--primary)] text-[#FFD700] shadow-lg shadow-emerald-200 hover:bg-[var(--primary-hover)] hover:shadow-xl"
            }`}
          >
            <CheckCircle size={20} /> Kết luận ĐẠT → Cấp phát
          </button>
          <button
            type="button"
            onClick={() => handleFinish(false)}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 text-sm font-black uppercase tracking-widest text-red-700 transition-all hover:bg-red-100 hover:shadow-md active:scale-[0.99]"
          >
            <AlertCircle size={20} /> Kết luận KHÔNG ĐẠT
          </button>
        </div>
      </div>
    </div>
  );
}
