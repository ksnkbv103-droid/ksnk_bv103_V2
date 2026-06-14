// Form thêm và sửa gstt_dm_bang_kiem — khớp tên trường với DB và payload saveBangKiem.
"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useGenerateMa } from "@/hooks/useGenerateMa";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import {
  getBangKiemApDungFormOptionsAction,
  getHinhThucGiamSatOptionsForBangKiemAction,
  suggestNextBangKiemMaAction,
} from "../actions/bang-kiem.actions";
import { BANG_KIEM_DEFAULT_MA_BK_PREFIX } from "../lib/bang-kiem-ma-prefix";
import { parseApDungJsonb, suggestDefaultApDungJsonb, validateApDungForSave } from "@/lib/domain/bang-kiem-ap-dung";
import { toast } from "sonner";
import BangKiemApDungFields, { type BangKiemApDungFormState } from "./bang-kiem-ap-dung-fields";
import BangKiemFormFields, { BangKiemFormState } from "./bang-kiem-form-fields";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";

export type BangKiemFormSavePayload = BangKiemFormState & {
  ap_dung_jsonb: BangKiemApDungFormState;
  loai_giam_sat?: string | null;
};

interface Props {
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSave: (data: BangKiemFormSavePayload) => void;
}

function mapInitial(initialData?: Record<string, unknown>): BangKiemFormSavePayload {
  const d = initialData || {};
  const meta = {
    phan_loai_chuyen_mon: String(d.phan_loai_chuyen_mon ?? d.nhom_chuyen_de ?? "") || null,
    loai_giam_sat: (d.loai_giam_sat as string | null) ?? null,
  };
  return {
    id: (d.id as string) ?? null,
    ma_bk: String(d.ma_bk ?? ""),
    ten_bang_kiem: String(d.ten_bang_kiem ?? d.ten_bk ?? ""),
    mo_ta: String(d.mo_ta ?? ""),
    phan_loai_chuyen_mon: String(d.phan_loai_chuyen_mon ?? d.nhom_chuyen_de ?? ""),
    loai_hinh_giam_sat: String(d.loai_hinh_giam_sat ?? "TRUC_TIEP"),
    loai_giam_sat: meta.loai_giam_sat,
    is_active: (d.is_active as boolean) ?? true,
    is_system: Boolean(d.is_system),
    ap_dung_jsonb: parseApDungJsonb(d.ap_dung_jsonb, meta),
  };
}

export default function BangKiemForm({ initialData, onClose, onSave }: Props) {
  const { maTuDong } = useGenerateMa(BANG_KIEM_DEFAULT_MA_BK_PREFIX, undefined, () =>
    suggestNextBangKiemMaAction(BANG_KIEM_DEFAULT_MA_BK_PREFIX),
  );
  const [formData, setFormData] = useState<BangKiemFormSavePayload>(() => mapInitial(initialData));
  const [hinhThucRows, setHinhThucRows] = useState<RegistrySelectRow[]>([]);
  const [hinhThucLoading, setHinhThucLoading] = useState(true);
  const [khoiOptions, setKhoiOptions] = useState<{ id: string; label: string }[]>([]);
  const [khoaOptions, setKhoaOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let alive = true;
    setHinhThucLoading(true);
    void Promise.all([
      getHinhThucGiamSatOptionsForBangKiemAction(),
      getBangKiemApDungFormOptionsAction(),
    ]).then(([hinh, apDungOpts]) => {
      if (!alive) return;
      if (hinh.success) setHinhThucRows(hinh.data);
      else setHinhThucRows([]);
      setHinhThucLoading(false);
      if (apDungOpts.success) {
        setKhoiOptions(apDungOpts.khoiOptions);
        setKhoaOptions(apDungOpts.khoaOptions);
      }
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

  useEffect(() => {
    if (formData.id) return;
    setFormData((prev) => ({
      ...prev,
      ap_dung_jsonb: suggestDefaultApDungJsonb({
        phan_loai_chuyen_mon: prev.phan_loai_chuyen_mon,
        loai_giam_sat: prev.loai_giam_sat,
      }),
    }));
  }, [formData.id, formData.phan_loai_chuyen_mon]);

  const isEditing = Boolean(formData.id);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-[var(--radius-shell)] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-10 py-8 bg-slate-50/50 flex items-center justify-between">
          <h2 className={F.modalTitleLight}>
            {formData.id ? "Cập nhật mẫu bảng kiểm" : "Thêm mới mẫu bảng kiểm"}
          </h2>
          <button type="button" onClick={onClose} className="p-3 hover:bg-white rounded-[var(--radius-shell)] text-slate-400 transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-10 pt-4 pb-4 custom-scrollbar">
          <BangKiemFormFields
            formData={formData}
            setFormData={(updater) =>
              setFormData((prev) => ({
                ...prev,
                ...(typeof updater === "function" ? updater(prev) : updater),
              }))
            }
            maTuDong={maTuDong}
            isEditing={isEditing}
            hinhThucRows={hinhThucRows}
            hinhThucLoading={hinhThucLoading}
          />
          <BangKiemApDungFields
            apDung={formData.ap_dung_jsonb}
            setApDung={(next) =>
              setFormData((p) => ({
                ...p,
                ap_dung_jsonb: typeof next === "function" ? next(p.ap_dung_jsonb) : next,
              }))
            }
            khoiOptions={khoiOptions}
            khoaOptions={khoaOptions}
            disabled={false}
            isSystemBk={formData.is_system}
          />
        </div>

        <footer className="px-10 py-8 bg-slate-50/50 flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className={`${F.ctaSecondary} ${F.modalFooterBtn}`}>
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => {
              const apErr = validateApDungForSave(formData.ap_dung_jsonb);
              if (apErr) {
                toast.error(apErr);
                return;
              }
              onSave(formData);
            }}
            className={`${F.ctaPrimary} gap-2 ${F.modalFooterBtn}`}
          >
            <Save className="w-4 h-4" /> Lưu lại
          </button>
        </footer>
      </div>
    </div>
  );
}
