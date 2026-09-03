import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";
import BoDungCuPrintQrButton from "./bo-dung-cu-print-qr-button";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import { formatDateVi } from "@/lib/format-datetime-vi";

interface ActionCells {
  renderStatusCell: (item: BoDungCuTableRow) => ReactNode;
  renderManagementCell: (item: BoDungCuTableRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Định nghĩa cột bảng Bộ dụng cụ — đủ trường hiển thị so với form lưu DB. */
export function getBoDungCuColumns(actionUi: ActionCells): Column<BoDungCuTableRow>[] {
  return [
    {
      header: "Mã bộ / Qr",
      accessorKey: "ma_bo",
      sortable: true,
      cell: (i) => {
        const code = String(i.ma_bo || "").trim();
        return (
          <span className="inline-flex items-center gap-2">
            {code ? <InlineEntityQrThumb code={code} size={36} /> : null}
            <span className={`${TC.cellCode} text-slate-700`}>{code || "—"}</span>
          </span>
        );
      },
    },
    {
      header: "Tên bộ",
      accessorKey: "ten_bo",
      sortable: true,
      cell: (i) => <span className={TC.cellTitle}>{clip(i.ten_bo, 48)}</span>,
    },
    {
      header: "Phân loại",
      accessorKey: "phan_loai_bo",
      sortable: true,
      cell: (i) => (
        <span className={i.phan_loai_bo === "THU_THUAT" ? TC.statusWarn : TC.statusInfo}>
          {i.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
        </span>
      ),
    },
    {
      header: "Cơ chế theo dõi",
      accessorKey: "co_ma_dinh_danh_rieng",
      sortable: true,
      cell: (i) => (
        <span className={i.co_ma_dinh_danh_rieng ? TC.statusInfo : TC.statusMuted}>
          {i.co_ma_dinh_danh_rieng ? "Mã QR riêng" : "Đồ dùng chung"}
        </span>
      ),
    },
    {
      header: "Sl bộ / Khoản / Tổng",
      accessorKey: "so_luong_bo",
      sortable: true,
      cell: (i) => (
        <span className={TC.cellMeta}>
          {i.phan_loai_bo === "THU_THUAT" ? (
            <>Tổng phân bổ: <span className="font-semibold tabular-nums text-amber-600">{i.tong_phan_bo || 0}</span></>
          ) : (
            <>Số bộ QR: <span className="font-semibold tabular-nums text-emerald-700">{i.so_luong_bo || 0}</span></>
          )}
          <div className="text-[11px] text-slate-400">
            Khoản: <span className="font-semibold tabular-nums text-slate-600">{i.so_khoan || 0}</span> / Dụng cụ:{" "}
            <span className="font-semibold tabular-nums text-slate-600">{i.tong_so_luong_dung_cu || 0}</span>
          </div>
        </span>
      ),
    },
    {
      header: "Quy cách",
      accessorKey: "quy_cach",
      sortable: true,
      cell: (i) => <span className={TC.cellBody}>{clip(i.quy_cach, 40)}</span>,
    },
    {
      header: "Khoa sử dụng",
      accessorKey: "khoa_su_dung",
      cell: (i) => (
        <span className={`font-mono text-rose-700 ${TC.cellMeta}`}>
          {formatKhoaCompactLabel({
            ma_khoa: i.khoa_su_dung?.ma_khoa,
            ten_khoa: i.khoa_su_dung?.ten_khoa,
          })}
        </span>
      ),
    },
    {
      header: "Tt nghiệp vụ",
      accessorKey: "trang_thai",
      sortable: true,
      cell: (i) => (
        <span className={TC.statusMuted}>{i.trang_thai || "—"}</span>
      ),
    },
    {
      header: "Kiểm kê gần nhất",
      accessorKey: "ngay_kiem_ke_gan_nhat",
      sortable: true,
      cell: (i) => {
        const raw = i.ngay_kiem_ke_gan_nhat;
        if (!raw) return <span className="text-[11px] text-slate-400">—</span>;
        return <span className="text-[11px] font-semibold text-slate-600">{formatDateVi(raw)}</span>;
      },
    },
    {
      header: "Ghi chú",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[11px] text-slate-500">{clip(i.ghi_chu, 56)}</span>,
    },
    {
      header: "Tem qr",
      accessorKey: "id",
      cell: (i) =>
        i.ma_bo ? (
          <BoDungCuPrintQrButton boId={i.id} />
        ) : (
          <span className="text-[11px] text-slate-400">Chưa có mã</span>
        ),
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
