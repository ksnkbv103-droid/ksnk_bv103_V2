"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ClipboardList, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useBangKiemToiPhaiTgs } from "@/lib/analytics/use-bang-kiem-toi-phai-tgs";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Props = {
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  khoaOptions: { id: string; label: string }[];
  selectedKhoaIds: string[];
  khoaFilterLocked?: boolean;
  lockedKhoaLabel?: string | null;
};

function StatusBadge({ status }: { status: "da_tgs" | "thieu_tgs" }) {
  if (status === "da_tgs") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
        <CheckCircle2 className="w-3 h-3" /> Đã TGS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
      <AlertCircle className="w-3 h-3" /> Thiếu TGS
    </span>
  );
}

type Row = {
  id: string;
  ma_bk: string;
  ten_bang_kiem: string;
  trang_thai: "da_tgs" | "thieu_tgs";
  tan_suat_label: string | null;
  so_phien_thuc_te: number;
  so_phien_toi_thieu: number | null;
  tan_suat_danh_gia: "chua_quy_dinh" | "dat" | "thieu";
  huong_dan: string[];
  gsc_form_href: string;
};

function TanSuatBadge({ row }: { row: Row }) {
  if (row.tan_suat_danh_gia === "chua_quy_dinh") {
    return <span className="text-[11px] font-medium text-slate-400">Tần suất: chưa quy định</span>;
  }
  const label =
    row.so_phien_toi_thieu != null
      ? `${row.so_phien_thuc_te}/${row.so_phien_toi_thieu} phiên`
      : `${row.so_phien_thuc_te} phiên`;
  if (row.tan_suat_danh_gia === "dat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-800">
        <CheckCircle2 className="w-3 h-3" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
      <AlertCircle className="w-3 h-3" /> {label} (thiếu tần suất)
    </span>
  );
}

function BkTable({ rows, showStatus }: { rows: Row[]; showStatus: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm font-medium text-slate-500 px-2 py-4">Không có bảng kiểm trong nhóm này.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={`border-b border-slate-100 ${UI.innerTableHead}`}>
            <th className="py-2 pr-3">Mã BK</th>
            <th className="py-2 pr-3">Tên bảng kiểm</th>
            {showStatus ? (
              <>
                <th className="py-2 pr-3">Bao phủ BK</th>
                <th className="py-2 pr-3">Tần suất phiên</th>
              </>
            ) : null}
            <th className="py-2">Việc cần làm</th>
            <th className="py-2 w-24" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 align-top">
              <td className="py-3 pr-3 font-bold text-slate-800 whitespace-nowrap">{row.ma_bk}</td>
              <td className="py-3 pr-3 font-semibold text-slate-700 max-w-[200px]">{row.ten_bang_kiem}</td>
              {showStatus ? (
                <>
                  <td className="py-3 pr-3">
                    <StatusBadge status={row.trang_thai} />
                  </td>
                  <td className="py-3 pr-3">
                    <TanSuatBadge row={row} />
                    {row.tan_suat_label ? (
                      <p className="mt-1 text-[11px] font-medium text-slate-500">{row.tan_suat_label}</p>
                    ) : null}
                  </td>
                </>
              ) : null}
              <td className="py-3 text-xs font-medium text-slate-600">
                <div className="space-y-0.5">
                  {row.huong_dan.map((h) => (
                    <p key={h}>{h}</p>
                  ))}
                </div>
              </td>
              <td className="py-3">
                <Link
                  href={row.gsc_form_href}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline"
                >
                  Tạo phiên <ExternalLink className="w-3 h-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GscBangKiemToiPhaiTgsPanel({
  tuNgay,
  setTuNgay,
  denNgay,
  setDenNgay,
  khoaOptions,
  selectedKhoaIds,
  khoaFilterLocked,
  lockedKhoaLabel,
}: Props) {
  const [todoKhoaId, setTodoKhoaId] = useState("");

  useEffect(() => {
    if (khoaFilterLocked && selectedKhoaIds[0]) {
      setTodoKhoaId(selectedKhoaIds[0]);
      return;
    }
    if (selectedKhoaIds.length === 1) {
      setTodoKhoaId(selectedKhoaIds[0]);
    }
  }, [khoaFilterLocked, selectedKhoaIds]);

  const { data, loading, error, reload } = useBangKiemToiPhaiTgs({
    tuNgay,
    denNgay,
    khoaId: todoKhoaId || null,
    enabled: Boolean(todoKhoaId),
  });

  return (
    <div className="space-y-6 px-2 pb-8">
      <div className={`p-4 sm:p-6 space-y-4 ${bv103LayoutChrome.panelSurface}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`${UI.panelTitle} inline-flex items-center gap-2`}>
              <ClipboardList className="w-5 h-5 text-[var(--primary)]" />
              BK tôi phải tự giám sát (TGS)
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 max-w-xl leading-relaxed">
              Mạng lưới KSNK khoa xem bảng kiểm mình phải làm — theo quy định phạm vi trên danh mục BK.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading || !todoKhoaId}
            className="inline-flex items-center gap-2 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Làm mới
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              aria-label="Từ ngày"
              className="h-10 min-w-[10.5rem] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold"
            />
            <span className="text-xs font-semibold text-slate-500">đến</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              aria-label="Đến ngày"
              className="h-10 min-w-[10.5rem] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold"
            />
          </div>

          {!khoaFilterLocked ? (
            <div className="min-w-[220px] flex-1">
              <label className={`block ${UI.labelBlock} mb-1`}>Khoa</label>
              <select
                value={todoKhoaId}
                onChange={(e) => setTodoKhoaId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800"
              >
                <option value="">— Chọn khoa —</option>
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {khoaFilterLocked && lockedKhoaLabel ? (
          <p className="text-xs font-semibold text-sky-800 bg-sky-50 rounded-[var(--radius-shell)] px-4 py-2">
            Góc nhìn khoa: <strong>{lockedKhoaLabel}</strong> — chỉ thấy BK áp dụng cho khoa của bạn.
          </p>
        ) : null}

        {!todoKhoaId ? (
          <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded-[var(--radius-shell)] px-4 py-3">
            Chọn khoa để xem danh sách bảng kiểm phải TGS.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-red-700 bg-red-50 rounded-[var(--radius-shell)] px-4 py-3">
            {error}
          </p>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Đang tải danh sách…
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`${UI.inset} px-4 py-3`}>
                <p className={UI.kpiLabel}>BK bắt buộc</p>
                <p className="text-xl font-bold text-slate-800">{data.tom_tat.tong_bat_buoc}</p>
              </div>
              <div className="rounded-[var(--radius-shell)] bg-emerald-50 px-4 py-3">
                <p className={`${UI.kpiLabel} text-emerald-700`}>Đã TGS</p>
                <p className="text-xl font-bold text-emerald-900">{data.tom_tat.da_tgs}</p>
              </div>
              <div className="rounded-[var(--radius-shell)] bg-amber-50 px-4 py-3">
                <p className={`${UI.kpiLabel} text-amber-700`}>Thiếu</p>
                <p className="text-xl font-bold text-amber-900">{data.tom_tat.thieu}</p>
              </div>
              <div className="rounded-[var(--radius-shell)] bg-[var(--primary)]/5 px-4 py-3">
                <p className={`${UI.kpiLabel} text-[var(--primary)]`}>Bao phủ</p>
                <p className="text-xl font-bold text-[var(--primary)]">{data.tom_tat.ty_le_bao_phu}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className={`${UI.sectionTitle} px-1`}>
                Bắt buộc ({data.bat_buoc.length})
              </h3>
              <BkTable rows={data.bat_buoc} showStatus />
            </div>

            {data.khuyen_ngh.length > 0 ? (
              <div className="space-y-2">
                <h3 className={`${UI.sectionTitle} text-slate-500 px-1`}>
                  Khuyến nghị ({data.khuyen_ngh.length}) — không tính thiếu KPI
                </h3>
                <BkTable rows={data.khuyen_ngh} showStatus={false} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
