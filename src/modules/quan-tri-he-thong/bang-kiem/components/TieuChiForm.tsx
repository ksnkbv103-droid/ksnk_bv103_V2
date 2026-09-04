// src/modules/quan-tri-he-thong/bang-kiem/components/TieuChiForm.tsx
"use client";

import React, { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import type { TieuChiBangKiem } from "../bang-kiem.types";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";
import {
  luaChonToTextarea,
  parseTieuChiKieuDuLieu,
  parseTieuChiWeightType,
  resolveTieuChiGscPersistFields,
  TIEU_CHI_KIEU_DU_LIEU,
  TIEU_CHI_KIEU_DU_LIEU_LABEL,
  TIEU_CHI_WEIGHT_TYPE,
  TIEU_CHI_WEIGHT_TYPE_LABEL,
  type TieuChiKieuDuLieu,
} from "../lib/bang-kiem-tieu-chi-gsc-fields";

interface Props {
  initialData?: Partial<TieuChiBangKiem> | null;
  bangKiemId: string;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

type TieuChiFormState = {
  id: string | null;
  bang_kiem_id: string;
  stt: number;
  ma_tc: string;
  noi_dung: string;
  ghi_chu: string;
  diem_toi_da: number;
  is_active: boolean;
  kieu_du_lieu: TieuChiKieuDuLieu;
  la_then_chot: boolean;
  cho_phep_kpa: boolean;
  cac_lua_chon_text: string;
  nguong_min: string;
  nguong_max: string;
  don_vi: string;
  weight_type: string;
  is_red_flag: boolean;
};

export default function TieuChiForm({ initialData, bangKiemId, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<TieuChiFormState>(() => ({
    id: initialData?.id || null,
    bang_kiem_id: bangKiemId,
    stt: Number(initialData?.stt ?? 0),
    ma_tc: String(initialData?.ma_tc ?? ""),
    noi_dung: String(initialData?.noi_dung ?? ""),
    ghi_chu: String(initialData?.ghi_chu ?? ""),
    diem_toi_da: Number(initialData?.diem_toi_da ?? 1),
    is_active: initialData?.is_active ?? true,
    kieu_du_lieu: parseTieuChiKieuDuLieu(initialData?.kieu_du_lieu) ?? "BOOLEAN",
    la_then_chot: asBool(initialData?.la_then_chot, false),
    cho_phep_kpa: asBool(initialData?.cho_phep_kpa, true),
    cac_lua_chon_text: luaChonToTextarea(initialData?.cac_lua_chon),
    nguong_min: initialData?.nguong_min == null ? "" : String(initialData.nguong_min),
    nguong_max: initialData?.nguong_max == null ? "" : String(initialData.nguong_max),
    don_vi: String(initialData?.don_vi ?? ""),
    weight_type: parseTieuChiWeightType(initialData?.weight_type ?? initialData?.weightType) ?? "MAJOR",
    is_red_flag: asBool(initialData?.is_red_flag ?? initialData?.isRedFlag, false),
  }));

  const payload = (): Record<string, unknown> => ({
    id: formData.id,
    bangKiemId: formData.bang_kiem_id,
    bang_kiem_id: formData.bang_kiem_id,
    stt: formData.stt,
    ma_tc: formData.ma_tc,
    noi_dung: formData.noi_dung,
    ghi_chu: formData.ghi_chu,
    diem_toi_da: formData.diem_toi_da,
    is_active: formData.is_active,
    kieu_du_lieu: formData.kieu_du_lieu,
    la_then_chot: formData.la_then_chot,
    cho_phep_kpa: formData.cho_phep_kpa,
    cac_lua_chon: formData.cac_lua_chon_text,
    nguong_min: formData.nguong_min,
    nguong_max: formData.nguong_max,
    don_vi: formData.don_vi,
    weight_type: formData.weight_type,
    is_red_flag: formData.is_red_flag,
  });

  const handleSave = () => {
    const next = payload();
    const gsc = resolveTieuChiGscPersistFields(next);
    if (!gsc.ok) {
      toast.error(gsc.error);
      return;
    }
    onSave(next);
  };

  return (
    <QuanTriFormDialogShell
      open
      onClose={onClose}
      title={formData.id ? "Sửa tiêu chí" : "Thêm tiêu chí mới"}
      subtitle="Nội dung chấm điểm, kiểu nhập và cờ then chốt trên phiếu."
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${F.ctaSecondary} flex-1 ${F.modalFooterBtn}`}>
            Hủy bỏ
          </button>
          <button type="button" onClick={handleSave} className={`${F.ctaPrimary} flex-[2] gap-2 ${F.modalFooterBtn}`}>
            <Save className="w-4 h-4" /> Lưu tiêu chí
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className={F.formLabel}>STT</label>
          <input type="number" min={0} value={formData.stt} onChange={e => setFormData({...formData, stt: parseInt(e.target.value, 10) || 0})} className={F.controlInput} />
        </div>
        <div className="space-y-2">
          <label className={F.formLabel}>Mã tiêu chí</label>
          <input value={formData.ma_tc} onChange={e => setFormData({...formData, ma_tc: e.target.value})} className={F.controlInput} placeholder="TC01" />
        </div>
        <div className="space-y-2">
          <label className={F.formLabel}>Điểm tối đa</label>
          <input type="number" min={1} value={formData.diem_toi_da} onChange={e => setFormData({...formData, diem_toi_da: Math.max(1, parseInt(e.target.value, 10) || 1)})} className={F.controlInput} />
        </div>
      </div>

      <div className="space-y-2">
        <label className={F.formLabel}>Nội dung tiêu chí</label>
        <textarea value={formData.noi_dung} onChange={e => setFormData({...formData, noi_dung: e.target.value})} rows={4} className={F.textareaCompact} placeholder="Nhập nội dung tiêu chí kiểm tra…" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={F.formLabel}>Kiểu nhập trên phiếu</label>
          <select
            value={formData.kieu_du_lieu}
            onChange={(e) =>
              setFormData({ ...formData, kieu_du_lieu: e.target.value as TieuChiKieuDuLieu })
            }
            className={F.controlSelectNative}
          >
            {TIEU_CHI_KIEU_DU_LIEU.map((code) => (
              <option key={code} value={code}>
                {TIEU_CHI_KIEU_DU_LIEU_LABEL[code]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={F.formLabel}>Mức trên phiếu</label>
          <select
            value={formData.weight_type}
            onChange={(e) => setFormData({ ...formData, weight_type: e.target.value })}
            className={F.controlSelectNative}
          >
            {TIEU_CHI_WEIGHT_TYPE.map((code) => (
              <option key={code} value={code}>
                {TIEU_CHI_WEIGHT_TYPE_LABEL[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {formData.kieu_du_lieu === "LUA_CHON" ? (
        <div className="space-y-2">
          <label className={F.formLabel}>Các lựa chọn (mỗi dòng một mục)</label>
          <textarea
            value={formData.cac_lua_chon_text}
            onChange={(e) => setFormData({ ...formData, cac_lua_chon_text: e.target.value })}
            rows={4}
            className={F.textareaCompact}
            placeholder={"Đạt\nKhông đạt"}
          />
        </div>
      ) : null}

      {formData.kieu_du_lieu === "SO_LIEU" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className={F.formLabel}>Ngưỡng tối thiểu</label>
            <input
              type="number"
              step="any"
              value={formData.nguong_min}
              onChange={(e) => setFormData({ ...formData, nguong_min: e.target.value })}
              className={F.controlInput}
            />
          </div>
          <div className="space-y-2">
            <label className={F.formLabel}>Ngưỡng tối đa</label>
            <input
              type="number"
              step="any"
              value={formData.nguong_max}
              onChange={(e) => setFormData({ ...formData, nguong_max: e.target.value })}
              className={F.controlInput}
            />
          </div>
          <div className="space-y-2">
            <label className={F.formLabel}>Đơn vị</label>
            <input
              value={formData.don_vi}
              onChange={(e) => setFormData({ ...formData, don_vi: e.target.value })}
              className={F.controlInput}
              placeholder="°C, mmHg…"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-[var(--radius-shell)] bg-slate-50 px-4 py-4">
        <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={formData.la_then_chot}
            onChange={(e) => setFormData({ ...formData, la_then_chot: e.target.checked })}
            className="mt-1"
          />
          <span>Then chốt — mẫu trọn gói chỉ đạt khi mọi câu then chốt đạt</span>
        </label>
        <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={formData.cho_phep_kpa}
            onChange={(e) => setFormData({ ...formData, cho_phep_kpa: e.target.checked })}
            className="mt-1"
          />
          <span>Cho phép chọn «Không áp dụng»</span>
        </label>
        <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={formData.is_red_flag}
            onChange={(e) => setFormData({ ...formData, is_red_flag: e.target.checked })}
            className="mt-1"
          />
          <span>Cờ chí mạng (red flag) trên phiếu</span>
        </label>
      </div>

      <div className="space-y-2">
        <label className={F.formLabel}>Ghi chú hướng dẫn</label>
        <input value={formData.ghi_chu} onChange={e => setFormData({...formData, ghi_chu: e.target.value})} className={F.controlInput} placeholder="Nhập hướng dẫn chấm điểm…" />
      </div>

      <MdmFormActiveToggleRow active={formData.is_active} onChange={(next) => setFormData({ ...formData, is_active: next })} />
    </QuanTriFormDialogShell>
  );
}
