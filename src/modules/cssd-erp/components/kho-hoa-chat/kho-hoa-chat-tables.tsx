"use client";

import React, { useMemo } from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { isHoaChatLoai, loaiHoaChatLabel } from "@/lib/domain/cssd-hoa-chat-loai";
import { isLotNearExpiry } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import type { KhoHoaChatGiaoDichRow, KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";
import { canShowDuyetButtons, normalizeTrangThai, trangThaiLabel } from "@/lib/domain/cssd-kho-hoa-chat-duyet";
import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";

export type KhoHoaChatApproveProps = {
  canApprove: boolean;
  decidingId: string | null;
  onDecide: (row: KhoHoaChatGiaoDichRow, quyetDinh: "DUYET" | "TU_CHOI") => void;
};

const TT_CLASS = {
  CHO_DUYET: "bg-amber-50 border-amber-200 text-amber-800",
  DA_DUYET: "bg-emerald-50 border-emerald-100 text-emerald-700",
  TU_CHOI: "bg-rose-50 border-rose-200 text-rose-700",
} as const;

const movColsBase: Column<KhoHoaChatGiaoDichRow>[] = [
  { 
    header: "Mã phiếu", 
    accessorKey: "ma_phieu", sortable: true, 
    cell: (i) => <span className="font-mono text-[11px] font-medium text-[var(--primary)]">{i.ma_phieu}</span> 
  },
  { 
    header: "Loại giao dịch", 
    accessorKey: "loai_giao_dich", sortable: true, 
    cell: (i) => {
      const type = i.loai_giao_dich;
      if (type === "NHAP" || type === "NHAP_KHO") {
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
            + Nhập kho
          </span>
        );
      }
      if (type === "XUAT" || type === "XUAT_KHO") {
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 shadow-sm">
            - Xuất kho
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm">
          ⚙ Điều chỉnh
        </span>
      );
    } 
  },
  { 
    header: "Mặt hàng / Vật tư", 
    accessorKey: "ten_hoa_chat", sortable: true, 
    cell: (i) => <span className="bv103-type-label font-semibold text-slate-700">{i.ten_hoa_chat || "—"}</span> 
  },
  { 
    header: "Số lượng", 
    accessorKey: "so_luong_co_dau", sortable: true, 
    cell: (i) => {
      const q = i.so_luong_co_dau;
      const isPos = q > 0;
      return (
        <span className={`tabular-nums text-[11px] font-semibold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
          {isPos ? `+${q}` : q}
        </span>
      );
    } 
  },
  { 
    header: "Mã lô / Hạn dùng", 
    accessorKey: "ma_lo", sortable: true, 
    cell: (i) => (
      <span className="text-[11px] text-slate-600">
        Lô: <span className="font-mono font-bold text-slate-700">{i.ma_lo || "Không"}</span>
        {i.han_su_dung ? ` · HSD: ${formatDateVi(i.han_su_dung)}` : ""}
      </span>
    ) 
  },
  { 
    header: "Liên kết", 
    accessorKey: "su_co_id", sortable: true, 
    cell: (i) =>
      i.su_co_id ? (
        <span className="text-[11px] font-medium text-violet-800">Sự cố</span>
      ) : (
        <span className="text-[11px] text-slate-400">—</span>
      ),
  },
  {
    header: "Người lập",
    accessorKey: "nguoi_lap_ten", sortable: true,
    cell: (i) => <span className="bv103-type-label text-slate-600">{i.nguoi_lap_ten || "—"}</span>,
  },
  {
    header: "Trạng thái",
    accessorKey: "trang_thai", sortable: true,
    cell: (i) => (
      <span className="inline-flex flex-col gap-0.5">
        <span className={`inline-flex w-fit rounded border px-2 py-0.5 bv103-type-label font-semibold ${TT_CLASS[normalizeTrangThai(i.trang_thai)]}`}>
          {trangThaiLabel(i.trang_thai)}
        </span>
        {i.tu_duyet_ngoai_le ? <span className="bv103-type-label font-medium text-amber-800">tự duyệt ngoại lệ</span> : null}
        {i.trang_thai === "TU_CHOI" && i.ly_do_tu_choi ? (
          <span className="bv103-type-label text-rose-700">Lý do: {i.ly_do_tu_choi}</span>
        ) : null}
      </span>
    ),
  },
  {
    header: "Người duyệt",
    accessorKey: "nguoi_duyet_ten", sortable: true,
    cell: (i) => (
      <span className="bv103-type-label text-slate-600">
        {i.nguoi_duyet_ten || "—"}
        {i.duyet_at ? ` · ${formatDateTimeVi(i.duyet_at)}` : ""}
      </span>
    ),
  },
  { 
    header: "Thời điểm", 
    accessorKey: "created_at", sortable: true, 
    cell: (i) => <span className="text-[11px] text-slate-500">{formatDateTimeVi(i.created_at)}</span> 
  },
];

type Props = {
  tons: KhoHoaChatTonLo[];
  movs: KhoHoaChatGiaoDichRow[];
  loading: boolean;
  /** Mốc ngày cho highlight cận-date (FEFO / QT.38). */
  todayYmd?: string;
  /** Tab «Tồn kho» chỉ hiện tồn lô; tab «Nhập · Xuất» chỉ hiện phiếu. */
  section?: "ton" | "mov" | "both";
  /** HC-C: nút Duyệt/Từ chối (cần CSSD_HOA_CHAT.approve). */
  approve?: KhoHoaChatApproveProps;
};

export default function KhoHoaChatTables({ tons, movs, loading, todayYmd, section = "both", approve }: Props) {
  const movCols: Column<KhoHoaChatGiaoDichRow>[] = useMemo(() => {
    if (!approve?.canApprove) return movColsBase;
    return [
      ...movColsBase,
      {
        header: "Duyệt",
        accessorKey: "id",
        cell: (i) =>
          canShowDuyetButtons({ trangThai: i.trang_thai, canApprove: approve.canApprove }) ? (
            <span className="inline-flex gap-1">
              <button type="button" disabled={approve.decidingId === i.id} onClick={() => approve.onDecide(i, "DUYET")} className="rounded bg-emerald-600 px-2 py-0.5 bv103-type-label font-semibold text-white disabled:opacity-50">Duyệt</button>
              <button type="button" disabled={approve.decidingId === i.id} onClick={() => approve.onDecide(i, "TU_CHOI")} className="rounded border border-rose-300 px-2 py-0.5 bv103-type-label font-semibold text-rose-700 disabled:opacity-50">Từ chối</button>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          ),
      },
    ];
  }, [approve]);

  const tonCols: Column<KhoHoaChatTonLo>[] = useMemo(
    () => [
      {
        header: "Loại",
        accessorKey: "loai_hoa_chat", sortable: true,
        cell: (i) => {
          const isChem = isHoaChatLoai(i.loai_hoa_chat);
          return (
            <span className={isChem ? "text-[11px] font-medium text-sky-800" : "text-[11px] font-medium text-violet-800"}>
              {loaiHoaChatLabel(i.loai_hoa_chat)}
            </span>
          );
        },
      },
      {
        header: "Mã",
        accessorKey: "ma_hoa_chat", sortable: true,
        cell: (i) => <span className="font-mono bv103-type-label font-semibold text-[var(--primary)]">{i.ma_hoa_chat}</span>,
      },
      {
        header: "Tên mặt hàng",
        accessorKey: "ten_hoa_chat", sortable: true,
        cell: (i) => <span className="bv103-type-label text-slate-700">{i.ten_hoa_chat}</span>,
      },
      {
        header: "Mã lô",
        accessorKey: "ma_lo", sortable: true,
        cell: (i) => (
          <span className="font-mono text-[11px] text-slate-600">{i.ma_lo || "Không mã"}</span>
        ),
      },
      {
        header: "Hạn sử dụng",
        accessorKey: "han_su_dung", sortable: true,
        cell: (i) => {
          if (!i.han_su_dung) return <span className="text-[11px] text-slate-400">—</span>;
          const isNear = isLotNearExpiry(i.han_su_dung, todayYmd);
          return (
            <span className={`text-[11px] font-medium ${isNear ? "text-amber-800" : "text-slate-600"}`}>
              {formatDateVi(i.han_su_dung)}
              {isNear ? " · cận hạn" : ""}
            </span>
          );
        },
      },
      {
        header: "Số lượng tồn",
        accessorKey: "ton_so_luong", sortable: true,
        cell: (i) => {
          const q = i.ton_so_luong;
          if (q <= 0) {
            return <span className="text-[11px] font-medium text-slate-400">Hết tồn</span>;
          }
          if (q <= 10) {
            return <span className="text-[11px] font-medium tabular-nums text-amber-800">{q}</span>;
          }
          return <span className="text-[11px] font-medium tabular-nums text-emerald-800">{q}</span>;
        },
      },
      {
        header: "Đơn vị tính",
        accessorKey: "don_vi_tinh", sortable: true,
        cell: (i) => <span className="text-[11px] font-medium text-slate-500">{i.don_vi_tinh || "—"}</span>,
      },
    ],
    [todayYmd],
  );

  return (
    <>
      {section !== "mov" ? (
        <div className="mt-4">
          <AdvancedDataTable columns={tonCols} data={tons} loading={loading} searchPlaceholder="Tìm trong tồn lô..." />
        </div>
      ) : null}
      {section !== "ton" ? (
        <div className="mt-2">
          <AdvancedDataTable columns={movCols} data={movs} loading={loading} searchPlaceholder="Tìm phiếu..." />
        </div>
      ) : null}
    </>
  );
}
