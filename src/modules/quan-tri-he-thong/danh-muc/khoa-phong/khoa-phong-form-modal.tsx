"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";
import { saveKhoaPhongAction } from "../actions/khoa-phong.actions";

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
      (o) => o.ten.toLowerCase().includes(s) || o.ma.toLowerCase().includes(s)
    );
  }, [khuVucOptions, searchTerm]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await saveKhoaPhongAction({
      ...form,
      specs: {
        allowed_khu_vucs: form.allowed_khu_vucs,
      },
    });
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không thể lưu khoa phòng.");
    toast.success(isEdit ? "Đã cập nhật khoa phòng." : "Đã thêm khoa phòng.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form onSubmit={submit} className="bg-white w-full max-w-xl rounded-2xl p-8 space-y-4 shadow-2xl border-t-[6px] border-[#026f17] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-sm font-black text-[#026f17] uppercase tracking-widest">
            {isEdit ? "Cập nhật khoa phòng" : "Thêm khoa phòng"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Mã khoa" required disabled={isEdit} value={form.ma_danh_muc} onChange={(v) => setForm({ ...form, ma_danh_muc: v.toUpperCase() })} />
          <BoDungCuTextField label="Tên khoa phòng" required value={form.ten_danh_muc} onChange={(v) => setForm({ ...form, ten_danh_muc: v })} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Khối khoa</label>
          <select
            value={form.khoi_id}
            onChange={(e) => setForm({ ...form, khoi_id: e.target.value })}
            className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs"
          >
            <option value="">— Chọn khối —</option>
            {khoiOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.ten_danh_muc}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Số bác sĩ" type="number" value={String(form.so_bac_si)} onChange={(v) => setForm({ ...form, so_bac_si: Number(v || 0) })} />
          <BoDungCuTextField label="Số điều dưỡng" type="number" value={String(form.so_dieu_duong)} onChange={(v) => setForm({ ...form, so_dieu_duong: Number(v || 0) })} />
          <BoDungCuTextField label="Số giường bệnh thường" type="number" value={String(form.so_giuong_benh_thuong)} onChange={(v) => setForm({ ...form, so_giuong_benh_thuong: Number(v || 0) })} />
          <BoDungCuTextField label="Số giường cấp cứu" type="number" value={String(form.so_giuong_cap_cuu)} onChange={(v) => setForm({ ...form, so_giuong_cap_cuu: Number(v || 0) })} />
        </div>
        
        {/* Khu vực đặc thù (Chức năng phòng) */}
        <div className="space-y-2 border-2 border-slate-100 rounded-xl p-4 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-black text-slate-500 uppercase ml-1">
              Khu vực đặc thù (Chức năng phòng)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, allowed_khu_vucs: khuVucOptions.map(o => o.ma) })}
                className="text-[10px] font-bold text-[#026f17] hover:underline"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300 text-[10px]">|</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, allowed_khu_vucs: [] })}
                className="text-[10px] font-bold text-red-600 hover:underline"
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
            className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-medium focus:outline-none focus:border-[#026f17] mb-2"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 border border-slate-100 rounded-lg p-2 bg-white">
            {filteredKhuVucOptions.length === 0 ? (
              <span className="text-xs text-slate-400 p-2 col-span-2 text-center">Không tìm thấy khu vực</span>
            ) : (
              filteredKhuVucOptions.map((o) => {
                const checked = form.allowed_khu_vucs.includes(o.ma);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                      checked
                        ? "border-[#026f17]/30 bg-[#026f17]/5 text-[#026f17]"
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700"
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
                      className="rounded text-[#026f17] focus:ring-[#026f17] border-slate-300 h-4.5 w-4.5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{o.ten}</span>
                      <span className="text-[11px] text-slate-400 font-mono font-normal">{o.ma}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Mô tả chức năng khoa</label>
          <textarea
            value={form.mo_ta_chuc_nang}
            onChange={(e) => setForm({ ...form, mo_ta_chuc_nang: e.target.value })}
            rows={2}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-semibold text-xs resize-none"
          />
        </div>
        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} footnote="Khi Tắt, khoa/phòng thường không còn trong lựa chọn mặc định và báo cáo tổng hợp." />
        <button type="submit" disabled={loading} className="w-full h-12 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}
