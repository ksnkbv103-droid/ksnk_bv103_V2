import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";
import BoDungCuPrintQrButton from "./bo-dung-cu-print-qr-button";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

interface ActionCells {
  renderStatusCell: (item: BoDungCuTableRow) => ReactNode;
  renderManagementCell: (item: BoDungCuTableRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function dinhMucTon(row: BoDungCuTableRow): string {
  if (row.phan_loai_bo === "THU_THUAT") return `ĐM ${row.tong_phan_bo || 0}`;
  return `ĐM ${row.so_luong_bo || 0}`;
}

/** Cột gọn: mã·tên dòng 1, meta dòng 2 — không card admin. */
export function getBoDungCuColumns(actionUi: ActionCells): Column<BoDungCuTableRow>[] {
  return [
    {
      header: "Bộ",
      accessorKey: "ma_bo",
      sortable: true,
      cell: (i) => {
        const code = String(i.ma_bo || "").trim();
        const loai = clip(i.loai_dung_cu?.ten_danh_muc || i.loai_dung_cu?.ma_danh_muc, 28);
        const kind = i.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật";
        return (
          <span className="inline-flex min-h-[44px] items-center gap-2 py-0.5">
            {code ? <InlineEntityQrThumb code={code} size={28} /> : null}
            <span className="min-w-0">
              <span className={`block ${TC.cellTitle}`}>
                <span className={TC.cellCode}>{code || "—"}</span>
                <span className="mx-1 text-slate-300">·</span>
                {clip(i.ten_bo, 40)}
              </span>
              <span className={`block ${TC.cellMeta}`}>
                {loai} · {kind}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      header: "Khoa",
      accessorKey: "khoa_su_dung.ten_khoa",
      sortable: true,
      cell: (i) => (
        <span className={TC.cellMeta}>
          {formatKhoaCompactLabel({
            ma_khoa: i.khoa_su_dung?.ma_khoa,
            ten_khoa: i.khoa_su_dung?.ten_khoa,
          })}
        </span>
      ),
    },
    {
      header: "Định mức",
      accessorKey: "so_luong_bo",
      sortable: true,
      cell: (i) => (
        <span className={TC.cellMeta}>
          {dinhMucTon(i)}
          <span className="block text-[11px] text-slate-400">
            {i.so_khoan || 0} khoản · {i.tong_so_luong_dung_cu || 0} DC
          </span>
        </span>
      ),
    },
    {
      header: "Tem",
      accessorKey: "id",
      cell: (i) =>
        i.ma_bo ? <BoDungCuPrintQrButton boId={i.id} /> : <span className="text-[11px] text-slate-400">—</span>,
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: TH.manage,
      accessorKey: "id",
      cell: (i) => actionUi.renderManagementCell(i),
    },
  ];
}
