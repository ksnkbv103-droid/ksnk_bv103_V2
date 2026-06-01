import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";

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
      header: "MÃ BỘ",
      accessorKey: "ma_bo",
      sortable: true,
      cell: (i) => <span className="font-mono text-[11px] font-bold uppercase text-slate-700">{i.ma_bo || "—"}</span>,
    },
    {
      header: "TÊN BỘ",
      accessorKey: "ten_bo",
      sortable: true,
      cell: (i) => <span className="text-[11px] font-black uppercase text-[#026f17]">{clip(i.ten_bo, 48)}</span>,
    },
    {
      header: "PHÂN LOẠI",
      accessorKey: "phan_loai_bo",
      sortable: true,
      cell: (i) => (
        i.phan_loai_bo === "THU_THUAT" ? (
          <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Thủ thuật</span>
        ) : (
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Phẫu thuật</span>
        )
      ),
    },
    {
      header: "CƠ CHẾ THEO DÕI",
      accessorKey: "co_ma_dinh_danh_rieng",
      sortable: true,
      cell: (i) => (
        i.co_ma_dinh_danh_rieng ? (
          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Mã QR riêng</span>
        ) : (
          <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Đồ dùng chung</span>
        )
      ),
    },
    {
      header: "SL BỘ/KHOẢN/TỔNG",
      accessorKey: "so_luong_bo",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px] font-bold text-slate-600">
          {i.phan_loai_bo === "THU_THUAT" ? (
            <>Tổng phân bổ: <span className="text-amber-600 font-black">{i.tong_phan_bo || 0}</span></>
          ) : (
            <>Số bộ QR: <span className="text-emerald-700 font-black">{i.so_luong_bo || 0}</span></>
          )}
          <div className="text-slate-400 text-[9px]">
            Khoản: <span className="font-black text-slate-600">{i.so_khoan || 0}</span> / Dụng cụ: <span className="font-black text-slate-600">{i.tong_so_luong_dung_cu || 0}</span>
          </div>
        </span>
      ),
    },
    {
      header: "QUY CÁCH",
      accessorKey: "quy_cach",
      sortable: true,
      cell: (i) => <span className="text-[10px] font-bold text-slate-600">{clip(i.quy_cach, 40)}</span>,
    },
    {
      header: "KHOA SỬ DỤNG",
      accessorKey: "khoa_su_dung",
      cell: (i) => (
        <span className="inline-flex max-w-[13rem] flex-col gap-0.5 text-[10px] font-bold text-slate-600">
          <span className="font-mono text-rose-700">{i.khoa_su_dung?.ma_khoa || "—"}</span>
          <span>{clip(i.khoa_su_dung?.ten_khoa, 44)}</span>
        </span>
      ),
    },
    {
      header: "TT NGHIỆP VỤ",
      accessorKey: "trang_thai",
      sortable: true,
      cell: (i) => (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600">
          {i.trang_thai || "—"}
        </span>
      ),
    },
    {
      header: "KIỂM KÊ GẦN NHẤT",
      accessorKey: "ngay_kiem_ke_gan_nhat",
      sortable: true,
      cell: (i) => {
        const raw = i.ngay_kiem_ke_gan_nhat;
        if (!raw) return <span className="text-[10px] text-slate-400">—</span>;
        const t = String(raw);
        return <span className="text-[10px] font-semibold text-slate-600">{t.slice(0, 10)}</span>;
      },
    },
    {
      header: "GHI CHÚ",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[10px] text-slate-500">{clip(i.ghi_chu, 56)}</span>,
    },
    {
      header: "HOẠT ĐỘNG",
      accessorKey: "is_active",
      sortable: true,
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: "QUẢN LÝ",
      accessorKey: "id",
      cell: (i) => actionUi.renderManagementCell(i),
    },
  ];
}
