import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

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
      header: "Mã bộ",
      accessorKey: "ma_bo",
      sortable: true,
      cell: (i) => <span className={`${TC.cellCode} text-slate-700`}>{i.ma_bo || "—"}</span>,
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
        i.phan_loai_bo === "THU_THUAT" ? (
          <span className="bg-[var(--surface-warning-bg)] text-[var(--surface-warning-text)] border border-[var(--surface-warning-border)] text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide">Thủ thuật</span>
        ) : (
          <span className="bg-[var(--surface-success-bg)] text-[var(--surface-success-text)] border border-[var(--surface-success-border)] text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide">Phẫu thuật</span>
        )
      ),
    },
    {
      header: "Cơ chế theo dõi",
      accessorKey: "co_ma_dinh_danh_rieng",
      sortable: true,
      cell: (i) => (
        i.co_ma_dinh_danh_rieng ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide text-blue-700 border border-blue-100 bg-blue-50">Mã QR riêng</span>
        ) : (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide text-slate-600 border border-slate-100 bg-slate-50">Đồ dùng chung</span>
        )
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
        <span className={`inline-flex max-w-[13rem] flex-col gap-0.5 ${TC.cellMeta}`}>
          <span className="font-mono text-rose-700">{i.khoa_su_dung?.ma_khoa || "—"}</span>
          <span>{clip(i.khoa_su_dung?.ten_khoa, 44)}</span>
        </span>
      ),
    },
    {
      header: "Tt nghiệp vụ",
      accessorKey: "trang_thai",
      sortable: true,
      cell: (i) => (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {i.trang_thai || "—"}
        </span>
      ),
    },
    {
      header: "Kiểm kê gần nhất",
      accessorKey: "ngay_kiem_ke_gan_nhat",
      sortable: true,
      cell: (i) => {
        const raw = i.ngay_kiem_ke_gan_nhat;
        if (!raw) return <span className="text-[11px] text-slate-400">—</span>;
        const t = String(raw);
        return <span className="text-[11px] font-semibold text-slate-600">{t.slice(0, 10)}</span>;
      },
    },
    {
      header: "Ghi chú",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[11px] text-slate-500">{clip(i.ghi_chu, 56)}</span>,
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
