"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import {
  deleteOrHuyNhiemVu,
  listCongViecByNhiemVu,
  listNhiemVuByNam,
  upsertNhiemVu,
  type CongViecNhiemVuLite,
  type NhiemVuRow,
} from "../actions/nhiem-vu.actions";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";
import {
  formatNhiemVuKyHan,
  nhiemVuMatchesPeriod,
  type KeHoachNamPeriodFilter,
  type KeHoachNamPeriodKind,
} from "../lib/ke-hoach-nam-format";

export type NhiemVuPanelProps = {
  onCreateCongViec?: (prefill: {
    nhiem_vu_id: string;
    nguoi_phu_trach_id?: string | null;
    han_hoan_thanh?: string | null;
    loai_cong_viec?: "DOT_XUAT";
  }) => void;
  onOpenCongViec?: (id: string) => void;
};

function defaultPeriodFilterNow(): KeHoachNamPeriodFilter {
  return { kind: "NAM", value: 0 };
}

function NhiemVuExpand({
  nhiemVu,
  onCreateCongViec,
  onOpenCongViec,
}: {
  nhiemVu: NhiemVuRow;
  onCreateCongViec: (nv: NhiemVuRow) => void;
  onOpenCongViec?: (id: string) => void;
}) {
  const [tasks, setTasks] = useState<CongViecNhiemVuLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listCongViecByNhiemVu(nhiemVu.id)
      .then((rows) => {
        if (!cancelled) setTasks(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Không tải việc.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nhiemVu.id]);

  return (
    <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">Việc gắn nhiệm vụ</p>
        <button type="button" className={bv103LayoutChrome.btnPrimary} onClick={() => onCreateCongViec(nhiemVu)}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Thêm việc
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">Đang tải…</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-slate-500">Chưa có việc — bấm «Thêm việc».</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs hover:border-[var(--primary)]/40"
                onClick={() => onOpenCongViec?.(t.id)}
              >
                <span className="min-w-0 truncate font-medium text-slate-800">{t.tieu_de}</span>
                <span className="shrink-0 text-slate-500">
                  {t.nguoi_phu_trach_ten || "—"} · {t.phan_tram_hoan_thanh}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NhiemVuPanel({ onCreateCongViec, onOpenCongViec }: NhiemVuPanelProps) {
  const yearNow = new Date().getFullYear();
  const [nam, setNam] = useState(yearNow);
  const [period, setPeriod] = useState<KeHoachNamPeriodFilter>(defaultPeriodFilterNow);
  const [rows, setRows] = useState<NhiemVuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nhanSu, setNhanSu] = useState<QlcvSelectOption[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [nvTen, setNvTen] = useState("");
  const [nvChuTri, setNvChuTri] = useState("");
  const [nvQuy, setNvQuy] = useState("");
  const [nvThang, setNvThang] = useState("");
  const [nvHan, setNvHan] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listNhiemVuByNam(nam));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải nhiệm vụ.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [nam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getQlcvFormCatalog()
      .then((c) => setNhanSu(c.nhanSu))
      .catch(() => setNhanSu([]));
  }, []);

  const filtered = useMemo(
    () => rows.filter((nv) => nhiemVuMatchesPeriod(nv, period)),
    [rows, period],
  );

  const setPeriodKind = (kind: KeHoachNamPeriodKind) => {
    if (kind === "NAM") {
      setPeriod({ kind: "NAM", value: 0 });
      return;
    }
    if (kind === "QUY") {
      const q =
        period.kind === "THANG"
          ? Math.ceil(period.value / 3)
          : period.kind === "QUY"
            ? period.value
            : Math.ceil((new Date().getMonth() + 1) / 3);
      setPeriod({ kind: "QUY", value: q });
      return;
    }
    const m = period.kind === "THANG" ? period.value : new Date().getMonth() + 1;
    setPeriod({ kind: "THANG", value: m });
  };

  const resetForm = () => {
    setEditId(null);
    setNvTen("");
    setNvChuTri("");
    setNvQuy("");
    setNvThang("");
    setNvHan("");
  };

  const startEdit = (nv: NhiemVuRow) => {
    setEditId(nv.id);
    setNvTen(nv.ten);
    setNvChuTri(nv.nguoi_chu_tri_id || "");
    setNvQuy(nv.quy != null ? String(nv.quy) : "");
    setNvThang(nv.thang != null ? String(nv.thang) : "");
    setNvHan(nv.han_hoan_thanh || "");
  };

  const submitNv = async (e: React.FormEvent) => {
    e.preventDefault();
    const ten = nvTen.trim();
    if (!ten) return toast.error("Nhập tên nhiệm vụ.");
    if (!nvChuTri) return toast.error("Chọn người phụ trách.");
    if (!nvQuy && !nvThang && !nvHan) {
      return toast.error("Nhập ít nhất Quý, Tháng hoặc Hạn thực hiện.");
    }
    setAdding(true);
    try {
      await upsertNhiemVu({
        id: editId || undefined,
        ten,
        nam,
        quy: nvQuy ? Number(nvQuy) : null,
        thang: nvThang ? Number(nvThang) : null,
        han_hoan_thanh: nvHan || null,
        nguoi_chu_tri_id: nvChuTri,
        trang_thai: "DANG_LAM",
      });
      toast.success(editId ? "Đã cập nhật nhiệm vụ." : "Đã thêm nhiệm vụ.");
      resetForm();
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu nhiệm vụ.");
    } finally {
      setAdding(false);
    }
  };

  const openCreateFromNv = (nv: NhiemVuRow) => {
    if (!onCreateCongViec) {
      toast.error("Không mở được form công việc.");
      return;
    }
    onCreateCongViec({
      nhiem_vu_id: nv.id,
      nguoi_phu_trach_id: nv.nguoi_chu_tri_id,
      han_hoan_thanh: nv.han_hoan_thanh,
      loai_cong_viec: "DOT_XUAT",
    });
  };

  const removeNv = async (nv: NhiemVuRow) => {
    if (!window.confirm(`Xóa / huỷ nhiệm vụ «${nv.ten}»?`)) return;
    try {
      const r = await deleteOrHuyNhiemVu(nv.id);
      toast.success(r.mode === "deleted" ? "Đã xóa nhiệm vụ." : "Đã huỷ (còn việc gắn).");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không xóa được.");
    }
  };

  const lbl = bv103LayoutChrome.labelBlock;
  const inp =
    "bv103-control-h w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <div className={`${bv103LayoutChrome.panelSurface} space-y-[var(--bv103-space-3)] p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-800">Nhiệm vụ</h3>
        </div>
        <button type="button" onClick={() => void load()} className={bv103LayoutChrome.btnSecondary}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Tải lại
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs text-slate-600">
          Năm
          <input
            type="number"
            min={2000}
            max={2100}
            className={`${inp} w-24`}
            value={nam}
            onChange={(e) => setNam(Number(e.target.value) || yearNow)}
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {(["NAM", "QUY", "THANG"] as KeHoachNamPeriodKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={period.kind === k ? bv103LayoutChrome.btnPrimary : bv103LayoutChrome.btnSecondary}
              onClick={() => setPeriodKind(k)}
            >
              {k === "NAM" ? "Cả năm" : k === "QUY" ? "Quý" : "Tháng"}
            </button>
          ))}
        </div>
        {period.kind === "QUY" ? (
          <input
            type="number"
            min={1}
            max={4}
            className={`${inp} w-16`}
            value={period.value}
            onChange={(e) => setPeriod({ kind: "QUY", value: Number(e.target.value) || 1 })}
          />
        ) : null}
        {period.kind === "THANG" ? (
          <input
            type="number"
            min={1}
            max={12}
            className={`${inp} w-16`}
            value={period.value}
            onChange={(e) => setPeriod({ kind: "THANG", value: Number(e.target.value) || 1 })}
          />
        ) : null}
      </div>

      <form onSubmit={submitNv} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-12">
        <p className="sm:col-span-12 text-xs font-semibold text-slate-700">
          {editId ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ"}
        </p>
        <label className="sm:col-span-4 space-y-1">
          <span className={lbl}>Tên nhiệm vụ *</span>
          <input className={inp} value={nvTen} onChange={(e) => setNvTen(e.target.value)} placeholder="VD: Giám sát VST…" />
        </label>
        <label className="sm:col-span-3 space-y-1">
          <span className={lbl}>Người phụ trách *</span>
          <SearchableSelect options={nhanSu} value={nvChuTri} onChange={setNvChuTri} placeholder="Chọn…" />
        </label>
        <label className="sm:col-span-1 space-y-1">
          <span className={lbl}>Quý</span>
          <input className={inp} type="number" min={1} max={4} value={nvQuy} onChange={(e) => setNvQuy(e.target.value)} />
        </label>
        <label className="sm:col-span-1 space-y-1">
          <span className={lbl}>Tháng</span>
          <input className={inp} type="number" min={1} max={12} value={nvThang} onChange={(e) => setNvThang(e.target.value)} />
        </label>
        <label className="sm:col-span-2 space-y-1">
          <span className={lbl}>Hạn</span>
          <input className={inp} type="date" value={nvHan} onChange={(e) => setNvHan(e.target.value)} />
        </label>
        <div className="sm:col-span-1 flex items-end gap-1">
          <button type="submit" disabled={adding} className={bv103LayoutChrome.btnPrimary}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> {editId ? "Lưu" : "Thêm"}
          </button>
        </div>
        {editId ? (
          <div className="sm:col-span-12">
            <button type="button" className={bv103LayoutChrome.btnSecondary} onClick={resetForm}>
              Huỷ sửa
            </button>
          </div>
        ) : null}
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có nhiệm vụ trong kỳ — thêm bằng form bên trên.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {filtered.map((nv) => {
            const open = expandedId === nv.id;
            return (
              <li key={nv.id}>
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left text-sm font-medium text-slate-800"
                    onClick={() => setExpandedId(open ? null : nv.id)}
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="min-w-0 truncate">{nv.ten}</span>
                  </button>
                  <span className="text-xs text-slate-500">{nv.nguoi_chu_tri_ten || "—"}</span>
                  <span className="text-xs text-slate-500">{formatNhiemVuKyHan(nv)}</span>
                  <span className="text-xs text-slate-500">{nv.pct ?? 0}%</span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    <button type="button" className={bv103LayoutChrome.btnSecondary} onClick={() => startEdit(nv)}>
                      Sửa
                    </button>
                    <button type="button" className={bv103LayoutChrome.btnPrimary} onClick={() => openCreateFromNv(nv)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Việc
                    </button>
                    <button
                      type="button"
                      className={bv103LayoutChrome.btnSecondary}
                      onClick={() => void removeNv(nv)}
                      title="Xóa nếu trống; còn việc thì huỷ"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
                {open ? (
                  <NhiemVuExpand
                    nhiemVu={nv}
                    onCreateCongViec={openCreateFromNv}
                    onOpenCongViec={onOpenCongViec}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
