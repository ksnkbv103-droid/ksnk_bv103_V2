"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listCatalogChangeQueueAction, reviewCatalogChangeAction } from "../actions/cssd-catalog-change.actions";
import { CatalogChangeStaffForm } from "./catalog-change-staff-form";

type Row = {
  id: string;
  loai_thao_tac: string;
  doi_tuong: string;
  trang_thai: string;
  ly_do: string;
  snapshot_truoc: Record<string, unknown> | null;
  snapshot_sau: Record<string, unknown> | null;
  so_luong: number | null;
  nguoi_de_xuat_email: string | null;
  nguoi_duyet_email: string | null;
  created_at: string;
  duyet_at: string | null;
};

const LABEL: Record<string, string> = {
  THEM: "Thêm",
  SUA: "Sửa",
  XOA: "Xóa",
  DIEU_CHUYEN: "Điều chuyển",
  LOAI_DUNG_CU: "Loại",
  BO_DUNG_CU: "Bộ",
  CHI_TIET: "Thành phần",
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối",
};

export function CatalogChangeQueuePanel({ canPropose, canApprove }: { canPropose: boolean; canApprove: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("CHO_DUYET");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listCatalogChangeQueueAction({ trangThai: filter });
    setLoading(false);
    if (!r.success) return toast.error(r.error);
    setRows((r.data || []) as Row[]);
  }, [filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onReview = async (id: string, decision: "DA_DUYET" | "TU_CHOI") => {
    const lyDo = decision === "TU_CHOI" ? window.prompt("Lý do từ chối?") : "";
    if (decision === "TU_CHOI" && lyDo == null) return;
    const r = await reviewCatalogChangeAction(id, decision, lyDo || undefined);
    if (!r.success) return toast.error(r.error);
    toast.success(decision === "DA_DUYET" ? "Đã duyệt và ghi danh mục gốc." : "Đã từ chối — danh mục gốc không đổi.");
    void reload();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-600">
        KTV gửi đề xuất thêm / sửa / xóa / điều chuyển. Tổ trưởng, chủ nhiệm khoa hoặc quản trị duyệt
        mới ghi vào danh mục gốc. Từ chối thì không đụng sổ master.
      </p>
      <CatalogChangeStaffForm canPropose={canPropose} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Hàng đợi duyệt</p>
          <select className="h-9 rounded-lg border border-slate-200 px-2 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="CHO_DUYET">Chờ duyệt</option>
            <option value="DA_DUYET">Đã duyệt</option>
            <option value="TU_CHOI">Từ chối</option>
            <option value="ALL">Tất cả</option>
          </select>
        </div>
        {loading ? <p className="text-xs text-slate-500">Đang tải…</p> : null}
        {!loading && rows.length === 0 ? <p className="text-xs text-slate-500">Không có đề xuất.</p> : null}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold text-slate-800">
                {LABEL[row.loai_thao_tac] || row.loai_thao_tac} · {LABEL[row.doi_tuong] || row.doi_tuong}
                <span className="ml-2 font-medium text-slate-500">{LABEL[row.trang_thai] || row.trang_thai}</span>
              </p>
              <p className="mt-1 text-slate-600">{row.ly_do}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <pre className="overflow-auto rounded bg-white p-2 text-[10px]">{JSON.stringify(row.snapshot_truoc, null, 2)}</pre>
                <pre className="overflow-auto rounded bg-white p-2 text-[10px]">{JSON.stringify(row.snapshot_sau, null, 2)}</pre>
              </div>
              <p className="mt-2 text-slate-500">
                Gửi: {row.nguoi_de_xuat_email || "—"} · Duyệt: {row.nguoi_duyet_email || "chưa"}
              </p>
              {canApprove && row.trang_thai === "CHO_DUYET" ? (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="h-8 rounded-md bg-emerald-700 px-3 text-[11px] font-semibold text-white" onClick={() => void onReview(row.id, "DA_DUYET")}>
                    Duyệt
                  </button>
                  <button type="button" className="h-8 rounded-md border border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-700" onClick={() => void onReview(row.id, "TU_CHOI")}>
                    Từ chối
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
