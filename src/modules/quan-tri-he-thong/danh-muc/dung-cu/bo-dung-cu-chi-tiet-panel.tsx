"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Layers, Loader2, PackagePlus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import DungCuChiTietFormModal from "./dung-cu-chi-tiet-form-modal";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import { formatKhoaCompactLabel, formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  getBoRefsByLoaiAction,
  getBoDungCuChiTietPreviewAction,
} from "../actions/bo-dung-cu-chi-tiet-read.actions";
import {
  getBoDungCuAllocationsAction,
  allocateProceduralSetAction,
  getKhoaPhongOptionsForBoAction,
} from "../actions/bo-dung-cu.actions";
import type {
  BoRefByLoai,
  BoDungCuChiTietPreviewRow,
} from "../actions/bo-dung-cu-chi-tiet.types";

type AllocationRow = {
  id: string;
  khoa_phong_id: string;
  so_luong_co_so: number;
  so_luong_hien_tai: number;
  khoa_phong?: { ten_khoa: string; ma_khoa: string };
};

type Props = {
  /** `null` = chưa chọn bộ */
  selectedBoId: string | null;
  selectedTenBo?: string | null;
  selectedMaBo?: string | null;
  phan_loai_bo?: string | null;
  boOptions: { id: string; ma_bo: string | null; ten_bo: string | null }[];
  loaiOptions: { id: string; ma_danh_muc: string | null; ten_danh_muc: string | null }[];
  onChanged?: () => void;
};

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

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
  phan_loai_bo,
  boOptions,
  loaiOptions,
  onChanged,
}: Props) {
  const { isAdmin } = useModulePermission("DC_LE");
  const canWriteMaster = isAdmin;
  const [activeTab, setActiveTab] = useState<"components" | "allocations">("components");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BoDungCuChiTietPreviewRow[]>([]);
  const [selectedChiTietId, setSelectedChiTietId] = useState<string | null>(null);
  const [relatedBos, setRelatedBos] = useState<BoRefByLoai[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DungCuChiTietTableRow | null>(null);

  // Allocations States
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; ten_khoa: string; ma_khoa: string }[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [allocQty, setAllocQty] = useState<number>(1);

  const fetchAllocations = async () => {
    if (!selectedBoId) return;
    setLoadingAllocations(true);
    const [allocRes, deptRes] = await Promise.all([
      getBoDungCuAllocationsAction(selectedBoId),
      getKhoaPhongOptionsForBoAction(),
    ]);
    if (allocRes.success) setAllocations((allocRes.data || []) as AllocationRow[]);
    if (deptRes.success) setDepartments((deptRes.data || []) as typeof departments);
    setLoadingAllocations(false);
  };

  useEffect(() => {
    setActiveTab("components");
    if (!selectedBoId) {
      setRows([]);
      setAllocations([]);
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
      className="bv103-layer-panel bv103-pad-panel"
      aria-label="Dụng cụ chi tiết trong bộ đã chọn"
    >
      <div className="mb-[var(--bv103-space-3)] flex flex-col gap-[var(--bv103-space-2)] border-b border-slate-100 pb-[var(--bv103-space-3)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          <Layers className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className={C.panelTitle}>
            Quản lý thành phần bộ{titleBit}
          </h3>
        </div>
        <p className="text-[11px] font-medium text-emerald-800">
          Thành phần của bộ đang chọn — không cần sang trang khác.
        </p>
      </div>

      {!selectedBoId ? (
        <div className="text-center py-12">
          <Layers className="mx-auto text-slate-300 mb-3 animate-pulse" size={32} />
          <p className={C.innerTableHead}>
            Chọn một bộ dụng cụ trong bảng phía trên để quản lý chi tiết
          </p>
        </div>
      ) : (
        <div className="space-y-[var(--bv103-space-3)]">
          {/* Tab Selection */}
          {phan_loai_bo === "THU_THUAT" && (
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("components")}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all ${
                  activeTab === "components"
                    ? "bg-white text-[var(--primary)] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Thành phần dụng cụ ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("allocations");
                  fetchAllocations();
                }}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all ${
                  activeTab === "allocations"
                    ? "bg-white text-[var(--primary)] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Phân bổ cơ số khoa ({allocations.length})
              </button>
            </div>
          )}

          {activeTab === "components" ? (
            loading ? (
              <div className="flex justify-center py-12 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" aria-label="Đang tải" />
              </div>
            ) : (
              <div className={C.sectionGap}>
                <div className="flex flex-wrap items-center gap-2">
                  {canWriteMaster ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 hover:opacity-90 transition-all active:scale-95"
                    >
                      <PackagePlus className="h-3.5 w-3.5" /> Bổ sung dụng cụ vào bộ này
                    </button>
                  ) : (
                    <Link
                      href={cssdSuCoInstrumentHref({
                        type: "INSTRUMENT_SET_RECONCILE",
                        ma: selectedMaBo,
                      })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-amber-900 hover:opacity-90 transition-all active:scale-95"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Lập phiếu rà soát
                    </Link>
                  )}
                  {canWriteMaster ? (
                  <button
                    type="button"
                    disabled={!selectedChiTiet}
                    onClick={() => {
                      if (!selectedChiTiet) return;
                      setEditing(toFormRow(selectedChiTiet));
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-sky-800 disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> Điều chuyển / chỉnh thông tin dụng cụ đã chọn
                  </button>
                  ) : null}
                  <Link
                    href={cssdSuCoInstrumentHref({
                      type: "INSTRUMENT_BROKEN",
                      ma: selectedMaBo,
                      loai: selectedChiTiet?.loai_dung_cu_id,
                      chiTiet: selectedChiTiet?.id,
                    })}
                    className={`inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-800 hover:opacity-90 transition-all active:scale-95 ${!selectedChiTiet ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Báo hỏng (sự cố)
                  </Link>
                  <Link
                    href={cssdSuCoInstrumentHref({
                      type: "INSTRUMENT_MISSING",
                      ma: selectedMaBo,
                      loai: selectedChiTiet?.loai_dung_cu_id,
                      chiTiet: selectedChiTiet?.id,
                    })}
                    className={`inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800 hover:opacity-90 transition-all active:scale-95 ${!selectedChiTiet ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Báo mất (sự cố)
                  </Link>
                </div>

                {rows.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">
                    Bộ này chưa có dòng chi tiết trong <code className="rounded bg-slate-100 px-1 text-xs">cssd_dm_bo_dung_cu_chi_tiet</code>.
                  </p>
                ) : (
                <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-medium text-slate-500">
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
                          <td className="p-3 font-mono bv103-type-label font-semibold text-indigo-700">{r.ma_chi_tiet || "—"}</td>
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
                          <td className="p-3 text-center bv103-type-label font-semibold">{r.so_luong ?? "—"}</td>
                          <td className="p-3 text-center text-xs">{r.max_suds_count ?? "—"}</td>
                          <td className="p-3 text-center text-xs">{r.trong_luong != null && r.trong_luong !== "" ? String(r.trong_luong) : "—"}</td>
                          <td className="p-3 text-xs text-slate-500">{clip(r.ghi_chu, 64)}</td>
                          <td className="p-3 text-[11px] font-medium text-slate-500">
                            {r.is_active === false ? "Ngưng" : "Có"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResponsiveTableShell>
                )}

                {selectedChiTiet ? (
                  <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 p-6 space-y-[var(--bv103-space-3)]">
                    <p className={C.innerTableHead}>
                      Loại dụng cụ đang chọn:{" "}
                      <span className="text-[var(--primary)]">
                        {selectedChiTiet.loai_dung_cu?.ma_danh_muc || "—"}
                        {selectedChiTiet.loai_dung_cu?.ten_danh_muc
                          ? ` — ${selectedChiTiet.loai_dung_cu.ten_danh_muc}`
                          : ""}
                      </span>
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <Link
                        href={cssdSuCoInstrumentHref({
                          type: "INSTRUMENT_BROKEN",
                          ma: selectedMaBo,
                          loai: selectedChiTiet.loai_dung_cu_id,
                          chiTiet: selectedChiTiet.id,
                        })}
                        className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
                      >
                        Báo hỏng (sự cố)
                      </Link>
                      <Link
                        href={cssdSuCoInstrumentHref({
                          type: "INSTRUMENT_MISSING",
                          ma: selectedMaBo,
                          loai: selectedChiTiet.loai_dung_cu_id,
                          chiTiet: selectedChiTiet.id,
                        })}
                        className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
                      >
                        Báo mất (sự cố)
                      </Link>
                      <Link
                        href={cssdSuCoInstrumentHref({
                          type: "INSTRUMENT_REPLENISH",
                          ma: selectedMaBo,
                          loai: selectedChiTiet.loai_dung_cu_id,
                          chiTiet: selectedChiTiet.id,
                        })}
                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-[var(--primary)] text-[11px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
                      >
                        Bổ sung (sự cố)
                      </Link>
                      <Link
                        href={cssdSuCoInstrumentHref({
                          type: "INSTRUMENT_TRANSFER",
                          ma: selectedMaBo,
                          loai: selectedChiTiet.loai_dung_cu_id,
                          chiTiet: selectedChiTiet.id,
                        })}
                        className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors"
                      >
                        Điều chuyển (sự cố)
                      </Link>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hỏng / Mất / Bổ sung / Điều chuyển chỉ thực hiện tại trang Báo cáo sự cố CSSD (một cửa sổ giao dịch).
                    </p>

                    <p className="text-[11px] text-slate-600 font-medium mt-2">
                      Các bộ khác đang chứa loại này:
                    </p>
                    {relLoading ? (
                      <p className="text-[11px] text-slate-500">Đang tải liên kết bộ...</p>
                    ) : relatedBos.length ? (
                      <div className="flex flex-wrap gap-2">
                        {relatedBos.map((b) => (
                          <span
                            key={b.id}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            {b.ma_bo || "—"} {b.ten_bo ? `· ${clip(b.ten_bo, 32)}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Chưa thấy bộ khác chứa loại này.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Chọn một dòng dụng cụ để xem liên kết loại và các bộ liên quan.
                  </p>
                )}
              </div>
            )
          ) : (
            <div className={C.sectionGap}>
              <div className="bg-slate-50 border border-slate-100 rounded-[var(--radius-shell)] p-6 flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 ml-1">Chọn khoa phân bổ</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs min-w-[200px]"
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
                  <label className="text-[11px] font-medium text-slate-400 ml-1">Cơ số phân bổ</label>
                  <input
                    type="number"
                    min="1"
                    value={allocQty}
                    onChange={(e) => setAllocQty(parseInt(e.target.value) || 1)}
                    className="h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs w-28"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedDeptId) return toast.error("Vui lòng chọn khoa phòng.");
                    setLoadingAllocations(true);
                    const r = await allocateProceduralSetAction({
                      boDungCuId: selectedBoId!,
                      khoaPhongId: selectedDeptId,
                      quantity: allocQty,
                    });
                    if (r.success) {
                      toast.success("Đã cập nhật phân bổ thành công.");
                      fetchAllocations();
                      onChanged?.();
                    } else {
                      toast.error("Lỗi phân bổ: " + r.error);
                    }
                    setLoadingAllocations(false);
                  }}
                  className={C.ctaPrimary}
                >
                  Cập nhật phân bổ
                </button>
              </div>

              {loadingAllocations ? (
                <div className="flex justify-center py-8 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : allocations.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  Chưa có phân bổ cơ số khoa phòng nào cho bộ này.
                </p>
              ) : (
                <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
                  <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-medium text-slate-500">
                        <th className="p-3">Khoa</th>
                        <th className="p-3 text-center w-28">Cơ số phân bổ</th>
                        <th className="p-3 text-center w-28">Tồn hiện tại</th>
                        <th className="p-3 text-center w-24">Chênh</th>
                        <th className="p-3 text-right w-40">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocations.map((a) => {
                        const gap = a.so_luong_hien_tai - a.so_luong_co_so;
                        return (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono bv103-type-label font-semibold text-rose-700">
                            {formatKhoaCompactLabel({
                              ma_khoa: a.khoa_phong?.ma_khoa,
                              ten_khoa: a.khoa_phong?.ten_khoa,
                            })}
                          </td>
                          <td className="p-3 text-center text-xs font-semibold text-slate-700">{a.so_luong_co_so}</td>
                          <td className="p-3 text-center bv103-type-label font-semibold text-emerald-700">{a.so_luong_hien_tai}</td>
                          <td className={`p-3 text-center bv103-type-label font-semibold ${gap < 0 ? "text-rose-600" : gap > 0 ? "text-amber-600" : "text-slate-500"}`}>
                            {gap > 0 ? `+${gap}` : gap}
                          </td>
                          <td className="p-3 text-right flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await allocateProceduralSetAction({
                                  boDungCuId: selectedBoId!,
                                  khoaPhongId: a.khoa_phong_id,
                                  quantity: a.so_luong_co_so + 1,
                                });
                                if (r.success) { fetchAllocations(); onChanged?.(); }
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 rounded-lg"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (a.so_luong_co_so <= 1) {
                                  if (!window.confirm("Thu hồi toàn bộ phân bổ cho khoa này?")) return;
                                }
                                const r = await allocateProceduralSetAction({
                                  boDungCuId: selectedBoId!,
                                  khoaPhongId: a.khoa_phong_id,
                                  quantity: a.so_luong_co_so - 1,
                                });
                                if (r.success) { fetchAllocations(); onChanged?.(); }
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 rounded-lg"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm("Xác nhận thu hồi toàn bộ phân bổ của khoa này?")) return;
                                const r = await allocateProceduralSetAction({
                                  boDungCuId: selectedBoId!,
                                  khoaPhongId: a.khoa_phong_id,
                                  quantity: 0,
                                });
                                if (r.success) { fetchAllocations(); onChanged?.(); }
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] uppercase px-2.5 py-1 rounded-lg"
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
            </div>
          )}
        </div>
      )}

      {canWriteMaster ? (
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
      ) : null}
    </section>
  );
}
