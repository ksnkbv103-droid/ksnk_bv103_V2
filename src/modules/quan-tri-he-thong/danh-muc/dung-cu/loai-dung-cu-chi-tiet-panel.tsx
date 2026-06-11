"use client";

import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

import React, { useEffect, useState } from "react";
import { Layers, Loader2, RefreshCcw, History, Box } from "lucide-react";
import { toast } from "sonner";
import { getDungCuGiaoDichLogsAction, type DungCuGiaoDichRow } from "../actions/kho-dung-cu-giao-dich.actions";

type Props = {
  selectedLoaiId: string | null;
  selectedTenLoai?: string | null;
  selectedMaLoai?: string | null;
  boDungCuChua: { id: string; ma_bo: string | null; ten_bo: string | null }[];
};

export function LoaiDungCuChiTietPanel({
  selectedLoaiId,
  selectedTenLoai,
  selectedMaLoai,
  boDungCuChua,
}: Props) {
  const [activeTab, setActiveTab] = useState<"sets" | "logs">("sets");
  const [logs, setLogs] = useState<DungCuGiaoDichRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    if (!selectedLoaiId) return;
    setLoadingLogs(true);
    const result = await getDungCuGiaoDichLogsAction({ loaiDungCuId: selectedLoaiId });
    if (result.success) {
      setLogs(result.data || []);
    } else {
      toast.error("Không tải được lịch sử biến động: " + result.error);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (selectedLoaiId && activeTab === "logs") {
      fetchLogs();
    }
  }, [selectedLoaiId, activeTab]);

  if (!selectedLoaiId) {
    return (
      <div className={`${UI.inset} border-dashed p-12 text-center`}>
        <Layers className="mx-auto text-slate-300 mb-3 animate-pulse" size={32} />
        <span className={UI.innerTableHead}>
          Chọn một loại dụng cụ để xem các bộ chứa và lịch sử biến động kho
        </span>
      </div>
    );
  }

  const renderBadge = (type: string) => {
    const tone: Record<string, string> = {
      NHAP_KHO: "border-emerald-100 bg-emerald-50 text-emerald-600",
      BAO_HONG: "border-rose-100 bg-rose-50 text-rose-600",
      BAO_MAT: "border-amber-100 bg-amber-50 text-amber-600",
      BO_SUNG: "border-blue-100 bg-blue-50 text-blue-600",
      DIEU_CHUYEN: "border-purple-100 bg-purple-50 text-purple-600",
    };
    const label: Record<string, string> = {
      NHAP_KHO: "Nhập kho",
      BAO_HONG: "Báo hỏng",
      BAO_MAT: "Báo mất",
      BO_SUNG: "Bổ sung",
      DIEU_CHUYEN: "Điều chuyển",
    };
    const t = tone[type] ?? "border-slate-100 bg-slate-50 text-slate-600";
    return <span className={`${UI.statusBadge} ${t}`}>{label[type] ?? type}</span>;
  };

  return (
    <div className={`${UI.shell} shadow-xl animate-in fade-in duration-500 overflow-hidden`}>
      <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg">
              {selectedMaLoai || "LDC"}
            </span>
            <h3 className={UI.panelTitle}>
              {selectedTenLoai || "Chi tiết loại dụng cụ"}
            </h3>
          </div>
          <p className={`${UI.panelSubtitle} mt-1`}>
            Tra cứu ngược cấu trúc phân bổ & lịch sử biến động y tế
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("sets")}
            className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "sets"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Box size={13} /> Bộ dụng cụ chứa ({boDungCuChua.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History size={13} /> Lịch sử biến động ({logs.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === "sets" ? (
          <div>
            {boDungCuChua.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                Chưa có bộ dụng cụ nào chứa loại dụng cụ này
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Mã bộ</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Tên bộ dụng cụ</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boDungCuChua.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-mono text-[11px] text-[11px] font-medium text-slate-500 uppercase">{b.ma_bo || "—"}</td>
                        <td className="py-3 text-[11px] font-medium text-[var(--primary)]">{b.ten_bo || "—"}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              toast.info(`Bộ ${b.ten_bo} đang ở trong trang Danh mục Bộ`);
                            }}
                            className="font-mono text-[11px] font-medium text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Xem chi tiết bộ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {loadingLogs ? (
              <div className="flex items-center justify-center p-12 text-slate-500 font-bold text-[11px] uppercase gap-2">
                <Loader2 size={16} className="animate-spin" /> Đang tải lịch sử...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest flex flex-col items-center gap-3">
                <span>Chưa có giao dịch biến động nào được ghi nhận</span>
                <button
                  onClick={fetchLogs}
                  className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <RefreshCcw size={12} /> Tải lại
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Thời gian</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Loại giao dịch</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Biến động</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Bộ liên đới</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Mã vạch bộ QR</th>
                      <th className="pb-3 text-[11px] font-medium text-slate-400 tracking-wider">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 text-[11px] text-[11px] font-medium text-slate-500">
                          {new Date(log.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3">{renderBadge(log.loai_giao_dich)}</td>
                        <td className={`py-3 text-[11px] font-semibold ${
                          log.so_luong_thay_doi > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {log.so_luong_thay_doi > 0 ? `+${log.so_luong_thay_doi}` : log.so_luong_thay_doi}
                        </td>
                        <td className="py-3 text-[11px] font-bold text-slate-600 uppercase">
                          {log.bo_dung_cu ? log.bo_dung_cu.ten_bo : "—"}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {log.quy_trinh ? log.quy_trinh.ma_vach_set : "—"}
                        </td>
                        <td className="py-3 text-[11px] text-slate-500 italic">
                          {log.ghi_chu || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
