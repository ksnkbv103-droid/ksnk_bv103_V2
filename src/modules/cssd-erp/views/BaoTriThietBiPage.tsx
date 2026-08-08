// src/modules/cssd-erp/views/BaoTriThietBiPage.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Wrench, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import BaoTriActivePanel from "../components/bao-tri/bao-tri-active-panel";
import BaoTriStartModal from "../components/bao-tri/bao-tri-start-modal";
import { CSSD_UI_ACTION_PRIMARY } from "../shared/ui/cssd-ui-chrome";
import {
  batDauBaoTriThietBiAction,
  huyBaoTriThietBiAction,
  ketThucBaoTriThietBiAction,
  listFactBaoTriThietBiAction,
  listThietBiCoTheBatDauBaoTriAction,
} from "../actions/cssd-bao-tri.actions";
import { listSuCoEquipmentGanDayAction } from "../actions/cssd-bao-tri-su-co.actions";
import type { FactBaoTriRow, LoaiPhieuBaoTri, SuCoEquipmentRow } from "../actions/cssd-bao-tri.types";
import type { BaoTriMachineOption } from "../actions/cssd-bao-tri-list.actions";
import type { CssdPmChecklistItem } from "@/lib/domain/cssd-equipment-pm-checklist";
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
  const [machines, setMachines] = useState<BaoTriMachineOption[]>([]);
  const [openStart, setOpenStart] = useState(false);
  const [selTb, setSelTb] = useState("");
  const [loaiPhieu, setLoaiPhieu] = useState<LoaiPhieuBaoTri>("DINH_KY");
  const [maMayHoacQr, setMaMayHoacQr] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [ketQuaById, setKetQuaById] = useState<Record<string, string>>({});
  const [checklistById, setChecklistById] = useState<Record<string, CssdPmChecklistItem[]>>({});
  const [suCoRows, setSuCoRows] = useState<SuCoEquipmentRow[]>([]);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      listFactBaoTriThietBiAction(),
      listThietBiCoTheBatDauBaoTriAction(),
      listSuCoEquipmentGanDayAction(),
    ]);
    if (!r1.success) toast.error(r1.error);
    else {
      setRows(r1.data);
      const ck: Record<string, CssdPmChecklistItem[]> = {};
      for (const row of r1.data) {
        if (row.trang_thai === "DANG_THUC_HIEN" && row.checklist_jsonb?.length) {
          ck[row.id] = row.checklist_jsonb;
        }
      }
      setChecklistById((prev) => ({ ...ck, ...prev }));
    }
    if (!r2.success) toast.error(r2.error);
    else setMachines(r2.data);
    if (!r3.success) toast.error(r3.error);
    else setSuCoRows(r3.data.filter((x) => x.thiet_bi_id));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canEdit = allowed.edit;

  const onBatDau = async (opts?: { su_co_id?: string; thiet_bi_id?: string; loai?: LoaiPhieuBaoTri; ly_do?: string }) => {
    const r = await batDauBaoTriThietBiAction({
      thiet_bi_id: opts?.thiet_bi_id ?? selTb,
      ma_thiet_bi_hoac_qr: maMayHoacQr,
      ly_do: opts?.ly_do ?? lyDo,
      loai_phieu: opts?.loai ?? loaiPhieu,
      su_co_id: opts?.su_co_id,
    });
    if (!r.success) return toast.error(r.error);
    toast.success("Đã mở phiếu — máy chuyển sang trạng thái bảo trì.");
    setOpenStart(false);
    setSelTb("");
    setLoaiPhieu("DINH_KY");
    setMaMayHoacQr("");
    setLyDo("");
    void reload();
  };

  const onMoPhieuTuSuCo = async (sc: SuCoEquipmentRow) => {
    if (!sc.thiet_bi_id) return toast.error("Sự cố chưa gắn máy.");
    const ly = sc.mo_ta || sc.incident_type_label || "Sửa chữa từ sự cố EQUIPMENT";
    await onBatDau({ thiet_bi_id: sc.thiet_bi_id, loai: "SUA_CHUA", ly_do: ly, su_co_id: sc.id });
  };

  const onKetThuc = async (id: string) => {
    const ketQua = String(ketQuaById[id] || "").trim();
    if (!ketQua) return toast.error("Nhập kết quả cho phiếu.");
    const r = await ketThucBaoTriThietBiAction({
      id,
      ket_qua_ghi_nhan: ketQua,
      checklist_jsonb: checklistById[id],
    });
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
    { header: "Mã phiếu", accessorKey: "ma_phieu", cell: (i) => <span className="font-mono text-[11px] font-bold text-[var(--primary)]">{i.ma_phieu}</span> },
    { header: "Thiết bị", accessorKey: "ten_thiet_bi", cell: (i) => <span className="text-[11px] font-semibold">{i.ten_thiet_bi || "—"}</span> },
    {
      header: "Loại",
      accessorKey: "loai_phieu",
      cell: (i) => (
        <span className={`text-[11px] font-semibold uppercase ${i.loai_phieu === "SUA_CHUA" ? "text-red-600" : "text-[var(--primary)]"}`}>
          {i.loai_phieu === "SUA_CHUA" ? "Sửa chữa" : "Định kỳ"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "trang_thai",
      cell: (i) => {
        const val = i.trang_thai;
        if (val === "DANG_THUC_HIEN") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 shadow-sm animate-in fade-in duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Đang thực hiện
            </span>
          );
        }
        if (val === "HOAN_THANH") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 shadow-sm animate-in fade-in duration-300">
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
    { header: "Lý do / Kết quả", accessorKey: "ly_do", cell: (i) => <span className="max-w-[200px] truncate text-[11px] text-slate-600">{i.ly_do || i.ket_qua_ghi_nhan || "—"}</span> },
  ];

  if (permLoading) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (!allowed.view) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">Bạn không có quyền xem mục này.</div>
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
        className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 text-[11px] font-semibold uppercase tracking-wide text-red-600 shadow-sm hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
          <Wrench size={14} /> Tổng <span className="tabular-nums text-slate-800">{totalBaoTri}</span>
        </span>
        <span className={`inline-flex items-center gap-1.5 font-semibold text-blue-600 ${activeBaoTri > 0 ? "animate-pulse" : ""}`}>
          <Activity size={14} /> Đang BD <span className="tabular-nums text-slate-800">{activeBaoTri}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
          <CheckCircle2 size={14} /> Xong <span className="tabular-nums text-slate-800">{doneBaoTri}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
          <XCircle size={14} /> Hủy <span className="tabular-nums text-slate-800">{canceledBaoTri}</span>
        </span>
      </div>

      <AdvancedDataTable columns={columns} data={rows} loading={loading} searchPlaceholder="Tìm mã phiếu, thiết bị..." />

      {canEdit && suCoRows.length > 0 ? (
        <div className="rounded-[var(--radius-shell)] border border-red-100 bg-red-50/30 p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Sự cố máy gần đây — mở phiếu sửa chữa</p>
          <div className="space-y-2">
            {suCoRows.slice(0, 5).map((sc) => (
              <div key={sc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white bg-white px-3 py-2 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800">{sc.ma_thiet_bi || "—"}</span>
                  <span className="text-slate-500"> · {sc.ten_thiet_bi || ""}</span>
                  <p className="truncate text-slate-600">{sc.mo_ta || sc.incident_type_label}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold uppercase text-red-700"
                  onClick={() => void onMoPhieuTuSuCo(sc)}
                >
                  Mở phiếu sửa
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <BaoTriActivePanel
          rows={rows}
          ketQuaById={ketQuaById}
          checklistById={checklistById}
          onKetQuaChange={(id, v) => setKetQuaById((m) => ({ ...m, [id]: v }))}
          onChecklistChange={(id, items) => setChecklistById((m) => ({ ...m, [id]: items }))}
          onKetThuc={onKetThuc}
          onHuy={onHuy}
        />
      ) : null}

      <BaoTriStartModal
        open={openStart}
        machines={machines}
        selTb={selTb}
        loaiPhieu={loaiPhieu}
        maMayHoacQr={maMayHoacQr}
        lyDo={lyDo}
        onSelTb={setSelTb}
        onLoaiPhieu={setLoaiPhieu}
        onMaMayHoacQr={setMaMayHoacQr}
        onLyDo={setLyDo}
        onClose={() => {
          setOpenStart(false);
          setMaMayHoacQr("");
        }}
        onSubmit={() => void onBatDau()}
      />

      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="EQUIPMENT"
        onSuccess={() => void reload()}
      />
    </div>
  );

  if (suppressShell) {
    return contentNode;
  }

  return (
    <CSSDPageShell
      title={<span className="text-[var(--primary)]">Bảo trì thiết bị</span>}
      subtitle="Đang bảo trì — khóa mở mẻ / nạp bộ."
      actions={actionsNode}
    >
      {contentNode}
    </CSSDPageShell>
  );
}
