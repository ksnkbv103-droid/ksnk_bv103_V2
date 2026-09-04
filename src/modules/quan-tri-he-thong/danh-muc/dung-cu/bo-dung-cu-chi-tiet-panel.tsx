"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  Combine,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import DungCuChiTietFormModal from "./dung-cu-chi-tiet-form-modal";
import {
  BoDungCuChiTietAllocSection,
  type AllocationRow,
} from "./bo-dung-cu-chi-tiet-alloc-section";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  getBoRefsByLoaiAction,
  getBoDungCuChiTietPreviewAction,
} from "../actions/bo-dung-cu-chi-tiet-read.actions";
import {
  getBoDungCuAllocationsAction,
  getKhoaPhongOptionsForBoAction,
} from "../actions/bo-dung-cu.actions";
import { mergeDuplicateBomLinesAction } from "../actions/dung-cu-chi-tiet.actions";
import type {
  BoRefByLoai,
  BoDungCuChiTietPreviewRow,
} from "../actions/bo-dung-cu-chi-tiet.types";

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
    r.trong_luong == null ||
    r.trong_luong === "" ||
    typeof r.trong_luong === "string" ||
    typeof r.trong_luong === "number"
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

  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; ten_khoa: string; ma_khoa: string }[]
  >([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [allocQty, setAllocQty] = useState<number>(1);
  const [mergingBom, setMergingBom] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = moreMenuRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const reloadChiTiet = async () => {
    if (!selectedBoId) return;
    setLoading(true);
    const r = await getBoDungCuChiTietPreviewAction(selectedBoId);
    setRows(r.success ? r.data : []);
    setSelectedChiTietId(null);
    setLoading(false);
  };

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

  const titleBit =
    selectedMaBo || selectedTenBo
      ? ` (${selectedMaBo || ""}${selectedMaBo && selectedTenBo ? " — " : ""}${selectedTenBo || ""})`
      : "";

  if (!selectedBoId) return null;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEditSelected = () => {
    if (!selectedChiTiet) return;
    setEditing(toFormRow(selectedChiTiet));
    setModalOpen(true);
  };

  const runMergeDuplicates = async () => {
    setMoreOpen(false);
    if (!selectedBoId) return;
    if (
      !window.confirm(
        "Gộp các dòng trùng loại trên bộ này? Số lượng sẽ được cộng tổng vào một dòng; các dòng thừa sẽ ngưng (is_active=false).",
      )
    ) {
      return;
    }
    setMergingBom(true);
    try {
      const r = await mergeDuplicateBomLinesAction(selectedBoId);
      if (!r.success) {
        toast.error(r.error || "Gộp thất bại.");
        return;
      }
      const soft = r.rowsSoftDeleted ?? 0;
      const groups = r.mergedGroups ?? 0;
      if (groups === 0) {
        toast.message("Không có dòng trùng loại để gộp.", { description: r.note });
      } else {
        toast.success(`Đã gộp ${groups} nhóm; ngưng ${soft} dòng trùng.`);
      }
      await reloadChiTiet();
      onChanged?.();
    } finally {
      setMergingBom(false);
    }
  };

  return (
    <section
      className="flex min-h-0 flex-col gap-[var(--bv103-space-3)]"
      aria-label="Dụng cụ chi tiết trong bộ đã chọn"
    >
      {/* —— Header —— */}
      <header className="flex shrink-0 flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-[var(--primary)]">
          <Layers className="h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h3 className={C.panelTitle}>Quản lý thành phần bộ{titleBit}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-emerald-800">
              1 bộ × 1 loại = 1 dòng · chỉnh tại đây, không sang trang khác.
            </p>
          </div>
        </div>

        {phan_loai_bo === "THU_THUAT" ? (
          <div className="flex w-fit gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("components")}
              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                activeTab === "components"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Thành phần ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("allocations");
                void fetchAllocations();
              }}
              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                activeTab === "allocations"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Phân bổ khoa ({allocations.length})
            </button>
          </div>
        ) : null}
      </header>

      {activeTab === "components" ? (
        loading ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Đang tải" />
          </div>
        ) : (
          <div className={`${C.sectionGap} min-h-0`}>
            {/* —— Section: BOM toolbar — 1 hàng, 1 CTA chính —— */}
            <div className="flex flex-wrap items-center gap-2">
              {canWriteMaster ? (
                <button type="button" onClick={openCreate} className={C.ctaEmerald}>
                  <PackagePlus className="h-3.5 w-3.5" /> Bổ sung vào bộ
                </button>
              ) : (
                <Link
                  href={cssdSuCoInstrumentHref({
                    type: "INSTRUMENT_SET_RECONCILE",
                    ma: selectedMaBo,
                  })}
                  className={C.ctaAmber}
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Lập phiếu rà soát
                </Link>
              )}

              {canWriteMaster ? (
                <button
                  type="button"
                  disabled={!selectedChiTiet}
                  onClick={openEditSelected}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Chỉnh dòng
                </button>
              ) : null}

              {/* Secondary + nguy hiểm → menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-all hover:bg-slate-50"
                >
                  Thêm{" "}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 z-20 mt-1 min-w-[13rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                  >
                    {canWriteMaster ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={mergingBom || !selectedBoId}
                        onClick={() => void runMergeDuplicates()}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                      >
                        {mergingBom ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Combine className="h-3.5 w-3.5" />
                        )}
                        Gộp dòng trùng loại
                      </button>
                    ) : null}

                    <div className="my-1 border-t border-slate-100" role="separator" />
                    <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Biến động dụng cụ (3 cửa)
                    </p>
                    <Link
                      role="menuitem"
                      href={cssdSuCoInstrumentHref({
                        type: "INSTRUMENT_PHYSICAL",
                        ma: selectedMaBo,
                        loai: selectedChiTiet?.loai_dung_cu_id,
                        chiTiet: selectedChiTiet?.id,
                      })}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-rose-800 hover:bg-rose-50 ${
                        !selectedChiTiet ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Hỏng/Mất
                    </Link>
                    <Link
                      role="menuitem"
                      href={cssdSuCoInstrumentHref({
                        type: "INSTRUMENT_MOVE",
                        ma: selectedMaBo,
                        loai: selectedChiTiet?.loai_dung_cu_id,
                        chiTiet: selectedChiTiet?.id,
                      })}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-sky-800 hover:bg-sky-50 ${
                        !selectedChiTiet ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      Chuyển (kho / bộ)
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            {/* —— Section: bảng BOM —— */}
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {canWriteMaster
                  ? "Chưa có thành phần trong bộ — bấm «Bổ sung vào bộ»."
                  : "Chưa có thành phần trong bộ."}
              </p>
            ) : (
              <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-[0_1px_0_rgb(226_232_240)]">
                    <tr>
                      <th className="p-3">Mã chi tiết</th>
                      <th className="p-3">Tên</th>
                      <th className="p-3">Loại DC</th>
                      <th className="w-16 p-3 text-center">SL</th>
                      <th className="w-20 p-3 text-center">Chu kỳ tối đa</th>
                      <th className="w-24 p-3 text-center">Trọng lượng</th>
                      <th className="p-3">Ghi chú</th>
                      <th className="w-24 p-3">Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() =>
                          setSelectedChiTietId((cur) => (cur === r.id ? null : r.id))
                        }
                        className={`${r.is_active === false ? "opacity-60" : ""} ${
                          selectedChiTietId === r.id
                            ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200"
                            : "hover:bg-slate-50"
                        } cursor-pointer`}
                      >
                        <td className="bv103-type-label p-3 font-mono font-semibold text-indigo-700">
                          {r.ma_chi_tiet || "—"}
                        </td>
                        <td className="p-3 text-xs font-semibold text-slate-800">
                          {clip(r.ten_chi_tiet || r.ten_dung_cu_le, 80)}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          {r.loai_dung_cu?.ma_danh_muc ? (
                            <span>
                              <span className="font-bold">{r.loai_dung_cu.ma_danh_muc}</span>
                              {r.loai_dung_cu.ten_danh_muc
                                ? ` — ${clip(r.loai_dung_cu.ten_danh_muc, 40)}`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="bv103-type-label p-3 text-center font-semibold">
                          {r.so_luong ?? "—"}
                        </td>
                        <td className="p-3 text-center text-xs">{r.max_suds_count ?? "—"}</td>
                        <td className="p-3 text-center text-xs">
                          {r.trong_luong != null && r.trong_luong !== ""
                            ? String(r.trong_luong)
                            : "—"}
                        </td>
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

            {/* —— Section: chọn dòng → liên kết loại (không nhân CTA nguy hiểm) —— */}
            {selectedChiTiet ? (
              <div className="space-y-2 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <p className={C.innerTableHead}>
                  Loại đang chọn:{" "}
                  <span className="text-[var(--primary)]">
                    {selectedChiTiet.loai_dung_cu?.ma_danh_muc || "—"}
                    {selectedChiTiet.loai_dung_cu?.ten_danh_muc
                      ? ` — ${selectedChiTiet.loai_dung_cu.ten_danh_muc}`
                      : ""}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Hỏng/Mất · Chuyển chỉ lập tại /cssd-su-co (nhóm Dụng cụ). Đổi danh mục chờ duyệt ở tab
                  Phiếu (quản trị).
                </p>
                <p className="text-[11px] font-medium text-slate-600">
                  Các bộ khác đang dùng loại này:
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
                  <p className="text-[11px] text-slate-500">Chưa thấy bộ khác dùng loại này.</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Chọn một dòng để xem liên kết loại và các bộ liên quan.
              </p>
            )}
          </div>
        )
      ) : (
        <BoDungCuChiTietAllocSection
          selectedBoId={selectedBoId}
          allocations={allocations}
          departments={departments}
          loading={loadingAllocations}
          selectedDeptId={selectedDeptId}
          allocQty={allocQty}
          onSelectedDeptId={setSelectedDeptId}
          onAllocQty={setAllocQty}
          onRefresh={() => void fetchAllocations()}
          onChanged={onChanged}
        />
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
            void reloadChiTiet();
            onChanged?.();
            setModalOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
