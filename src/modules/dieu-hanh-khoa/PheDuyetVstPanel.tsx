"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  approveVstYeuCauAction,
  listVstYeuCauChoDuyetAction,
  rejectVstYeuCauAction,
  type VstYeuCauDieuChinhRow,
} from "@/modules/giam-sat-vst/actions/vst-yeu-cau-dieu-chinh.actions";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103PanelChrome as P } from "@/lib/bv103-panel-chrome";

/** Hàng chờ duyệt sửa/xóa muộn phiên giám sát vệ sinh tay (đặc tả M01 R1.24, R1.25). */
export function PheDuyetVstPanel() {
  const { loading, allowed } = useModulePermission("GIAM_SAT_VST");
  const canApprove = allowed.approve;
  const [rows, setRows] = useState<VstYeuCauDieuChinhRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const res = await listVstYeuCauChoDuyetAction();
    if (res.success) setRows(res.data);
    else toast.error(res.error);
  };

  useEffect(() => {
    if (canApprove) void reload();
  }, [canApprove]);

  if (loading || !canApprove) return null;

  const xuLy = async (id: string, duyet: boolean) => {
    const laSua = rows.find((r) => r.id === id)?.loai === "SUA";
    setBusyId(id);
    const res = duyet ? await approveVstYeuCauAction(id) : await rejectVstYeuCauAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.success(!duyet ? "Đã từ chối yêu cầu." : laSua ? "Đã duyệt, phiên đã được sửa theo đề nghị." : "Đã duyệt, phiên đã được vô hiệu.");
      await reload();
    }
  };

  return (
    <section className={P.shell}>
      <h2 className={`${P.panelTitle} border-b border-slate-200 px-4 py-2.5`}>
        Giám sát vệ sinh tay — yêu cầu sửa, xóa phiên sau 30 phút ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-[12px] text-slate-600">Không có yêu cầu nào đang chờ duyệt.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {r.loai === "XOA" ? "Xóa phiên" : "Sửa phiên"} · {r.tenKhoa} · ngày {r.ngayGiamSat || "—"}
                </p>
                <p className="text-[12px] text-slate-600">
                  Người đề nghị: {r.nguoiYeuCau} · Lý do: {r.lyDo}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void xuLy(r.id, false)}
                  className="touch-manipulation rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void xuLy(r.id, true)}
                  className="touch-manipulation rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Duyệt
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
