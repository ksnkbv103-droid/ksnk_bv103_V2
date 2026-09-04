"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { formatKhoaCompactLabel, formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { allocateProceduralSetAction } from "../actions/bo-dung-cu.actions";

export type AllocationRow = {
  id: string;
  khoa_phong_id: string;
  so_luong_co_so: number;
  so_luong_hien_tai: number;
  khoa_phong?: { ten_khoa: string; ma_khoa: string };
};

type Props = {
  selectedBoId: string;
  allocations: AllocationRow[];
  departments: { id: string; ten_khoa: string; ma_khoa: string }[];
  loading: boolean;
  selectedDeptId: string;
  allocQty: number;
  onSelectedDeptId: (id: string) => void;
  onAllocQty: (n: number) => void;
  onRefresh: () => void;
  onChanged?: () => void;
};

/** Phân bổ / tồn khoa — 1 hàng form + 1 CTA chính. */
export function BoDungCuChiTietAllocSection({
  selectedBoId,
  allocations,
  departments,
  loading,
  selectedDeptId,
  allocQty,
  onSelectedDeptId,
  onAllocQty,
  onRefresh,
  onChanged,
}: Props) {
  const [busy, setBusy] = React.useState(false);

  const runAllocate = async (khoaPhongId: string, quantity: number, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const r = await allocateProceduralSetAction({
        boDungCuId: selectedBoId,
        khoaPhongId,
        quantity,
      });
      if (r.success) {
        onRefresh();
        onChanged?.();
        return true;
      }
      toast.error("Lỗi phân bổ: " + r.error);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={C.sectionGap} aria-label="Phân bổ khoa phòng">
      <div className="rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-medium text-slate-500">
          Phân bổ cơ số theo khoa — một thao tác chính trên một hàng.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <label className={C.formLabel}>Chọn khoa phân bổ</label>
            <select
              value={selectedDeptId}
              onChange={(e) => onSelectedDeptId(e.target.value)}
              className="h-10 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              <option value="">— Chọn khoa phòng —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatKhoaPickerLabel({ ma_khoa: d.ma_khoa, ten_khoa: d.ten_khoa })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={C.formLabel}>Cơ số</label>
            <input
              type="number"
              min={1}
              value={allocQty}
              onChange={(e) => onAllocQty(parseInt(e.target.value, 10) || 1)}
              className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
            />
          </div>
          <button
            type="button"
            disabled={busy || loading}
            onClick={async () => {
              if (!selectedDeptId) {
                toast.error("Vui lòng chọn khoa phòng.");
                return;
              }
              const ok = await runAllocate(selectedDeptId, allocQty);
              if (ok) toast.success("Đã cập nhật phân bổ thành công.");
            }}
            className={C.ctaPrimary}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cập nhật phân bổ
          </button>
        </div>
      </div>

      {loading || busy ? (
        <div className="flex justify-center py-8 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải phân bổ" />
        </div>
      ) : allocations.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          Chưa có phân bổ — chọn khoa phía trên rồi bấm «Cập nhật phân bổ».
        </p>
      ) : (
        <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
          <table className="w-full min-w-[500px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-[0_1px_0_rgb(226_232_240)]">
              <tr>
                <th className="p-3">Khoa</th>
                <th className="w-28 p-3 text-center">Cơ số</th>
                <th className="w-28 p-3 text-center">Tồn hiện tại</th>
                <th className="w-24 p-3 text-center">Chênh</th>
                <th className="w-40 p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.map((a) => {
                const gap = a.so_luong_hien_tai - a.so_luong_co_so;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="bv103-type-label p-3 font-mono font-semibold text-rose-700">
                      {formatKhoaCompactLabel({
                        ma_khoa: a.khoa_phong?.ma_khoa,
                        ten_khoa: a.khoa_phong?.ten_khoa,
                      })}
                    </td>
                    <td className="p-3 text-center text-xs font-semibold text-slate-700">
                      {a.so_luong_co_so}
                    </td>
                    <td className="bv103-type-label p-3 text-center font-semibold text-emerald-700">
                      {a.so_luong_hien_tai}
                    </td>
                    <td
                      className={`bv103-type-label p-3 text-center font-semibold ${
                        gap < 0 ? "text-rose-600" : gap > 0 ? "text-amber-600" : "text-slate-500"
                      }`}
                    >
                      {gap > 0 ? `+${gap}` : gap}
                    </td>
                    <td className="flex justify-end gap-1.5 p-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAllocate(a.khoa_phong_id, a.so_luong_co_so + 1)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAllocate(
                            a.khoa_phong_id,
                            a.so_luong_co_so - 1,
                            a.so_luong_co_so <= 1
                              ? "Thu hồi toàn bộ phân bổ cho khoa này?"
                              : undefined,
                          )
                        }
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAllocate(
                            a.khoa_phong_id,
                            0,
                            "Xác nhận thu hồi toàn bộ phân bổ của khoa này?",
                          )
                        }
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Thu hồi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTableShell>
      )}
    </section>
  );
}
