"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileWarning,
  Info,
  Save,
  Trash2,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  LOAI_MUC_CONFIGS,
  LOAI_SU_CO_LABELS,
  type LoaiMucSoCan,
  type PhanHeHauCan,
  type LoaiSuCoHauCan,
  type SoCanRow,
} from "../types";
import {
  getSoCanNgay,
  saveSoCanNgay,
  saveSuCo,
  listKhoaPhongDropdown,
  type SoCanDayInput,
} from "../actions/chat-thai-do-vai.actions";

interface FormState {
  khoi_luong_kg: string;
  so_tui: string;
  ghi_chu: string;
}

const DEFAULT_ENTRY: FormState = {
  khoi_luong_kg: "",
  so_tui: "",
  ghi_chu: "",
};

export function TabNhapSoCan() {
  const [selectedDate, setSelectedDate] = useState<string>(todayYmdInVn());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dữ liệu 6 ô nhập
  const [entries, setEntries] = useState<Record<LoaiMucSoCan, FormState>>({
    CT_LAY_NHIEM_SAC_NHON: { ...DEFAULT_ENTRY },
    CT_LAY_NHIEM_CON_LAI: { ...DEFAULT_ENTRY },
    CT_THONG_THUONG: { ...DEFAULT_ENTRY },
    DO_VAI_BAN_THUONG: { ...DEFAULT_ENTRY },
    DO_VAI_BAN_LAY_NHIEM: { ...DEFAULT_ENTRY },
    DO_VAI_SACH_VE: { ...DEFAULT_ENTRY },
  });

  // Sự cố nhanh
  const [showSuCoForm, setShowSuCoForm] = useState(false);
  const [suCoPhanHe, setSuCoPhanHe] = useState<PhanHeHauCan>("CHAT_THAI");
  const [suCoLoai, setSuCoLoai] = useState<LoaiSuCoHauCan>("PHAN_LOAI_SAI");
  const [suCoKhoaId, setSuCoKhoaId] = useState("");
  const [suCoMoTa, setSuCoMoTa] = useState("");
  const [khoaList, setKhoaList] = useState<{ id: string; ma_khoa: string; ten_khoa: string }[]>([]);
  const [savingSuCo, setSavingSuCo] = useState(false);

  // Tải danh mục khoa
  useEffect(() => {
    listKhoaPhongDropdown()
      .then((res) => setKhoaList(res))
      .catch(() => toast.error("Không thể tải danh mục khoa. Bạn có thể thiếu quyền xem."));
  }, []);

  // Tải số liệu ngày khi đổi ngày
  const loadDayData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await getSoCanNgay(date);
      setEntries({
        CT_LAY_NHIEM_SAC_NHON: {
          khoi_luong_kg: data.CT_LAY_NHIEM_SAC_NHON?.khoi_luong_kg != null ? String(data.CT_LAY_NHIEM_SAC_NHON.khoi_luong_kg) : "",
          so_tui: data.CT_LAY_NHIEM_SAC_NHON?.so_tui != null ? String(data.CT_LAY_NHIEM_SAC_NHON.so_tui) : "",
          ghi_chu: data.CT_LAY_NHIEM_SAC_NHON?.ghi_chu ?? "",
        },
        CT_LAY_NHIEM_CON_LAI: {
          khoi_luong_kg: data.CT_LAY_NHIEM_CON_LAI?.khoi_luong_kg != null ? String(data.CT_LAY_NHIEM_CON_LAI.khoi_luong_kg) : "",
          so_tui: data.CT_LAY_NHIEM_CON_LAI?.so_tui != null ? String(data.CT_LAY_NHIEM_CON_LAI.so_tui) : "",
          ghi_chu: data.CT_LAY_NHIEM_CON_LAI?.ghi_chu ?? "",
        },
        CT_THONG_THUONG: {
          khoi_luong_kg: data.CT_THONG_THUONG?.khoi_luong_kg != null ? String(data.CT_THONG_THUONG.khoi_luong_kg) : "",
          so_tui: data.CT_THONG_THUONG?.so_tui != null ? String(data.CT_THONG_THUONG.so_tui) : "",
          ghi_chu: data.CT_THONG_THUONG?.ghi_chu ?? "",
        },
        DO_VAI_BAN_THUONG: {
          khoi_luong_kg: data.DO_VAI_BAN_THUONG?.khoi_luong_kg != null ? String(data.DO_VAI_BAN_THUONG.khoi_luong_kg) : "",
          so_tui: data.DO_VAI_BAN_THUONG?.so_tui != null ? String(data.DO_VAI_BAN_THUONG.so_tui) : "",
          ghi_chu: data.DO_VAI_BAN_THUONG?.ghi_chu ?? "",
        },
        DO_VAI_BAN_LAY_NHIEM: {
          khoi_luong_kg: data.DO_VAI_BAN_LAY_NHIEM?.khoi_luong_kg != null ? String(data.DO_VAI_BAN_LAY_NHIEM.khoi_luong_kg) : "",
          so_tui: data.DO_VAI_BAN_LAY_NHIEM?.so_tui != null ? String(data.DO_VAI_BAN_LAY_NHIEM.so_tui) : "",
          ghi_chu: data.DO_VAI_BAN_LAY_NHIEM?.ghi_chu ?? "",
        },
        DO_VAI_SACH_VE: {
          khoi_luong_kg: data.DO_VAI_SACH_VE?.khoi_luong_kg != null ? String(data.DO_VAI_SACH_VE.khoi_luong_kg) : "",
          so_tui: data.DO_VAI_SACH_VE?.so_tui != null ? String(data.DO_VAI_SACH_VE.so_tui) : "",
          ghi_chu: data.DO_VAI_SACH_VE?.ghi_chu ?? "",
        },
      });
    } catch {
      toast.error("Không thể tải số liệu ngày.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, loadDayData]);

  // Cập nhật ô nhập
  const handleChange = (key: LoaiMucSoCan, field: keyof FormState, val: string) => {
    setEntries((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  // Tính nháp tức thời cho ngày hiện tại
  const calculations = useMemo(() => {
    const sacNhon = Number(entries.CT_LAY_NHIEM_SAC_NHON.khoi_luong_kg) || 0;
    const conLai = Number(entries.CT_LAY_NHIEM_CON_LAI.khoi_luong_kg) || 0;
    const thongThuong = Number(entries.CT_THONG_THUONG.khoi_luong_kg) || 0;
    const tongCtln = Math.round((sacNhon + conLai) * 100) / 100;
    const tongCt = Math.round((tongCtln + thongThuong) * 100) / 100;
    const tyLeCtln = tongCt > 0 ? Math.round((tongCtln / tongCt) * 1000) / 10 : 0;

    const banThuong = Number(entries.DO_VAI_BAN_THUONG.khoi_luong_kg) || 0;
    const banLn = Number(entries.DO_VAI_BAN_LAY_NHIEM.khoi_luong_kg) || 0;
    const sachVe = Number(entries.DO_VAI_SACH_VE.khoi_luong_kg) || 0;
    const tongBan = Math.round((banThuong + banLn) * 100) / 100;
    const chenhLech = Math.round((tongBan - sachVe) * 100) / 100;
    const tyLeChenh = tongBan > 0 ? Math.round((chenhLech / tongBan) * 1000) / 10 : 0;

    return {
      sacNhon,
      conLai,
      tongCtln,
      tongCt,
      tyLeCtln,
      tongBan,
      sachVe,
      chenhLech,
      tyLeChenh,
    };
  }, [entries]);

  // Lưu sổ cân ngày
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Record<LoaiMucSoCan, SoCanDayInput>> = {};
      (Object.keys(entries) as LoaiMucSoCan[]).forEach((k) => {
        const item = entries[k];
        payload[k] = {
          khoi_luong_kg: Number(item.khoi_luong_kg) || 0,
          so_tui: item.so_tui ? Number(item.so_tui) : null,
          ghi_chu: item.ghi_chu || null,
        };
      });

      const res = await saveSoCanNgay(selectedDate, payload);
      if (res.success) {
        toast.success(res.message || "Đã lưu sổ cân thành công.");
      } else {
        toast.error(res.error || "Lỗi khi lưu số liệu.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi hệ thống.");
    } finally {
      setSaving(false);
    }
  };

  // Lưu sự cố
  const handleSaveSuCo = async () => {
    setSavingSuCo(true);
    try {
      const res = await saveSuCo({
        ngay_ghi_nhan: selectedDate,
        phan_he: suCoPhanHe,
        loai_su_co: suCoLoai,
        khoa_lien_quan_id: suCoKhoaId || null,
        mo_ta: suCoMoTa || null,
      });

      if (res.success) {
        toast.success("Đã ghi nhận sự cố an toàn sinh học.");
        setSuCoMoTa("");
        setSuCoKhoaId("");
        setShowSuCoForm(false);
      } else {
        toast.error(res.error || "Không thể lưu sự cố.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu sự cố.");
    } finally {
      setSavingSuCo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Thanh chọn ngày & Hướng dẫn nhập nhanh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <label htmlFor="so-can-date" className="text-sm font-semibold text-slate-800">
            Ngày cân toàn viện:
          </label>
          <input
            id="so-can-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          />
          {selectedDate === todayYmdInVn() && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              Hôm nay
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu sổ cân ngày
          </button>
        </div>
      </div>

      {/* Tóm tắt nhanh số liệu ngày */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Tổng CTYT (kg)</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{calculations.tongCt.toLocaleString()} kg</div>
          <div className="text-xs text-slate-500 mt-0.5">Sắc nhọn: {calculations.sacNhon} kg</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Tỷ lệ CTYT lây nhiễm</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-lg font-bold ${calculations.tyLeCtln > 20 ? "text-rose-600" : "text-emerald-600"}`}>
              {calculations.tyLeCtln}%
            </span>
            <span className="text-xs text-slate-400">({calculations.tongCtln} kg)</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Ngưỡng chuẩn &le; 20%</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Tổng đồ vải bẩn (kg)</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{calculations.tongBan.toLocaleString()} kg</div>
          <div className="text-xs text-slate-500 mt-0.5">Sạch về: {calculations.sachVe.toLocaleString()} kg</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Chênh lệch bẩn - sạch</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-lg font-bold ${Math.abs(calculations.tyLeChenh) > 10 ? "text-amber-600" : "text-slate-900"}`}>
              {calculations.chenhLech} kg
            </span>
            <span className="text-xs text-slate-500">({calculations.tyLeChenh}%)</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Chuẩn &le; 5-10%</div>
        </div>
      </div>

      {/* Lưới 6 ô cân (3 Chất thải + 3 Đồ vải) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nhóm 1: Chất thải y tế */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              1. Khối lượng Chất thải y tế (Nhà rác)
            </h3>
            <span className="text-xs text-slate-500">3 nhóm theo QĐ PO</span>
          </div>

          {(["CT_LAY_NHIEM_SAC_NHON", "CT_LAY_NHIEM_CON_LAI", "CT_THONG_THUONG"] as LoaiMucSoCan[]).map((key) => {
            const cfg = LOAI_MUC_CONFIGS[key];
            const val = entries[key];
            return (
              <div
                key={key}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                      {cfg.shortLabel}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{cfg.label}</h4>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">{cfg.moTa}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Khối lượng (kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={val.khoi_luong_kg}
                      onChange={(e) => handleChange(key, "khoi_luong_kg", e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Số túi / hộp
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={val.so_tui}
                      onChange={(e) => handleChange(key, "so_tui", e.target.value)}
                      placeholder="Số lượng"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={val.ghi_chu}
                      onChange={(e) => handleChange(key, "ghi_chu", e.target.value)}
                      placeholder="Chi tiết (nếu có)"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nhóm 2: Đồ vải y tế */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              2. Khối lượng Đồ vải y tế (ĐV Giặt là)
            </h3>
            <span className="text-xs text-slate-500">Giao nhận & cân hàng ngày</span>
          </div>

          {(["DO_VAI_BAN_THUONG", "DO_VAI_BAN_LAY_NHIEM", "DO_VAI_SACH_VE"] as LoaiMucSoCan[]).map((key) => {
            const cfg = LOAI_MUC_CONFIGS[key];
            const val = entries[key];
            return (
              <div
                key={key}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                      {cfg.shortLabel}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{cfg.label}</h4>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">{cfg.moTa}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Khối lượng (kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={val.khoi_luong_kg}
                      onChange={(e) => handleChange(key, "khoi_luong_kg", e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={val.ghi_chu}
                      onChange={(e) => handleChange(key, "ghi_chu", e.target.value)}
                      placeholder="Đợt giao, tình trạng bọc..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khối Ghi nhanh sự cố phát hiện trong ngày (gắn khoa phát sinh) */}
      <div className="p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Sự cố an toàn sinh học phát hiện ngày {selectedDate}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowSuCoForm(!showSuCoForm)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
            {showSuCoForm ? "Đóng form" : "+ Báo sự cố phát hiện"}
          </button>
        </div>

        {showSuCoForm && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 bg-slate-50 p-4 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phân hệ</label>
                <select
                  value={suCoPhanHe}
                  onChange={(e) => setSuCoPhanHe(e.target.value as PhanHeHauCan)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CHAT_THAI">Chất thải y tế</option>
                  <option value="DO_VAI">Đồ vải y tế</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Loại sự cố</label>
                <select
                  value={suCoLoai}
                  onChange={(e) => setSuCoLoai(e.target.value as LoaiSuCoHauCan)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(Object.keys(LOAI_SU_CO_LABELS) as LoaiSuCoHauCan[]).map((k) => (
                    <option key={k} value={k}>
                      {LOAI_SU_CO_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Khoa liên quan (từ nhãn túi/thùng)
                </label>
                <select
                  value={suCoKhoaId}
                  onChange={(e) => setSuCoKhoaId(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chưa rõ / Chung toàn viện --</option>
                  {khoaList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ten_khoa} ({k.ma_khoa})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mô tả chi tiết sự cố
              </label>
              <input
                type="text"
                value={suCoMoTa}
                onChange={(e) => setSuCoMoTa(e.target.value)}
                placeholder="Ví dụ: Phát hiện 01 kim tiêm 5ml còn nắp lẫn trong bao đồ vải mổ..."
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSuCoForm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSuCo}
                disabled={savingSuCo}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition flex items-center gap-1.5"
              >
                {savingSuCo && <Clock className="w-3.5 h-3.5 animate-spin" />}
                Lưu sự cố sinh học
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
