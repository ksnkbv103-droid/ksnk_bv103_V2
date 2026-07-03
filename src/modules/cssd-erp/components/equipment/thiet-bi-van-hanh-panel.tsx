"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import {
  listMeTietKhuanTheoThietBiAction,
  listThietBiCoMeTietKhuanAction,
  type MeTietKhuanTheoMayRow,
} from "../../actions/cssd-thiet-bi-van-hanh.actions";
import { CSSD_UI_DATA_SURFACE } from "../../shared/ui/cssd-ui-chrome";

function fmtDt(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function triLabel(v: boolean | null) {
  if (v === true) return "Đạt";
  if (v === false) return "Không đạt";
  return "—";
}

export default function ThietBiVanHanhPanel() {
  const [machines, setMachines] = useState<{ id: string; ma_thiet_bi: string; ten_thiet_bi: string }[]>([]);
  const [selId, setSelId] = useState("");
  const [rows, setRows] = useState<MeTietKhuanTheoMayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const r = await listThietBiCoMeTietKhuanAction();
      if (!r.success) toast.error(r.error);
      else {
        setMachines(r.data);
        if (r.data[0]?.id) setSelId(r.data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const loadMe = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    const r = await listMeTietKhuanTheoThietBiAction(id);
    if (!r.success) toast.error(r.error);
    else setRows(r.data);
    setLoadingRows(false);
  }, []);

  useEffect(() => {
    void loadMe(selId);
  }, [selId, loadMe]);

  const columns: Column<MeTietKhuanTheoMayRow>[] = [
    { header: "Mã mẻ", accessorKey: "ma_lo_tiet_khuan", cell: (i) => <span className="font-mono text-[11px] font-bold text-[var(--primary)]">{i.ma_lo_tiet_khuan}</span> },
    { header: "Bắt đầu", accessorKey: "thoi_gian_bat_dau", cell: (i) => <span className="text-[11px]">{fmtDt(i.thoi_gian_bat_dau)}</span> },
    { header: "Kết thúc", accessorKey: "thoi_gian_ket_thuc", cell: (i) => <span className="text-[11px]">{fmtDt(i.thoi_gian_ket_thuc)}</span> },
    { header: "QC mẻ", accessorKey: "ket_qua_test", cell: (i) => <span className="text-[11px]">{triLabel(i.ket_qua_test)}</span> },
    { header: "BI", accessorKey: "ket_qua_bi", cell: (i) => <span className="text-[11px]">{triLabel(i.ket_qua_bi)}</span> },
    { header: "CI", accessorKey: "ket_qua_ci", cell: (i) => <span className="text-[11px]">{triLabel(i.ket_qua_ci)}</span> },
    {
      header: "Nhiệt / Áp",
      accessorKey: "nhiet_do",
      cell: (i) => (
        <span className="text-[11px] text-slate-600">
          {i.nhiet_do ?? "—"}° / {i.ap_suat ?? "—"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Xem lịch sử mẻ tiệt khuẩn đã chạy trên từng máy — dữ liệu đọc từ module Mẻ TK, không nhập lại.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="text-[11px] font-medium text-slate-500">Chọn máy</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selId}
            onChange={(e) => setSelId(e.target.value)}
          >
            <option value="">— Chọn máy —</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ma_thiet_bi} — {m.ten_thiet_bi}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selId ? (
        <div className={`${CSSD_UI_DATA_SURFACE} rounded-2xl p-8 text-center text-sm text-slate-600`}>Chọn máy để xem lịch sử.</div>
      ) : loadingRows ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <AdvancedDataTable columns={columns} data={rows} searchPlaceholder="Tìm mã mẻ..." />
      )}
    </div>
  );
}
