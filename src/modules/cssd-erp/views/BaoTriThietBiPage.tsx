// src/modules/cssd-erp/views/BaoTriThietBiPage.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Wrench, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import BaoTriActivePanel from "../components/bao-tri/bao-tri-active-panel";
import BaoTriStartModal from "../components/bao-tri/bao-tri-start-modal";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_DATA_SURFACE } from "../shared/ui/cssd-ui-chrome";
import {
  batDauBaoTriThietBiAction,
  huyBaoTriThietBiAction,
  ketThucBaoTriThietBiAction,
  listFactBaoTriThietBiAction,
  listThietBiCoTheBatDauBaoTriAction,
} from "../actions/cssd-bao-tri.actions";
import type { FactBaoTriRow } from "../actions/cssd-bao-tri.types";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";

const MODULE_KEY = "CSSD_ME_TIET_KHUAN";

function trangThaiLabel(s: string) {
  if (s === "DANG_THUC_HIEN") return "Đang thực hiện";
  if (s === "HOAN_THANH") return "Hoàn thành";
  if (s === "HUY") return "Đã hủy";
  return s;
}

export default function BaoTriThietBiPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const [rows, setRows] = useState<FactBaoTriRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<{ id: string; ma_thiet_bi: string; ten_thiet_bi: string }[]>([]);
  const [openStart, setOpenStart] = useState(false);
  const [selTb, setSelTb] = useState("");
  const [maMayHoacQr, setMaMayHoacQr] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [ketQuaById, setKetQuaById] = useState<Record<string, string>>({});
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([listFactBaoTriThietBiAction(), listThietBiCoTheBatDauBaoTriAction()]);
    if (!r1.success) toast.error(r1.error);
    else setRows(r1.data);
    if (!r2.success) toast.error(r2.error);
    else setMachines(r2.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canEdit = allowed.edit;

  const onBatDau = async () => {
    const r = await batDauBaoTriThietBiAction({ thiet_bi_id: selTb, ma_thiet_bi_hoac_qr: maMayHoacQr, ly_do: lyDo });
    if (!r.success) return toast.error(r.error);
    toast.success("Đã mở phiếu bảo trì — máy chuyển sang trạng thái bảo trì.");
    setOpenStart(false);
    setSelTb("");
    setMaMayHoacQr("");
    setLyDo("");
    void reload();
  };

  const onKetThuc = async (id: string) => {
    const ketQua = String(ketQuaById[id] || "").trim();
    if (!ketQua) return toast.error("Nhập kết quả cho phiếu.");
    const r = await ketThucBaoTriThietBiAction({ id, ket_qua_ghi_nhan: ketQua });
    if (!r.success) return toast.error(r.error);
    toast.success("Đã hoàn thành bảo trì — máy sẵn sàng cho mẻ tiệt khuẩn.");
    void reload();
  };

  const onHuy = async (id: string) => {
    if (!confirm("Hủy phiếu và trả máy về sẵn sàng?")) return;
    const r = await huyBaoTriThietBiAction({ id });
    if (!r.success) return toast.error(r.error);
    toast.message("Đã hủy phiếu.");
    void reload();
  };

  const columns: Column<FactBaoTriRow>[] = [
    { header: "MÃ PHIẾU", accessorKey: "ma_phieu", cell: (i) => <span className="font-mono text-[11px] font-bold text-[#026f17]">{i.ma_phieu}</span> },
    { header: "THIẾT BỊ", accessorKey: "ten_thiet_bi", cell: (i) => <span className="text-[11px] font-semibold">{i.ten_thiet_bi || "—"}</span> },
    {
      header: "TRẠNG THÁI",
      accessorKey: "trang_thai",
      cell: (i) => {
        const val = i.trang_thai;
        if (val === "DANG_THUC_HIEN") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-700 shadow-sm animate-in fade-in duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Đang thực hiện
            </span>
          );
        }
        if (val === "HOAN_THANH") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 shadow-sm animate-in fade-in duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Hoàn thành
            </span>
          );
        }
        if (val === "HUY") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Đã hủy
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {trangThaiLabel(val)}
          </span>
        );
      },
    },
    { header: "LÝ DO / KẾT QUẢ", accessorKey: "ly_do", cell: (i) => <span className="max-w-[200px] truncate text-[10px] text-slate-600">{i.ly_do || i.ket_qua_ghi_nhan || "—"}</span> },
  ];

  if (permLoading) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-[#026f17]" />
        </div>
      </div>
    );
  }

  if (!allowed.view) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">Bạn không có quyền xem mục này.</div>
      </div>
    );
  }

  const actionsNode = (
    <div className="flex gap-2">
      {canEdit && (
        <button
          type="button"
          onClick={() => setOpenStart(true)}
          className={`${CSSD_UI_ACTION_PRIMARY} h-10`}
        >
          <Wrench size={16} /> Mở phiếu bảo trì
        </button>
      )}
      <button
        type="button"
        className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 text-xs font-black uppercase tracking-wider text-red-600 shadow-sm hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
        onClick={() => setIsIncidentOpen(true)}
      >
        ⚠️ Báo sự cố
      </button>
    </div>
  );

  const totalBaoTri = rows.length;
  const activeBaoTri = rows.filter((r) => r.trang_thai === "DANG_THUC_HIEN").length;
  const doneBaoTri = rows.filter((r) => r.trang_thai === "HOAN_THANH").length;
  const canceledBaoTri = rows.filter((r) => r.trang_thai === "HUY").length;

  const contentNode = (
    <div className="space-y-6">
      {suppressShell && actionsNode && (
        <div className="flex justify-end">
          {actionsNode}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng phiếu bảo dưỡng</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalBaoTri}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
            <Wrench size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang bảo dưỡng</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{activeBaoTri}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 ${activeBaoTri > 0 ? "animate-pulse" : ""}`}>
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã hoàn thành</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{doneBaoTri}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phiếu đã hủy</p>
            <p className="text-2xl font-black text-slate-500 mt-1">{canceledBaoTri}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      <div className={CSSD_UI_DATA_SURFACE}>
        <AdvancedDataTable columns={columns} data={rows} loading={loading} searchPlaceholder="Tìm mã phiếu, thiết bị..." />
      </div>

      {canEdit ? (
        <BaoTriActivePanel rows={rows} ketQuaById={ketQuaById} onKetQuaChange={(id, v) => setKetQuaById((m) => ({ ...m, [id]: v }))} onKetThuc={onKetThuc} onHuy={onHuy} />
      ) : null}

      <BaoTriStartModal
        open={openStart}
        machines={machines}
        selTb={selTb}
        maMayHoacQr={maMayHoacQr}
        lyDo={lyDo}
        onSelTb={setSelTb}
        onMaMayHoacQr={setMaMayHoacQr}
        onLyDo={setLyDo}
        onClose={() => {
          setOpenStart(false);
          setMaMayHoacQr("");
        }}
        onSubmit={onBatDau}
      />

      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="EQUIPMENT"
      />
    </div>
  );

  if (suppressShell) {
    return contentNode;
  }

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Bảo trì thiết bị</span>}
      subtitle="Khóa máy khi bảo trì — không mở mẻ tiệt khuẩn / không thêm bộ vào mẻ cho đến khi hoàn thành hoặc hủy phiếu."
      actions={actionsNode}
    >
      {contentNode}
    </CSSDPageShell>
  );
}
