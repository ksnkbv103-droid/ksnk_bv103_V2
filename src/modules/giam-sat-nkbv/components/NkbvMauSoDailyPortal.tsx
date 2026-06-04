"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Activity, Calendar, ShieldCheck, Heart, Users, Clock, Plus, Zap } from "lucide-react";
import { saveNkbvMauSoDaily, saveNkbvMauSoPhauThuat } from "../actions/giam-sat-nkbv-mau-so.actions";

type NkbvMauSoDailyPortalProps = {
  khoas: Array<{ id: string; ten_danh_muc: string }>;
  selectedKhoaId: string;
  onKhoaChange: (id: string) => void;
};

const NHSN_SURGERIES = [
  { code: "COLO", name: "Phẫu thuật Đại tràng (COLO)" },
  { code: "KPRO", name: "Thay khớp gối (KPRO)" },
  { code: "HPRO", name: "Thay khớp háng (HPRO)" },
  { code: "CARD", name: "Phẫu thuật Tim mạch (CARD)" },
  { code: "CBGB", name: "Phẫu thuật Bắc cầu chủ vành (CBGB)" },
  { code: "HYST", name: "Phẫu thuật Cắt tử cung (HYST)" },
  { code: "CRAN", name: "Phẫu thuật Mở sọ (CRAN)" },
  { code: "CHOL", name: "Phẫu thuật Túi mật (CHOL)" }
];

export default function NkbvMauSoDailyPortal({
  khoas,
  selectedKhoaId,
  onKhoaChange
}: NkbvMauSoDailyPortalProps) {
  const [subTab, setSubTab] = useState<"daily" | "surgery">("daily");
  
  // Daily Form State
  const [ngayGhiNhan, setNgayGhiNhan] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [foleyDays, setFoleyDays] = useState<number>(0);
  const [cvcDays, setCvcDays] = useState<number>(0);
  const [ventDays, setVentDays] = useState<number>(0);
  const [patientDays, setPatientDays] = useState<number>(0);
  const [emvEpisodes, setEmvEpisodes] = useState<number>(0);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Surgery Form State
  const [ngayPhauThuat, setNgayPhauThuat] = useState(() => format(new Date(), "yyyy-MM-dd"));
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
      toast.error("Số ngày điều trị (Patient Days) phải lớn hơn 0!");
      return;
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
        so_dot_tho_may_emv: emvEpisodes
      });

      if (res.success) {
        toast.success("Đã ghi nhận mẫu số ngày-thiết bị thành công!");
        // Reset device fields but keep department/date
        setFoleyDays(0);
        setCvcDays(0);
        setVentDays(0);
        setEmvEpisodes(0);
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu số liệu");
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
        is_laparoscopic: isLaparoscopic
      });

      if (res.success) {
        toast.success(`Đã lưu thông số phẫu thuật cho BN ${hoTenBenhNhan} (Expected SSI Prob: ${(res.data.expected_ssi_prob * 100).toFixed(2)}%)!`);
        // Reset patient details
        setMaBenhNhan("");
        setHoTenBenhNhan("");
        setTenPhauThuat("");
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu số liệu");
    } finally {
      setSurgeryLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Sub-tabs toggler */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSubTab("daily")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              subTab === "daily"
                ? "bg-white text-[#026f17] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Activity className="h-4 w-4" /> Mẫu số Ngày - Thiết bị
          </button>
          <button
            type="button"
            onClick={() => setSubTab("surgery")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              subTab === "surgery"
                ? "bg-white text-[#026f17] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Zap className="h-4 w-4" /> Báo cáo Mổ (SSI Denominator)
          </button>
        </div>
      </div>

      {subTab === "daily" ? (
        <form onSubmit={handleDailySubmit} className="premium-card rounded-2xl border border-slate-100 bg-white p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#026f17]" /> 
              Báo cáo Mẫu số Ngày - Thiết bị Hàng ngày
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dành cho Điều dưỡng Mạng lưới KSNK ghi nhận số lượng ngày nằm viện và ngày lưu thiết bị xâm lấn chuẩn JCI/CDC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Khoa ghi nhận</label>
              <select
                value={selectedKhoaId}
                onChange={(e) => onKhoaChange(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                required
              >
                <option value="">Chọn khoa phòng...</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_danh_muc}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Ngày báo cáo</label>
              <div className="relative">
                <input
                  type="date"
                  value={ngayGhiNhan}
                  onChange={(e) => setNgayGhiNhan(e.target.value)}
                  className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                  required
                />
                <Calendar className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
            {/* Patient Days */}
            <div className="premium-card border border-slate-100 bg-slate-50/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Ngày điều trị</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <input
                type="number"
                min="0"
                value={patientDays || ""}
                onChange={(e) => setPatientDays(parseInt(e.target.value) || 0)}
                placeholder="Nhập Patient Days"
                className="w-full border-0 bg-transparent text-xl font-extrabold focus:ring-0 p-0 text-slate-800"
                required
              />
              <p className="text-[10px] text-slate-400">Tổng ngày nằm viện tích lũy của toàn khoa trong ngày.</p>
            </div>

            {/* CVC Days */}
            <div className="premium-card border border-slate-100 bg-slate-50/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Ngày Catheter CVC</span>
                <Heart className="h-4 w-4 text-red-500" />
              </div>
              <input
                type="number"
                min="0"
                value={cvcDays || ""}
                onChange={(e) => setCvcDays(parseInt(e.target.value) || 0)}
                placeholder="Nhập CVC-Days"
                className="w-full border-0 bg-transparent text-xl font-extrabold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Số bệnh nhân đặt catheter TMTT trong ngày.</p>
            </div>

            {/* Foley Days */}
            <div className="premium-card border border-slate-100 bg-slate-50/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Ngày Sonde tiểu</span>
                <Activity className="h-4 w-4 text-amber-500" />
              </div>
              <input
                type="number"
                min="0"
                value={foleyDays || ""}
                onChange={(e) => setFoleyDays(parseInt(e.target.value) || 0)}
                placeholder="Nhập Foley-Days"
                className="w-full border-0 bg-transparent text-xl font-extrabold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Số bệnh nhân đặt ống thông tiểu Foley trong ngày.</p>
            </div>

            {/* Vent Days */}
            <div className="premium-card border border-slate-100 bg-slate-50/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Ngày Thở máy</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <input
                type="number"
                min="0"
                value={ventDays || ""}
                onChange={(e) => setVentDays(parseInt(e.target.value) || 0)}
                placeholder="Nhập Vent-Days"
                className="w-full border-0 bg-transparent text-xl font-extrabold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Số bệnh nhân thở máy xâm lấn trong ngày.</p>
            </div>

            {/* EMV Episodes */}
            <div className="premium-card border border-slate-100 bg-slate-50/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Số đợt thở máy (EMV)</span>
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <input
                type="number"
                min="0"
                value={emvEpisodes || ""}
                onChange={(e) => setEmvEpisodes(parseInt(e.target.value) || 0)}
                placeholder="Nhập EMV Episodes"
                className="w-full border-0 bg-transparent text-xl font-extrabold focus:ring-0 p-0 text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Số đợt bắt đầu thở máy mới trong ngày.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={dailyLoading}
              className="rounded-full bg-[#026f17] px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#026f17]/20 hover:bg-[#026615] transition-all disabled:opacity-50"
            >
              {dailyLoading ? "Đang lưu..." : "Ghi nhận Mẫu số"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSurgerySubmit} className="premium-card rounded-2xl border border-slate-100 bg-white p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#026f17]" /> 
              Khai báo ca Phẫu thuật (Mẫu số cho Nhiễm khuẩn vết mổ SSI)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Khai báo thông số từng ca phẫu thuật của khoa để hệ thống tự động tính hệ số Expected SSI Prob điều chỉnh rủi ro CDC/NHSN 2023.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Khoa thực hiện mổ</label>
              <select
                value={selectedKhoaId}
                onChange={(e) => onKhoaChange(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                required
              >
                <option value="">Chọn khoa phòng...</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_danh_muc}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Ngày phẫu thuật</label>
              <input
                type="date"
                value={ngayPhauThuat}
                onChange={(e) => setNgayPhauThuat(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Loại phẫu thuật NHSN</label>
              <select
                value={loaiPhauThuatNhsn}
                onChange={(e) => setLoaiPhauThuatNhsn(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                required
              >
                {NHSN_SURGERIES.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Mã bệnh nhân (PID)</label>
              <input
                type="text"
                placeholder="Nhập mã bệnh nhân..."
                value={maBenhNhan}
                onChange={(e) => setMaBenhNhan(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Họ và tên bệnh nhân</label>
              <input
                type="text"
                placeholder="Nhập tên bệnh nhân..."
                value={hoTenBenhNhan}
                onChange={(e) => setHoTenBenhNhan(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Tên cuộc mổ cụ thể</label>
              <input
                type="text"
                placeholder="Ví dụ: Cắt đại tràng Sigma nội soi..."
                value={tenPhauThuat}
                onChange={(e) => setTenPhauThuat(e.target.value)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Phân loại vết mổ</label>
              <select
                value={phanLoaiVetMo}
                onChange={(e) => setPhanLoaiVetMo(e.target.value as any)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
              >
                <option value="SACH">Sạch (Class I)</option>
                <option value="SACH_NHIEM">Sạch - Nhiễm (Class II)</option>
                <option value="NHIEM">Nhiễm (Class III)</option>
                <option value="BAN">Bẩn (Class IV)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Chỉ số thể trạng ASA</label>
              <select
                value={asaScore}
                onChange={(e) => setAsaScore(parseInt(e.target.value))}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
              >
                <option value={1}>ASA 1 - Khỏe mạnh</option>
                <option value={2}>ASA 2 - Bệnh nhẹ</option>
                <option value={3}>ASA 3 - Bệnh nặng</option>
                <option value={4}>ASA 4 - Bệnh đe dọa tính mạng</option>
                <option value={5}>ASA 5 - Hấp hối</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Thời gian mổ (phút)</label>
              <input
                type="number"
                min="1"
                value={thoiGianMoPhut}
                onChange={(e) => setThoiGianMoPhut(parseInt(e.target.value) || 0)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Ngưỡng mổ NHSN (phút)</label>
              <input
                type="number"
                min="1"
                value={thoiGianNguongNhsn}
                onChange={(e) => setThoiGianNguongNhsn(parseInt(e.target.value) || 120)}
                className="w-full rounded-2xl border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-[#026f17]"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={coDatImplant}
                onChange={(e) => setCoDatImplant(e.target.checked)}
                className="rounded text-[#026f17] focus:ring-[#026f17] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                Có đặt Thiết bị nhân tạo (Implant)
                <span className="text-[10px] text-slate-400 lowercase">(nâng thời gian theo dõi lên 90 ngày)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLaparoscopic}
                onChange={(e) => setIsLaparoscopic(e.target.checked)}
                className="rounded text-[#026f17] focus:ring-[#026f17] h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                Phẫu thuật nội soi (Laparoscopic)
                <span className="text-[10px] text-[#026f17] lowercase">(giảm nhẹ hệ số rủi ro SSI)</span>
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={surgeryLoading}
              className="rounded-full bg-[#026f17] px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#026f17]/20 hover:bg-[#026615] transition-all disabled:opacity-50"
            >
              {surgeryLoading ? "Đang lưu..." : "Ghi nhận ca phẫu thuật"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
