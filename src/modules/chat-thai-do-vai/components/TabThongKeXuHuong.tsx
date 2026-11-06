"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  CheckCircle2,
  Clock,
  FileBarChart,
  Filter,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  type ThongKeKyHauCan,
  type NgayGiuongRow,
} from "../types";
import {
  getThongKeKyAction,
  getNgayGiuongList,
  saveNgayGiuong,
} from "../actions/chat-thai-do-vai.actions";
import { type CanhBaoGoiY } from "../lib/chat-thai-do-vai-core";

export function TabThongKeXuHuong() {
  const today = todayYmdInVn();
  // Đầu tháng hiện tại đến hôm nay
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

  const [tuNgay, setTuNgay] = useState<string>(startOfMonth);
  const [denNgay, setDenNgay] = useState<string>(today);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<ThongKeKyHauCan | null>(null);
  const [insights, setInsights] = useState<CanhBaoGoiY[]>([]);

  // Mẫu số ngày giường
  const [ngayGiuongList, setNgayGiuongList] = useState<NgayGiuongRow[]>([]);
  const [showNgayGiuongModal, setShowNgayGiuongModal] = useState(false);
  const [modalNam, setModalNam] = useState<number>(currentYear);
  const [modalThang, setModalThang] = useState<number>(currentMonth);
  const [modalSoGiuong, setModalSoGiuong] = useState<string>("");
  const [modalGhiChu, setModalGhiChu] = useState<string>("");
  const [savingGiuong, setSavingGiuong] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resStats, resNgayGiuong] = await Promise.all([
        getThongKeKyAction(tuNgay, denNgay),
        getNgayGiuongList(currentYear),
      ]);
      setStats(resStats.stats);
      setInsights(resStats.insights);
      setNgayGiuongList(resNgayGiuong);
    } catch {
      toast.error("Không thể tải thống kê kỳ.");
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveNgayGiuong = async () => {
    if (!modalSoGiuong || Number(modalSoGiuong) <= 0) {
      toast.error("Vui lòng nhập số ngày-giường hợp lệ (> 0).");
      return;
    }
    setSavingGiuong(true);
    try {
      const res = await saveNgayGiuong(
        modalNam,
        modalThang,
        Number(modalSoGiuong),
        modalGhiChu
      );
      if (res.success) {
        toast.success(`Đã lưu mẫu số tháng ${modalThang}/${modalNam}`);
        setShowNgayGiuongModal(false);
        setModalSoGiuong("");
        setModalGhiChu("");
        loadData();
      } else {
        toast.error(res.error || "Không thể lưu ngày-giường.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi hệ thống.");
    } finally {
      setSavingGiuong(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bộ lọc khoảng thời gian & nút cập nhật mẫu số */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Kỳ thống kê:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400">đến</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Xem số liệu
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNgayGiuongModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition shadow-xs"
          >
            <Bed className="w-3.5 h-3.5" />
            Mẫu số ngày-giường (KHTH)
          </button>
        </div>
      </div>

      {/* Độ tin cậy dữ liệu & Tỷ lệ ngày nhập */}
      {stats && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 rounded-xl text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>
              Kỳ báo cáo <strong>{stats.so_ngay_ky} ngày</strong> &bull; Đã ghi nhận số liệu:{" "}
              <strong>{stats.so_ngay_co_du_lieu} ngày</strong> ({stats.ty_le_day_du_pct}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              Mẫu số ngày-giường tích lũy: <strong>{stats.tong_ngay_giuong.toLocaleString()}</strong> ngày-giường
            </span>
          </div>
        </div>
      )}

      {/* Banners Cảnh báo & Gợi ý hành động KSNK */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((item, idx) => {
            const isDanger = item.muc === "NGUY_CO_CAO";
            const isWarning = item.muc === "CANH_BAO";
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isDanger
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : isWarning
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-sky-50 border-sky-200 text-sky-900"
                }`}
              >
                {isDanger ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-0.5">
                    {isDanger ? "Cảnh báo khẩn an toàn sinh học" : isWarning ? "Khuyến nghị KSNK" : "Thông tin vận hành"}
                  </div>
                  <div className="text-xs font-medium leading-relaxed">{item.noiDung}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 9 THẺ KPI CỐT LÕI */}
      {stats && (
        <div className="space-y-6">
          {/* Nhóm A: Chất thải y tế */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                A. Chỉ số Chất thải y tế (Quy trình 11)
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* KPI 1 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">1. Tổng khối lượng CTYT</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {stats.chat_thai.tong_chat_thai_kg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Tất cả các nhóm chất thải</div>
              </div>

              {/* KPI 2 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">2. Tỷ lệ chất thải lây nhiễm</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-xl font-bold ${
                      stats.chat_thai.ty_le_ctln_pct > 20 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {stats.chat_thai.ty_le_ctln_pct}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {stats.chat_thai.tong_ctln_kg} kg &bull; Chuẩn &le; 20%
                </div>
              </div>

              {/* KPI 3 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">3. CTLN sắc nhọn</div>
                <div className="text-xl font-bold text-amber-800 mt-1">
                  {stats.chat_thai.kg_sac_nhon.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Hộp kháng thủng màu vàng</div>
              </div>

              {/* KPI 4 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">4. Suất phát sinh CTYT</div>
                <div className="text-xl font-bold text-indigo-700 mt-1">
                  {stats.chat_thai.chat_thai_per_1000_ngay_giuong.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">trên 1.000 ngày-giường</div>
              </div>

              {/* KPI 5 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">5. Sự cố chất thải</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {stats.chat_thai.so_su_co} <span className="text-xs font-normal text-slate-500">vụ</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Rách túi, sai loại, mở nắp</div>
              </div>
            </div>
          </div>

          {/* Nhóm B: Đồ vải y tế */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                B. Chỉ số Đồ vải y tế (Quy trình 12)
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* KPI 6 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">6. Tổng đồ vải bẩn</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {stats.do_vai.tong_ban_kg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Giao sang ĐVGL</div>
              </div>

              {/* KPI 7 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">7. Tỷ lệ đồ bẩn lây nhiễm</div>
                <div className="text-xl font-bold text-rose-700 mt-1">
                  {stats.do_vai.ty_le_ban_ln_pct}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {stats.do_vai.kg_ban_lay_nhiem} kg (túi vàng/tự tan)
                </div>
              </div>

              {/* KPI 8 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">8. Chênh lệch bẩn - sạch</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-xl font-bold ${
                      Math.abs(stats.do_vai.ty_le_chenh_lech_pct) > 10
                        ? "text-amber-600"
                        : "text-slate-900"
                    }`}
                  >
                    {stats.do_vai.chenh_lech_kg > 0 ? `+${stats.do_vai.chenh_lech_kg}` : stats.do_vai.chenh_lech_kg}
                  </span>
                  <span className="text-xs text-slate-500">kg ({stats.do_vai.ty_le_chenh_lech_pct}%)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Sạch về: {stats.do_vai.kg_sach_ve} kg</div>
              </div>

              {/* KPI 9 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">9. Suất phát sinh đồ vải</div>
                <div className="text-xl font-bold text-teal-700 mt-1">
                  {stats.do_vai.do_vai_per_1000_ngay_giuong.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">trên 1.000 ngày-giường</div>
              </div>

              {/* KPI 10: Sự cố sắc nhọn đồ vải */}
              <div
                className={`p-4 rounded-xl border shadow-xs ${
                  stats.do_vai.so_su_co_sac_nhon > 0
                    ? "bg-rose-50 border-rose-300 text-rose-900"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="text-xs font-medium">10. Lẫn sắc nhọn trong đồ vải</div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    stats.do_vai.so_su_co_sac_nhon > 0 ? "text-rose-700 animate-pulse" : "text-emerald-700"
                  }`}
                >
                  {stats.do_vai.so_su_co_sac_nhon} <span className="text-xs font-normal">vụ</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Mục tiêu: 0 vụ (an toàn nghề nghiệp)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cập nhật Ngày-giường thực kê theo tháng */}
      {showNgayGiuongModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bed className="w-5 h-5 text-indigo-600" />
                Cập nhật Ngày-giường thực kê (KHTH)
              </h3>
              <button
                type="button"
                onClick={() => setShowNgayGiuongModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Mẫu số chuẩn hóa dùng để tính tỷ suất phát sinh chất thải và đồ vải trên 1.000 ngày-giường.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Năm</label>
                <input
                  type="number"
                  value={modalNam}
                  onChange={(e) => setModalNam(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tháng</label>
                <select
                  value={modalThang}
                  onChange={(e) => setModalThang(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số ngày-giường thực kê toàn viện <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={modalSoGiuong}
                onChange={(e) => setModalSoGiuong(e.target.value)}
                placeholder="Ví dụ: 35000"
                className="w-full px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ghi chú (nguồn số liệu)</label>
              <input
                type="text"
                value={modalGhiChu}
                onChange={(e) => setModalGhiChu(e.target.value)}
                placeholder="Số liệu từ Phòng KHTH..."
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Bảng các tháng đã nhập */}
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 mb-1">Các tháng đã có số liệu năm {modalNam}:</div>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {ngayGiuongList.filter((g) => g.nam === modalNam).length === 0 ? (
                  <div className="p-2 text-center text-slate-400">Chưa có tháng nào</div>
                ) : (
                  ngayGiuongList
                    .filter((g) => g.nam === modalNam)
                    .map((g) => (
                      <div key={g.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                        <span>
                          Tháng {g.thang}/{g.nam}: <strong>{Number(g.so_ngay_giuong).toLocaleString()}</strong> ngày-giường
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setModalThang(g.thang);
                            setModalSoGiuong(String(g.so_ngay_giuong));
                            setModalGhiChu(g.ghi_chu || "");
                          }}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Sửa
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNgayGiuongModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveNgayGiuong}
                disabled={savingGiuong}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5"
              >
                {savingGiuong && <Clock className="w-3.5 h-3.5 animate-spin" />}
                Lưu mẫu số
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
