"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Layers, Loader2, PackagePlus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import DungCuChiTietFormModal from "./dung-cu-chi-tiet-form-modal";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";
import {
  appendChiTietIssueNoteAction,
  getBoRefsByLoaiAction,
  getBoDungCuChiTietPreviewAction,
} from "../actions/bo-dung-cu-chi-tiet-read.actions";
import type {
  BoRefByLoai,
  BoDungCuChiTietPreviewRow,
} from "../actions/bo-dung-cu-chi-tiet.types";

type Props = {
  /** `null` = chưa chọn bộ */
  selectedBoId: string | null;
  selectedTenBo?: string | null;
  selectedMaBo?: string | null;
  boOptions: { id: string; ma_bo: string | null; ten_bo: string | null }[];
  loaiOptions: { id: string; ma_danh_muc: string | null; ten_danh_muc: string | null }[];
  onChanged?: () => void;
};

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Bảng đọc nhanh thành phần bộ khi chọn một dòng ở Danh mục bộ dụng cụ. */
function toFormRow(r: BoDungCuChiTietPreviewRow): DungCuChiTietTableRow {
  const tl =
    r.trong_luong == null || r.trong_luong === "" || typeof r.trong_luong === "string" || typeof r.trong_luong === "number"
      ? r.trong_luong
      : String(r.trong_luong);
  return {
    id: r.id,
    ma_chi_tiet: r.ma_chi_tiet,
    ten_chi_tiet: r.ten_chi_tiet,
    ten_dung_cu_le: r.ten_dung_cu_le,
    bo_dung_cu_id: r.bo_dung_cu_id,
    loai_dung_cu_id: r.loai_dung_cu_id,
    so_luong: r.so_luong,
    max_suds_count: r.max_suds_count,
    trong_luong: tl ?? null,
    ghi_chu: r.ghi_chu,
    is_active: r.is_active !== false,
    bo_dung_cu: null,
    loai_dung_cu: r.loai_dung_cu_id
      ? {
          id: r.loai_dung_cu_id,
          ma_danh_muc: r.loai_dung_cu?.ma_danh_muc ?? null,
          ten_danh_muc: r.loai_dung_cu?.ten_danh_muc ?? null,
        }
      : null,
    ma_qr_mau: null,
  };
}

export function BoDungCuChiTietPanel({
  selectedBoId,
  selectedTenBo,
  selectedMaBo,
  boOptions,
  loaiOptions,
  onChanged,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BoDungCuChiTietPreviewRow[]>([]);
  const [selectedChiTietId, setSelectedChiTietId] = useState<string | null>(null);
  const [relatedBos, setRelatedBos] = useState<BoRefByLoai[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DungCuChiTietTableRow | null>(null);

  useEffect(() => {
    if (!selectedBoId) {
      setRows([]);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const r = await getBoDungCuChiTietPreviewAction(selectedBoId);
      if (!alive) return;
      setRows(r.success ? r.data : []);
      setSelectedChiTietId(null);
      setRelatedBos([]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [selectedBoId]);

  const selectedChiTiet = selectedChiTietId
    ? rows.find((r) => r.id === selectedChiTietId) || null
    : null;

  useEffect(() => {
    if (!selectedChiTiet?.loai_dung_cu?.ma_danh_muc && !selectedChiTietId) {
      setRelatedBos([]);
      return;
    }
    const loaiId = String(selectedChiTiet?.loai_dung_cu_id || "").trim();
    if (!loaiId) {
      setRelatedBos([]);
      return;
    }
    let alive = true;
    (async () => {
      setRelLoading(true);
      const r = await getBoRefsByLoaiAction(loaiId, selectedBoId);
      if (!alive) return;
      setRelatedBos(r.success ? r.data : []);
      setRelLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [selectedChiTietId, selectedBoId, selectedChiTiet]);

  const titleBit = selectedMaBo || selectedTenBo ? ` (${selectedMaBo || ""}${selectedMaBo && selectedTenBo ? " — " : ""}${selectedTenBo || ""})` : "";

  return (
    <section
      className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-sm"
      aria-label="Dụng cụ chi tiết trong bộ đã chọn"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[#026f17]">
          <Layers className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-[11px] font-black uppercase tracking-widest">
            Dụng cụ chi tiết trong bộ{titleBit}
          </h3>
        </div>
        <Link
          href="/quan-tri-he-thong/danh-muc/dung-cu/chi-tiet"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 underline-offset-2 hover:underline"
        >
          Mở trang quản trị chi tiết <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {!selectedBoId ? (
        <p className="text-center text-sm font-medium text-slate-500">
          Chọn một <strong className="text-slate-700">bộ dụng cụ</strong> trong bảng phía trên để xem danh sách thành phần.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" aria-label="Đang tải" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-slate-500">
          Bộ này chưa có dòng chi tiết trong <code className="rounded bg-slate-100 px-1 text-xs">dm_bo_dung_cu_chi_tiet</code>. Thêm tại trang Dụng cụ chi tiết.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-800"
            >
              <PackagePlus className="h-3.5 w-3.5" /> Bổ sung dụng cụ vào bộ này
            </button>
            <button
              type="button"
              disabled={!selectedChiTiet}
              onClick={() => {
                if (!selectedChiTiet) return;
                setEditing(toFormRow(selectedChiTiet));
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-sky-800 disabled:opacity-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Điều chuyển / chỉnh thông tin dụng cụ đã chọn
            </button>
            <button
              type="button"
              disabled={!selectedChiTiet}
              onClick={async () => {
                if (!selectedChiTiet) return;
                const note = window.prompt("Mô tả tình trạng hỏng (tùy chọn):", "") || "";
                const r = await appendChiTietIssueNoteAction({
                  chiTietId: selectedChiTiet.id,
                  issueType: "HONG",
                  note,
                });
                if (!r.success) return toast.error(r.error || "Không ghi nhận được báo hỏng.");
                toast.success("Đã ghi nhận báo hỏng vào ghi chú dụng cụ.");
                onChanged?.();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-800 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Báo hỏng
            </button>
            <button
              type="button"
              disabled={!selectedChiTiet}
              onClick={async () => {
                if (!selectedChiTiet) return;
                const note = window.prompt("Mô tả mất / thất lạc (tùy chọn):", "") || "";
                const r = await appendChiTietIssueNoteAction({
                  chiTietId: selectedChiTiet.id,
                  issueType: "MAT",
                  note,
                });
                if (!r.success) return toast.error(r.error || "Không ghi nhận được báo mất.");
                toast.success("Đã ghi nhận báo mất vào ghi chú dụng cụ.");
                onChanged?.();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-800 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Báo mất
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <th className="p-3">Mã chi tiết</th>
                <th className="p-3">Tên</th>
                <th className="p-3">Loại DC</th>
                <th className="p-3 w-16 text-center">SL</th>
                <th className="p-3 w-20 text-center">Chu kỳ tối đa</th>
                <th className="p-3 w-24 text-center">Trọng lượng</th>
                <th className="p-3">Ghi chú</th>
                <th className="p-3 w-24">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedChiTietId((cur) => (cur === r.id ? null : r.id))}
                  className={`${r.is_active === false ? "opacity-60" : ""} ${selectedChiTietId === r.id ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50"} cursor-pointer`}
                >
                  <td className="p-3 font-mono text-xs font-bold text-indigo-700">{r.ma_chi_tiet || "—"}</td>
                  <td className="p-3 text-xs font-semibold text-slate-800">{clip(r.ten_chi_tiet || r.ten_dung_cu_le, 80)}</td>
                  <td className="p-3 text-xs text-slate-600">
                    {r.loai_dung_cu?.ma_danh_muc ? (
                      <span>
                        <span className="font-bold">{r.loai_dung_cu.ma_danh_muc}</span>
                        {r.loai_dung_cu.ten_danh_muc ? ` — ${clip(r.loai_dung_cu.ten_danh_muc, 40)}` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-center text-xs font-bold">{r.so_luong ?? "—"}</td>
                  <td className="p-3 text-center text-xs">{r.max_suds_count ?? "—"}</td>
                  <td className="p-3 text-center text-xs">{r.trong_luong != null && r.trong_luong !== "" ? String(r.trong_luong) : "—"}</td>
                  <td className="p-3 text-xs text-slate-500">{clip(r.ghi_chu, 64)}</td>
                  <td className="p-3 text-[10px] font-bold uppercase text-slate-600">
                    {r.is_active === false ? "Ngưng" : "Có"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {selectedChiTiet ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                Loại dụng cụ đã chọn:{" "}
                <span className="text-[#026f17]">
                  {selectedChiTiet.loai_dung_cu?.ma_danh_muc || "—"}
                  {selectedChiTiet.loai_dung_cu?.ten_danh_muc
                    ? ` — ${selectedChiTiet.loai_dung_cu.ten_danh_muc}`
                    : ""}
                </span>
              </p>
              <p className="mt-2 text-[10px] text-slate-600">
                Các bộ khác đang chứa loại này:
              </p>
              {relLoading ? (
                <p className="mt-2 text-[10px] text-slate-500">Đang tải liên kết bộ...</p>
              ) : relatedBos.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {relatedBos.map((b) => (
                    <span
                      key={b.id}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700"
                    >
                      {b.ma_bo || "—"} {b.ten_bo ? `· ${clip(b.ten_bo, 32)}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-slate-500">
                  Chưa thấy bộ khác chứa loại này.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">
              Chọn một dòng dụng cụ để xem liên kết loại và các bộ liên quan.
            </p>
          )}
        </div>
      )}

      <DungCuChiTietFormModal
        key={editing?.id || "create-by-bo"}
        open={modalOpen}
        initialRow={editing}
        presetBoId={editing ? undefined : selectedBoId}
        boOptions={boOptions}
        loaiOptions={loaiOptions}
        loadingBo={false}
        loadingLoai={false}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          onChanged?.();
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}
