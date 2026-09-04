"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";
import { saveKhoaPhongAction } from "../actions/khoa-phong.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";

function mapForm(row: KhoaPhongRow | null) {
  return {
    id: row?.id || "",
    ma_danh_muc: String(row?.ma_danh_muc || ""),
    ten_danh_muc: String(row?.ten_danh_muc || ""),
    khoi_id: String(row?.khoi_id || ""),
    mo_ta_chuc_nang: String(row?.mo_ta_chuc_nang || ""),
    so_bac_si: Number(row?.so_bac_si || 0),
    so_dieu_duong: Number(row?.so_dieu_duong || 0),
    so_giuong_benh_thuong: Number(row?.so_giuong_benh_thuong || 0),
    so_giuong_cap_cuu: Number(row?.so_giuong_cap_cuu || 0),
    is_active: row?.is_active !== false,
    allowed_khu_vucs: Array.isArray(row?.specs?.allowed_khu_vucs)
      ? (row.specs.allowed_khu_vucs as string[])
      : ([] as string[]),
    cdc_location_code: String(row?.cdc_location_code || row?.specs?.cdc_location_code || ""),
  };
}

export default function KhoaPhongFormModal({
  open,
  initialRow,
  khoiOptions,
  khuVucOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialRow: KhoaPhongRow | null;
  khoiOptions: { id: string; ten_danh_muc: string }[];
  khuVucOptions: { id: string; ma: string; ten: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = useMemo(() => mapForm(initialRow), [initialRow]);
  const [form, setForm] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isEdit = Boolean(initialRow?.id);

  const filteredKhuVucOptions = useMemo(() => {
    if (!searchTerm.trim()) return khuVucOptions;
    const s = searchTerm.toLowerCase();
    return khuVucOptions.filter(
      (o) => o.ten.toLowerCase().includes(s) || o.ma.toLowerCase().includes(s),
    );
  }, [khuVucOptions, searchTerm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await saveKhoaPhongAction({
      ...form,
      specs: {
        ...(initialRow?.specs || {}),
        allowed_khu_vucs: form.allowed_khu_vucs,
        cdc_location_code: form.cdc_location_code.trim() || null,
      },
      cdc_location_code: form.cdc_location_code,
    });
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không thể lưu khoa phòng.");
    toast.success(isEdit ? "Đã cập nhật khoa phòng." : "Đã thêm khoa phòng.");
    onSaved();
    onClose();
  };

  return (
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title={isEdit ? "Cập nhật khoa phòng" : "Thêm khoa phòng"}
      subtitle="Mã khoa, khối, CDC location và khu vực đặc thù."
      size="md"
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${C.ctaSecondary} flex-1 ${C.modalFooterBtn}`} disabled={loading}>
            Hủy
          </button>
          <button type="submit" disabled={loading} className={`${C.ctaPrimary} flex-[2] ${C.modalFooterBtn}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BoDungCuTextField
          label="Mã khoa"
          required
          disabled={isEdit}
          value={form.ma_danh_muc}
          onChange={(v) => setForm({ ...form, ma_danh_muc: v.toUpperCase() })}
        />
        <BoDungCuTextField
          label="Tên khoa phòng"
          required
          value={form.ten_danh_muc}
          onChange={(v) => setForm({ ...form, ten_danh_muc: v })}
        />
      </div>
      <div className="space-y-1">
        <label className="ml-1 text-[11px] font-medium text-slate-400">Khối khoa</label>
        <select
          value={form.khoi_id}
          onChange={(e) => setForm({ ...form, khoi_id: e.target.value })}
          className={C.controlInput}
        >
          <option value="">— Chọn khối —</option>
          {khoiOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.ten_danh_muc}
            </option>
          ))}
        </select>
      </div>
      <BoDungCuTextField
        label="Mã CDC Location (NHSN)"
        value={form.cdc_location_code}
        onChange={(v) => setForm({ ...form, cdc_location_code: v.toUpperCase() })}
      />
      <p className="-mt-2 text-[11px] text-slate-500">
        Gắn khoa viện với mã CDC (ví dụ IN:ICU). Trống = chưa map. SIR trên NKBV vẫn là số thô cho đến khi map đủ.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BoDungCuTextField
          label="Số bác sĩ"
          type="number"
          value={String(form.so_bac_si)}
          onChange={(v) => setForm({ ...form, so_bac_si: Number(v || 0) })}
        />
        <BoDungCuTextField
          label="Số điều dưỡng"
          type="number"
          value={String(form.so_dieu_duong)}
          onChange={(v) => setForm({ ...form, so_dieu_duong: Number(v || 0) })}
        />
        <BoDungCuTextField
          label="Số giường bệnh thường"
          type="number"
          value={String(form.so_giuong_benh_thuong)}
          onChange={(v) => setForm({ ...form, so_giuong_benh_thuong: Number(v || 0) })}
        />
        <BoDungCuTextField
          label="Số giường cấp cứu"
          type="number"
          value={String(form.so_giuong_cap_cuu)}
          onChange={(v) => setForm({ ...form, so_giuong_cap_cuu: Number(v || 0) })}
        />
      </div>

      <div className="space-y-2 rounded-xl border-2 border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-center justify-between">
          <label className="ml-1 text-[11px] font-medium text-slate-500">Khu vực đặc thù (Chức năng phòng)</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, allowed_khu_vucs: khuVucOptions.map((o) => o.ma) })}
              className="bv103-type-label font-semibold text-[var(--primary)] hover:underline"
            >
              Chọn tất cả
            </button>
            <span className="text-[11px] text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, allowed_khu_vucs: [] })}
              className="bv103-type-label font-semibold text-red-600 hover:underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Tìm nhanh khu vực..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium focus:border-[var(--primary)] focus:outline-none"
        />

        <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-white p-2 pr-1 sm:grid-cols-2">
          {filteredKhuVucOptions.length === 0 ? (
            <span className="col-span-2 p-2 text-center text-xs text-slate-400">Không tìm thấy khu vực</span>
          ) : (
            filteredKhuVucOptions.map((o) => {
              const checked = form.allowed_khu_vucs.includes(o.ma);
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-xs font-semibold transition-all duration-200 ${
                    checked
                      ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                      : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.allowed_khu_vucs, o.ma]
                        : form.allowed_khu_vucs.filter((x) => x !== o.ma);
                      setForm({ ...form, allowed_khu_vucs: next });
                    }}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{o.ten}</span>
                    <span className="font-mono text-[11px] font-normal text-slate-400">{o.ma}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="ml-1 text-[11px] font-medium text-slate-400">Mô tả chức năng khoa</label>
        <textarea
          value={form.mo_ta_chuc_nang}
          onChange={(e) => setForm({ ...form, mo_ta_chuc_nang: e.target.value })}
          rows={2}
          className={C.textareaCompact}
        />
      </div>
      <MdmFormActiveToggleRow
        active={form.is_active}
        onChange={(next) => setForm({ ...form, is_active: next })}
        footnote="Khi Tắt, khoa/phòng thường không còn trong lựa chọn mặc định và báo cáo tổng hợp."
      />
    </QuanTriFormDialogShell>
  );
}
