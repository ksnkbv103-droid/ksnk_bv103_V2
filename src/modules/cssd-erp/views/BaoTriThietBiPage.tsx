// src/modules/cssd-erp/views/BaoTriThietBiPage.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import BaoTriActivePanel from "../components/bao-tri/bao-tri-active-panel";
import BaoTriStartModal from "../components/bao-tri/bao-tri-start-modal";
import {
  batDauBaoTriThietBiAction,
  huyBaoTriThietBiAction,
  ketThucBaoTriThietBiAction,
  listFactBaoTriThietBiAction,
  listThietBiCoTheBatDauBaoTriAction,
  type FactBaoTriRow,
} from "../actions/read.actions";

const MODULE_KEY = "CSSD_ME_TIET_KHUAN";

function trangThaiLabel(s: string) {
  if (s === "DANG_THUC_HIEN") return "Đang thực hiện";
  if (s === "HOAN_THANH") return "Hoàn thành";
  if (s === "HUY") return "Đã hủy";
  return s;
}

export default function BaoTriThietBiPage() {
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const [rows, setRows] = useState<FactBaoTriRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<{ id: string; ma_thiet_bi: string; ten_thiet_bi: string }[]>([]);
  const [openStart, setOpenStart] = useState(false);
  const [selTb, setSelTb] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [ketQuaById, setKetQuaById] = useState<Record<string, string>>({});

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
    const r = await batDauBaoTriThietBiAction({ thiet_bi_id: selTb, ly_do: lyDo });
    if (!r.success) return toast.error(r.error);
    toast.success("Đã mở phiếu bảo trì — máy chuyển sang trạng thái bảo trì.");
    setOpenStart(false);
    setSelTb("");
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
      cell: (i) => <span className="text-[10px] font-black uppercase tracking-wide text-slate-600">{trangThaiLabel(i.trang_thai)}</span>,
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
        <CSSDSubNav />
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">Bạn không có quyền xem mục này.</div>
      </div>
    );
  }

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Bảo trì thiết bị</span>}
      subtitle="Khóa máy khi bảo trì — không mở mẻ tiệt khuẩn / không thêm bộ vào mẻ cho đến khi hoàn thành hoặc hủy phiếu."
      actions={
        canEdit ? (
          <button
            type="button"
            onClick={() => setOpenStart(true)}
            className="flex h-12 items-center gap-2 rounded-2xl bg-[#026f17] px-6 text-[10px] font-black uppercase tracking-widest text-[#FFD700]"
          >
            <Wrench size={16} /> Mở phiếu bảo trì
          </button>
        ) : null
      }
    >
      <div className="min-h-[420px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        <AdvancedDataTable columns={columns} data={rows} loading={loading} searchPlaceholder="Tìm mã phiếu, thiết bị..." />
      </div>

      {canEdit ? (
        <BaoTriActivePanel rows={rows} ketQuaById={ketQuaById} onKetQuaChange={(id, v) => setKetQuaById((m) => ({ ...m, [id]: v }))} onKetThuc={onKetThuc} onHuy={onHuy} />
      ) : null}

      <BaoTriStartModal
        open={openStart}
        machines={machines}
        selTb={selTb}
        lyDo={lyDo}
        onSelTb={setSelTb}
        onLyDo={setLyDo}
        onClose={() => setOpenStart(false)}
        onSubmit={onBatDau}
      />
    </CSSDPageShell>
  );
}
