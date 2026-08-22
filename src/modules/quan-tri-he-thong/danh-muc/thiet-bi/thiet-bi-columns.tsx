import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import ThietBiPrintQrButton from "@/modules/cssd-erp/components/equipment/thiet-bi-print-qr-button";
import { formatDateVi } from "@/lib/format-datetime-vi";

interface ActionCells {
  renderStatusCell: (item: ThietBiRow) => ReactNode;
  renderManagementCell: (item: ThietBiRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function getThietBiColumns(actionUi: ActionCells): Column<ThietBiRow>[] {
  return [
    {
      header: "Mã / QR",
      accessorKey: "ma_thiet_bi",
      sortable: true,
      headerClassName: bv103TableLayout.colCodeQr,
      cellClassName: bv103TableLayout.colCodeQr,
      cell: (i) => {
        const code = String(i.ma_thiet_bi || "").trim();
        return (
          <span className="inline-flex items-center gap-2">
            {code ? <InlineEntityQrThumb code={code} size={36} /> : null}
            <span className={`${TC.cellCode} text-slate-700`}>{code || "—"}</span>
          </span>
        );
      },
    },
    {
      header: "Tên thiết bị",
      accessorKey: "ten_thiet_bi",
      sortable: true,
      headerClassName: bv103TableLayout.colTitle,
      cellClassName: bv103TableLayout.colTitle,
      cell: (i) => <span className={TC.cellTitle}>{clip(i.ten_thiet_bi, 44)}</span>,
    },
    {
      header: "Loại (mã)",
      accessorKey: "loai_thiet_bi",
      sortable: true,
      cell: (i) => (
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {i.loai_thiet_bi || "—"}
        </span>
      ),
    },
    {
      header: "Trạng thái vận hành",
      accessorKey: "trang_thai",
      sortable: true,
      cell: (i) => {
        const val = (i.trang_thai || "READY").toUpperCase();
        if (val === "REPAIRING" || val === "BAO_TRI") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600 border border-rose-100 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Đang bảo trì
            </span>
          );
        }
        if (val === "READY" || val === "SAN_SANG") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 border border-emerald-100 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sẵn sàng
            </span>
          );
        }
        if (val === "HOLD_QC") {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 border border-amber-200 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Tạm giữ QC
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 border border-blue-100 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {clip(i.trang_thai, 20)}
          </span>
        );
      },
    },
    {
      header: "Tần suất sử dụng",
      accessorKey: "so_lan_su_dung",
      sortable: true,
      cell: (i) => {
        const count = i.so_lan_su_dung || 0;
        if (count > 0) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700 shadow-sm">
              🔥 {count} mẻ
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            0 mẻ
          </span>
        );
      },
    },
    {
      header: "Hãng / Năm sx",
      accessorKey: "hang_san_xuat",
      cell: (i) => (
        <span className="text-[11px] text-slate-600">
          {clip(i.hang_san_xuat, 24)} {i.nam_san_xuat != null ? `· ${i.nam_san_xuat}` : ""}
        </span>
      ),
    },
    {
      header: "Đưa vào sd",
      accessorKey: "ngay_dua_vao_su_dung",
      sortable: true,
      cell: (i) => {
        const raw = i.ngay_dua_vao_su_dung;
        if (!raw) return <span className="text-[11px] text-slate-400">—</span>;
        return <span className="text-[11px] font-semibold text-slate-600">{formatDateVi(raw)}</span>;
      },
    },
    {
      header: "Bk (ngày)",
      accessorKey: "chu_ky_bao_tri_ngay",
      sortable: true,
      cell: (i) => <span className="text-[11px] font-bold">{i.chu_ky_bao_tri_ngay ?? "—"}</span>,
    },
    {
      header: "Bk gần / Tiếp",
      accessorKey: "ngay_bao_tri_gan_nhat",
      cell: (i) => (
        <span className="text-[11px] font-semibold text-slate-600">
          {formatDateVi(i.ngay_bao_tri_gan_nhat)} → {formatDateVi(i.ngay_bao_tri_tiep_theo)}
        </span>
      ),
    },
    {
      header: "Ghi chú",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[11px] text-slate-500">{clip(i.ghi_chu, 40)}</span>,
    },
    {
      header: "Tem QR",
      accessorKey: "id",
      headerClassName: bv103TableLayout.colActions,
      cellClassName: bv103TableLayout.colActions,
      cell: (i) =>
        i.ma_thiet_bi ? (
          <span className={bv103TableLayout.actionsCell}>
            <ThietBiPrintQrButton
              thietBiId={i.id}
              maThietBi={i.ma_thiet_bi || ""}
              tenThietBi={i.ten_thiet_bi || ""}
              variant="compact"
            />
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Chưa có mã</span>
        ),
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      headerClassName: bv103TableLayout.colStatus,
      cellClassName: bv103TableLayout.colStatus,
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: TH.manage,
      accessorKey: "id",
      headerClassName: bv103TableLayout.colActions,
      cellClassName: bv103TableLayout.colActions,
      cell: (i) => <span className={bv103TableLayout.actionsCell}>{actionUi.renderManagementCell(i)}</span>,
    },
  ];
}
