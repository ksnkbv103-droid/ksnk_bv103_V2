// Form thêm và sửa dm_bang_kiem — khớp tên trường với DB và payload saveBangKiem.
"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useGenerateMa } from "@/hooks/useGenerateMa";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import { getAllMaBangKiem, getHinhThucGiamSatOptionsForBangKiemAction } from "../actions/bang-kiem.actions";
import BangKiemFormFields, { BangKiemFormState } from "./bang-kiem-form-fields";

interface Props {
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSave: (data: BangKiemFormState) => void;
}

function mapInitial(initialData?: Record<string, unknown>): BangKiemFormState {
  const d = initialData || {};
  return {
    id: (d.id as string) ?? null,
    ma_bk: String(d.ma_bk ?? ""),
    ten_bang_kiem: String(d.ten_bang_kiem ?? d.ten_bk ?? ""),
    mo_ta: String(d.mo_ta ?? ""),
    nhom_chuyen_de: String(d.nhom_chuyen_de ?? ""),
    loai_hinh_giam_sat: String(d.loai_hinh_giam_sat ?? "TRUC_TIEP"),
    is_active: (d.is_active as boolean) ?? true,
    is_system: Boolean(d.is_system),
  };
}

export default function BangKiemForm({ initialData, onClose, onSave }: Props) {
  const { maTuDong } = useGenerateMa("BK", undefined, getAllMaBangKiem);
  const [formData, setFormData] = useState<BangKiemFormState>(() => mapInitial(initialData));
  const [hinhThucRows, setHinhThucRows] = useState<RegistrySelectRow[]>([]);
  const [hinhThucLoading, setHinhThucLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setHinhThucLoading(true);
    void getHinhThucGiamSatOptionsForBangKiemAction().then((r) => {
      if (!alive) return;
      if (r.success) setHinhThucRows(r.data);
      else setHinhThucRows([]);
      setHinhThucLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setFormData(mapInitial(initialData));
  }, [initialData]);

  useEffect(() => {
    if (!formData.id && maTuDong && !formData.ma_bk) {
      setFormData((prev) => ({ ...prev, ma_bk: maTuDong }));
    }
  }, [maTuDong, formData.id, formData.ma_bk]);

  const isEditing = Boolean(formData.id);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-10 py-8 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
            {formData.id ? "Cập nhật mẫu bảng kiểm" : "Thêm mới mẫu bảng kiểm"}
          </h2>
          <button type="button" onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-10 pt-4">
          <BangKiemFormFields
            formData={formData}
            setFormData={setFormData}
            maTuDong={maTuDong}
            isEditing={isEditing}
            hinhThucRows={hinhThucRows}
            hinhThucLoading={hinhThucLoading}
          />
        </div>

        <footer className="px-10 py-8 bg-slate-50/50 flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className="px-8 py-3 bg-white text-slate-400 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="flex items-center gap-3 px-10 py-3 bg-[#026f17] text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#026f17]/20 hover:scale-105 transition-all"
          >
            <Save className="w-4 h-4" /> Lưu lại
          </button>
        </footer>
      </div>
    </div>
  );
}
