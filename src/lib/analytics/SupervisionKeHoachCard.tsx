"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  sortKeHoachTheoTenKhoa,
  summarizeKeHoach,
  toThangDauThang,
  type KeHoachTienDoRow,
} from "@/lib/analytics/ke-hoach-giam-sat";

type Loai = "VST" | "GSC";

type Props = {
  loai: Loai;
  /** Ngày bất kỳ trong kỳ (denNgay) — tháng lấy từ đây. */
  denNgay: string;
  khoaOptions: { id: string; label: string }[];
  /** Action đọc tiến độ — module truyền vào (lib không import modules). */
  getTienDo: (input: { thang: string; loai: Loai }) => Promise<
    { success: true; rows: KeHoachTienDoRow[]; canEdit: boolean } | { success: false; error: string }
  >;
  /** Action lập/bỏ kế hoạch một khoa — module truyền vào. */
  setKhoa: (input: { thang: string; loai: Loai; khoaId: string; active: boolean }) => Promise<
    { success: true } | { success: false; error: string }
  >;
};

/** Thẻ «Kế hoạch giám sát tháng»: tiến độ số phiên / chỉ tiêu theo khoa; admin/KSNK lập hoặc bỏ kế hoạch. */
export function SupervisionKeHoachCard({ loai, denNgay, khoaOptions, getTienDo, setKhoa }: Props) {
  const thang = useMemo(() => toThangDauThang(denNgay), [denNgay]);
  const [rows, setRows] = useState<KeHoachTienDoRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [khoaId, setKhoaId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!thang) return;
    setLoading(true);
    const res = await getTienDo({ thang, loai });
    if (res.success) {
      setRows(res.rows);
      setCanEdit(res.canEdit);
      setError(null);
    } else setError(res.error);
    setLoading(false);
  }, [thang, loai, getTienDo]);

  useEffect(() => {
    void load();
  }, [load]);

  const tenKhoa = useMemo(() => new Map(khoaOptions.map((k) => [k.id, k.label])), [khoaOptions]);
  const rowsXep = useMemo(() => sortKeHoachTheoTenKhoa(rows, tenKhoa), [rows, tenKhoa]);
  const sum = summarizeKeHoach(rows);
  const planned = new Set(rows.map((r) => r.khoa_id));

  const change = async (id: string, active: boolean) => {
    if (!thang || !id) return;
    setBusy(true);
    const res = await setKhoa({ thang, loai, khoaId: id, active });
    if (!res.success) setError(res.error);
    else {
      setKhoaId("");
      await load();
    }
    setBusy(false);
  };

  if (!thang) return null;
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="bv103-type-section text-slate-800">Kế hoạch giám sát tháng {thang.slice(5, 7)}/{thang.slice(0, 4)}</h3>
        {rows.length > 0 ? (
          <span className="text-xs tabular-nums text-slate-600">
            Đạt {sum.dat}/{sum.tong} khoa · chỉ tiêu {rows[0].chi_tieu} phiên/khoa
          </span>
        ) : null}
      </header>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {loading ? (
        <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-500">Chưa có kế hoạch</p>
      ) : (
        <ul className="space-y-1">
          {rowsXep.map((r) => (
            <li key={r.khoa_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 font-medium leading-snug">{tenKhoa.get(r.khoa_id) ?? r.khoa_id}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                {r.so_phien}/{r.chi_tieu}
                <span className={`rounded px-1.5 py-0.5 ${r.dat ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  {r.dat ? "Đạt" : "Chưa đạt"}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void change(r.khoa_id, false)}
                    className="touch-manipulation text-slate-500 underline disabled:opacity-50"
                  >
                    Bỏ
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <select
            value={khoaId}
            onChange={(e) => setKhoaId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            aria-label="Chọn khoa lập kế hoạch"
          >
            <option value="">Chọn khoa để lập kế hoạch…</option>
            {khoaOptions
              .filter((k) => !planned.has(k.id))
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={busy || !khoaId}
            onClick={() => void change(khoaId, true)}
            className="touch-manipulation rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Lập kế hoạch
          </button>
        </div>
      ) : null}
    </section>
  );
}
