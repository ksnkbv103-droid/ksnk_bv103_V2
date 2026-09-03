"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getCatalogChangeLookupsAction,
  proposeCatalogChangeAction,
} from "../actions/cssd-catalog-change.actions";
import type { CatalogDoiTuong, CatalogThaoTac } from "@/lib/domain/cssd-catalog-change";

const THAO_TAC: { id: CatalogThaoTac; label: string }[] = [
  { id: "THEM", label: "Thêm" },
  { id: "SUA", label: "Sửa" },
  { id: "XOA", label: "Xóa" },
  { id: "DIEU_CHUYEN", label: "Điều chuyển" },
];

const DOI_TUONG: { id: CatalogDoiTuong; label: string }[] = [
  { id: "CHI_TIET", label: "Thành phần bộ" },
  { id: "BO_DUNG_CU", label: "Bộ dụng cụ" },
  { id: "LOAI_DUNG_CU", label: "Loại dụng cụ" },
];

export function CatalogChangeStaffForm({ canPropose }: { canPropose: boolean }) {
  const [thaoTac, setThaoTac] = useState<CatalogThaoTac>("THEM");
  const [doiTuong, setDoiTuong] = useState<CatalogDoiTuong>("CHI_TIET");
  const [maBo, setMaBo] = useState("");
  const [maBoDen, setMaBoDen] = useState("");
  const [loaiId, setLoaiId] = useState("");
  const [soLuong, setSoLuong] = useState(1);
  const [ten, setTen] = useState("");
  const [ma, setMa] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const [boRows, setBoRows] = useState<Array<{ ma_bo: string; ten_bo: string }>>([]);
  const [loaiRows, setLoaiRows] = useState<Array<{ id: string; ma_loai: string; ten_loai: string }>>([]);

  useEffect(() => {
    void getCatalogChangeLookupsAction().then((r) => {
      if (!r.success) return;
      setBoRows((r.boRows || []) as Array<{ ma_bo: string; ten_bo: string }>);
      setLoaiRows((r.loaiRows || []) as Array<{ id: string; ma_loai: string; ten_loai: string }>);
    });
  }, []);

  if (!canPropose) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Chỉ kỹ thuật viên CSSD/KSNK (quyền sửa quy trình hoặc kho dụng cụ) được gửi đề xuất. Danh mục
        gốc chỉ đổi sau khi tổ trưởng / chủ nhiệm / quản trị duyệt.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await proposeCatalogChangeAction({
      loaiThaoTac: thaoTac,
      doiTuong: thaoTac === "DIEU_CHUYEN" ? "CHI_TIET" : doiTuong,
      lyDo,
      maBo: maBo || undefined,
      maBoDen: maBoDen || undefined,
      loaiDungCuId: loaiId || undefined,
      soLuong,
      ten: ten || undefined,
      ma: ma || undefined,
    });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success("Đã gửi đề xuất — chờ duyệt. Danh mục gốc chưa đổi.");
    setLyDo("");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">Gửi đề xuất (KTV)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Thao tác
          <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={thaoTac} onChange={(e) => setThaoTac(e.target.value as CatalogThaoTac)}>
            {THAO_TAC.map((x) => (
              <option key={x.id} value={x.id}>{x.label}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Đối tượng
          <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={doiTuong} onChange={(e) => setDoiTuong(e.target.value as CatalogDoiTuong)} disabled={thaoTac === "DIEU_CHUYEN"}>
            {DOI_TUONG.map((x) => (
              <option key={x.id} value={x.id}>{x.label}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Mã bộ nguồn
          <input list="cssd-de-xuat-bo" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm uppercase" value={maBo} onChange={(e) => setMaBo(e.target.value.toUpperCase())} placeholder="B01.SET.01" />
        </label>
        {thaoTac === "DIEU_CHUYEN" ? (
          <label className="text-[11px] font-semibold uppercase text-slate-500">
            Bộ đích (trống = kho lẻ)
            <input list="cssd-de-xuat-bo" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm uppercase" value={maBoDen} onChange={(e) => setMaBoDen(e.target.value.toUpperCase())} placeholder="B01.SET.02" />
          </label>
        ) : null}
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Loại dụng cụ
          <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={loaiId} onChange={(e) => setLoaiId(e.target.value)}>
            <option value="">— Chọn loại —</option>
            {loaiRows.map((l) => (
              <option key={l.id} value={l.id}>{l.ma_loai} · {l.ten_loai}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Số lượng
          <input type="number" min={1} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={soLuong} onChange={(e) => setSoLuong(Number(e.target.value) || 1)} />
        </label>
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Mã / tên (thêm mới)
          <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={ma} onChange={(e) => setMa(e.target.value)} placeholder="Mã" />
        </label>
        <label className="text-[11px] font-semibold uppercase text-slate-500">
          Tên hiển thị
          <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm" value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên" />
        </label>
      </div>
      <label className="block text-[11px] font-semibold uppercase text-slate-500">
        Lý do
        <textarea required className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
      </label>
      <button type="submit" disabled={busy} className="h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-50">
        Gửi đề xuất
      </button>
      <datalist id="cssd-de-xuat-bo">
        {boRows.map((b) => (
          <option key={b.ma_bo} value={b.ma_bo}>{b.ten_bo}</option>
        ))}
      </datalist>
    </form>
  );
}
