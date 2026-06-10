"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import { saveLoaiDungCuAction } from "../actions/loai-dung-cu.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

type FormData = {
  id?: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  hinh_dang: string;
  kich_thuoc: string;
  cong_dung: string;
  kha_nang_chiu_nhiet: string;
  phuong_phap_tiet_khuan: string;
  phan_loai: string;
  so_luong_kho_du_phong: number;
  is_active: boolean;
};

function mapForm(input: Record<string, unknown> | null): FormData {
  if (!input) {
    return {
      ma_danh_muc: "",
      ten_danh_muc: "",
      hinh_dang: "",
      kich_thuoc: "",
      cong_dung: "",
      kha_nang_chiu_nhiet: "Cao",
      phuong_phap_tiet_khuan: "Hơi nước",
      phan_loai: "PHAU_THUAT",
      so_luong_kho_du_phong: 0,
      is_active: true,
    };
  }
  return {
    id: String(input.id || ""),
    ma_danh_muc: String(input.ma_danh_muc || ""),
    ten_danh_muc: String(input.ten_danh_muc || ""),
    hinh_dang: String(input.hinh_dang || ""),
    kich_thuoc: String(input.kich_thuoc || ""),
    cong_dung: String(input.cong_dung || ""),
    kha_nang_chiu_nhiet: String(input.kha_nang_chiu_nhiet || "Cao"),
    phuong_phap_tiet_khuan: String(input.phuong_phap_tiet_khuan || "Hơi nước"),
    phan_loai: String(input.phan_loai || "PHAU_THUAT"),
    so_luong_kho_du_phong: Number(input.so_luong_kho_du_phong || 0),
    is_active: input.is_active !== false,
  };
}

export default function LoaiDungCuFormModal({
  open,
  initialData,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialData: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = useMemo(() => mapForm(initialData), [initialData]);
  const [form, setForm] = useState<FormData>(seed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialData?.id);

  if (!open) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await saveLoaiDungCuAction({
      id: form.id,
      ma_danh_muc: form.ma_danh_muc,
      ten_danh_muc: form.ten_danh_muc,
      hinh_dang: form.hinh_dang,
      kich_thuoc: form.kich_thuoc,
      cong_dung: form.cong_dung,
      kha_nang_chiu_nhiet: form.kha_nang_chiu_nhiet,
      phuong_phap_tiet_khuan: form.phuong_phap_tiet_khuan,
      phan_loai: form.phan_loai,
      so_luong_kho_du_phong: form.so_luong_kho_du_phong,
      is_active: form.is_active,
    });
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không lưu được loại dụng cụ.");
    toast.success(isEdit ? "Đã cập nhật loại dụng cụ." : "Đã thêm loại dụng cụ.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <form onSubmit={save} className="bg-white w-full max-w-2xl rounded-[var(--radius-shell)] p-8 space-y-4 shadow-2xl border-t-[6px] border-[var(--primary)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[var(--primary)] uppercase tracking-widest">
            {isEdit ? "Cập nhật loại dụng cụ" : "Thêm loại dụng cụ"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F l="Mã loại" v={form.ma_danh_muc} o={(v) => setForm({ ...form, ma_danh_muc: v.toUpperCase() })} required />
          <F l="Tên loại" v={form.ten_danh_muc} o={(v) => setForm({ ...form, ten_danh_muc: v })} required />
          <F l="Hình dáng" v={form.hinh_dang} o={(v) => setForm({ ...form, hinh_dang: v })} />
          <F l="Kích thước" v={form.kich_thuoc} o={(v) => setForm({ ...form, kich_thuoc: v })} />
        </div>
        <F l="Công dụng" v={form.cong_dung} o={(v) => setForm({ ...form, cong_dung: v })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <S l="Khả năng chịu nhiệt" v={form.kha_nang_chiu_nhiet} o={(v) => setForm({ ...form, kha_nang_chiu_nhiet: v })}
            options={[{ v: "Cao", l: "Chịu nhiệt cao" }, { v: "Thấp", l: "Chịu nhiệt thấp" }]} />
          <S l="Phương pháp tiệt khuẩn" v={form.phuong_phap_tiet_khuan} o={(v) => setForm({ ...form, phuong_phap_tiet_khuan: v })}
            options={[{ v: "Hơi nước", l: "Hơi nước" }, { v: "Plasma", l: "Plasma" }, { v: "EO", l: "Khí EO" }]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <S l="Phân loại dụng cụ" v={form.phan_loai} o={(v) => setForm({ ...form, phan_loai: v })}
            options={[{ v: "PHAU_THUAT", l: "Dụng cụ Phẫu thuật" }, { v: "THU_THUAT", l: "Dụng cụ Thủ thuật" }]} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Số lượng dự phòng kho lẻ</label>
            <input type="number" min="0" value={form.so_luong_kho_du_phong} onChange={(e) => setForm({ ...form, so_luong_kho_du_phong: parseInt(e.target.value) || 0 })} className={C.controlInput} />
          </div>
        </div>
        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
        <button type="submit" disabled={loading} className={`w-full ${C.btnPrimaryBlock} disabled:opacity-60`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}

function F({ l, v, o, required }: { l: string; v: string; o: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-400 ml-1">{l}{required ? " *" : ""}</label>
      <input value={v} required={required} onChange={(e) => o(e.target.value)} className={C.controlInput} />
    </div>
  );
}

function S({ l, v, o, options }: { l: string; v: string; o: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-400 ml-1">{l}</label>
      <select value={v} onChange={(e) => o(e.target.value)} className={C.controlInput}>
        {options.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
      </select>
    </div>
  );
}
