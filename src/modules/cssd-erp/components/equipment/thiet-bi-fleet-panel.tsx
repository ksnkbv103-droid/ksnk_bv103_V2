"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import { listThietBiFleetAction, type ThietBiFleetRow } from "../../actions/cssd-thiet-bi-fleet.actions";
import { pmDueLabel, trangThaiMayLabel } from "@/lib/domain/cssd-equipment-pm";
import { CSSD_UI_CELL_CODE, CSSD_UI_DATA_SURFACE } from "../../shared/ui/cssd-ui-chrome";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import ThietBiPrintQrButton from "./thiet-bi-print-qr-button";
import { matchesDeviceCode, normalizeCssdCode } from "../../shared/domain/cssd-qr-core";
import { formatDateVi } from "@/lib/format-datetime-vi";

function pmBadgeClass(status: ThietBiFleetRow["pm_status"]) {
  if (status === "QUA_HAN") return "bg-red-50 text-red-700 border-red-200";
  if (status === "SAP_DEN") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "CHUA_CO_LICH") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function statusBadgeClass(st: string | null) {
  if (st === "REPAIRING") return "bg-blue-50 text-blue-700 border-blue-200";
  if (st === "HOLD_QC") return "bg-amber-50 text-amber-800 border-amber-200";
  if (st === "BROKEN") return "bg-red-50 text-red-700 border-red-200";
  if (st === "RETIRED") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function ThietBiFleetPanel() {
  const [rows, setRows] = useState<ThietBiFleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listThietBiFleetAction();
    if (!r.success) toast.error(r.error);
    else setRows(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyScan = useCallback(
    (raw: string) => {
      const code = normalizeCssdCode(raw);
      if (!code) {
        setHighlightId(null);
        return;
      }
      const matched = rows.find((m) => matchesDeviceCode(code, m.ma_thiet_bi));
      if (matched) {
        setHighlightId(matched.id);
        toast.success(`Đã tìm máy: ${matched.ma_thiet_bi} — ${matched.ten_thiet_bi}`);
      } else {
        setHighlightId(null);
        toast.error(`Không thấy máy khớp mã ${code}`);
      }
    },
    [rows],
  );

  const ready = rows.filter((x) => ["READY", "HOAT_DONG"].includes(String(x.trang_thai || ""))).length;
  const repairing = rows.filter((x) => x.trang_thai === "REPAIRING").length;
  const holdQc = rows.filter((x) => x.trang_thai === "HOLD_QC").length;
  const overduePm = rows.filter((x) => x.pm_status === "QUA_HAN").length;

  const columns = useMemo<Column<ThietBiFleetRow>[]>(
    () => [
      {
        header: "Mã / QR",
        accessorKey: "ma_thiet_bi",
        sortable: true,
        headerClassName: bv103TableLayout.colCodeQr,
        cellClassName: bv103TableLayout.colCodeQr,
        cell: (m) => {
          const code = String(m.ma_thiet_bi || "").trim();
          return (
            <span className="inline-flex items-center gap-2">
              {code ? <InlineEntityQrThumb code={code} size={40} /> : null}
              <span className={CSSD_UI_CELL_CODE}>{code || "—"}</span>
            </span>
          );
        },
      },
      {
        header: "Tên máy",
        accessorKey: "ten_thiet_bi",
        sortable: true,
        headerClassName: bv103TableLayout.colTitle,
        cellClassName: bv103TableLayout.colTitle,
        cell: (m) => {
          const ten = String(m.ten_thiet_bi || "").trim() || "—";
          const loai = String(m.ten_loai_may_hien_thi || m.loai_thiet_bi || "").trim() || "—";
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800" title={ten}>
                {ten}
              </p>
              <p className="truncate text-[11px] text-slate-500" title={loai}>
                {loai}
              </p>
            </div>
          );
        },
      },
      {
        header: "Trạng thái",
        accessorKey: "trang_thai",
        sortable: true,
        headerClassName: bv103TableLayout.colStatus,
        cellClassName: bv103TableLayout.colStatus,
        cell: (m) => {
          const label = trangThaiMayLabel(m.trang_thai);
          return (
            <span
              className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${statusBadgeClass(m.trang_thai)}`}
              title={label}
            >
              {label}
            </span>
          );
        },
      },
      {
        header: "PM",
        accessorKey: "pm_status",
        sortable: true,
        headerClassName: bv103TableLayout.colStatus,
        cellClassName: bv103TableLayout.colStatus,
        cell: (m) => {
          const label = pmDueLabel(m.pm_status);
          return (
            <div className="min-w-0 space-y-0.5">
              <span
                className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${pmBadgeClass(m.pm_status)}`}
                title={label}
              >
                {label}
              </span>
              {m.ngay_bao_tri_tiep_theo ? (
                <p className="truncate text-[11px] text-slate-500" title={`Kế: ${formatDateVi(m.ngay_bao_tri_tiep_theo)}`}>
                  Kế: {formatDateVi(m.ngay_bao_tri_tiep_theo)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: "Vị trí",
        accessorKey: "vi_tri",
        sortable: true,
        headerClassName: bv103TableLayout.colMeta,
        cellClassName: bv103TableLayout.colMeta,
        cell: (m) => {
          const v = String(m.vi_tri || "").trim() || "—";
          return (
            <span className="block truncate text-[11px] text-slate-600" title={v}>
              {v}
            </span>
          );
        },
      },
      {
        header: "Mẻ TK",
        accessorKey: "so_me_tk",
        sortable: true,
        headerClassName: bv103TableLayout.colNarrow,
        cellClassName: bv103TableLayout.colNarrow,
        cell: (m) => <span className="tabular-nums text-[11px] text-slate-700">{m.so_me_tk}</span>,
      },
      {
        header: "Thao tác",
        accessorKey: "id",
        headerClassName: bv103TableLayout.colActions,
        cellClassName: bv103TableLayout.colActions,
        cell: (m) => (
          <span className={bv103TableLayout.actionsCell}>
            <ThietBiPrintQrButton
              thietBiId={m.id}
              maThietBi={m.ma_thiet_bi}
              tenThietBi={m.ten_thiet_bi}
              variant="compact"
            />
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
        <StatInline label="Sẵn sàng" value={ready} icon={<CheckCircle2 size={14} />} tone="emerald" />
        <StatInline label="Đang BD" value={repairing} icon={<Wrench size={14} />} tone="blue" />
        <StatInline label="Tạm giữ QC" value={holdQc} icon={<AlertTriangle size={14} />} tone="amber" />
        <StatInline label="Quá hạn PM" value={overduePm} icon={<AlertTriangle size={14} />} tone="red" />
      </div>

      {rows.length === 0 ? (
        <div className={`${CSSD_UI_DATA_SURFACE} flex items-center justify-center p-8 text-center text-sm text-slate-600`}>
          Chưa có máy trong danh mục. Thêm máy tại Quản trị.
        </div>
      ) : (
        <AdvancedDataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Tìm tên, mã máy hoặc quét QR…"
          enableQrScan
          onQrScan={applyScan}
          emptyMessage="Không có máy khớp tìm kiếm."
          rowClassName={(m) => (highlightId === m.id ? "bg-[var(--primary)]/5 ring-1 ring-inset ring-[var(--primary)]/25" : "")}
          tableClassName={bv103TableLayout.tableFixed}
        />
      )}
    </div>
  );
}

function StatInline({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "red" | "amber";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600"
      : tone === "blue"
        ? "text-blue-600"
        : tone === "amber"
          ? "text-amber-700"
          : "text-emerald-600";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneClass}`}>
      {icon}
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-800">{value}</span>
    </span>
  );
}
