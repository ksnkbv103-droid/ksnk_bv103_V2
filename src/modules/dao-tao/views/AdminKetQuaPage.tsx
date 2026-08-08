"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { listKetQuaKyThi } from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";

type Row = {
  id: string;
  form_thong_tin: { hoTen?: string; khoaDonVi?: string };
  diem_pct: number | null;
  dat: boolean | null;
  trang_thai: string;
  nop_luc: string | null;
  so_cau: number;
  diem_so: number | null;
  diem_toi_da: number | null;
};

export default function AdminKetQuaPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void listKetQuaKyThi()
      .then((d) => setRows(d as Row[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  return (
    <DaoTaoPage>
      <DaoTaoHeader title="Kết quả thi thật" />
      <DaoTaoPanel className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Họ tên</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Khoa</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Điểm</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Đạt</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Nộp</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className={cn("px-3 py-2.5", T.tableCellTitle)}>
                    {r.form_thong_tin?.hoTen ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {r.form_thong_tin?.khoaDonVi ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {r.diem_so ?? 0}/{r.diem_toi_da ?? r.so_cau} ({r.diem_pct ?? 0}%)
                  </td>
                  <td className="px-3 py-2.5">
                    {r.dat == null ? (
                      "—"
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          r.dat
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700",
                        )}
                      >
                        {r.dat ? "Đạt" : "Chưa đạt"}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">
                    {formatDateTimeVi(r.nop_luc)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                      href={`/dao-tao/ket-qua/${r.id}`}
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                    Chưa có bài thi thật nào được nộp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DaoTaoPanel>
    </DaoTaoPage>
  );
}
