"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import { listActiveTramCssdForLoaiAction, saveLoaiDungCuAction } from "../actions/loai-dung-cu.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import {
  mapIsChiuNhietToKhaNang,
  mapKhaNangToIsChiuNhiet,
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
  resolveSuggestedTramFromCatalog,
  suggestCssdStationFromMaster,
  type CssdSpaulding,
  type CssdSterileMethod,
  type CssdTramCatalogRow,
} from "@/lib/master-data/cssd-loai-dung-cu-map";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";

type FormData = {
  id?: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  hinh_dang: string;
  kich_thuoc: string;
  cong_dung: string;
  kha_nang_chiu_nhiet: "Cao" | "Thấp";
  phuong_phap_tiet_khuan: CssdSterileMethod;
  phan_loai_spaulding: CssdSpaulding;
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
      phuong_phap_tiet_khuan: "STEAM_134",
      phan_loai_spaulding: "CRITICAL",
      phan_loai: "PHAU_THUAT",
      so_luong_kho_du_phong: 0,
      is_active: true,
    };
  }
  const isChiu =
    input.is_chiu_nhiet !== undefined && input.is_chiu_nhiet !== null
      ? Boolean(input.is_chiu_nhiet)
      : mapKhaNangToIsChiuNhiet(input.kha_nang_chiu_nhiet);
  return {
    id: String(input.id || ""),
    ma_danh_muc: String(input.ma_danh_muc || ""),
    ten_danh_muc: String(input.ten_danh_muc || ""),
    hinh_dang: String(input.hinh_dang || ""),
    kich_thuoc: String(input.kich_thuoc || ""),
    cong_dung: String(input.cong_dung || ""),
    kha_nang_chiu_nhiet: mapIsChiuNhietToKhaNang(isChiu),
    phuong_phap_tiet_khuan: normalizeSterileMethodForMaster(
      input.phuong_phap_tiet_khuan || input.phuong_phap_tiet_khuan_chi_dinh,
    ),
    phan_loai_spaulding: normalizeSpauldingForMaster(input.phan_loai_spaulding),
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
  const [trams, setTrams] = useState<CssdTramCatalogRow[]>([]);
  const isEdit = Boolean(initialData?.id);
  const stationHint = useMemo(
    () =>
      suggestCssdStationFromMaster({
        spaulding: form.phan_loai_spaulding,
        sterileMethod: form.phuong_phap_tiet_khuan,
        isChiuNhiet: form.kha_nang_chiu_nhiet === "Cao",
      }),
    [form.phan_loai_spaulding, form.phuong_phap_tiet_khuan, form.kha_nang_chiu_nhiet],
  );
  const resolvedTram = useMemo(
    () => resolveSuggestedTramFromCatalog(stationHint.maTramGoiY, trams),
    [stationHint.maTramGoiY, trams],
  );

  useEffect(() => {
    if (!open) return;
    let live = true;
    void listActiveTramCssdForLoaiAction().then((res) => {
      if (!live) return;
      if (res.success) setTrams(res.data);
    });
    return () => {
      live = false;
    };
  }, [open]);

  useEffect(() => {
    setForm(seed);
  }, [seed]);

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
      is_chiu_nhiet: form.kha_nang_chiu_nhiet === "Cao",
      phuong_phap_tiet_khuan: form.phuong_phap_tiet_khuan,
      phan_loai_spaulding: form.phan_loai_spaulding,
      phan_loai: form.phan_loai,
      so_luong_kho_du_phong: form.so_luong_kho_du_phong,
      is_active: form.is_active,
    });
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không lưu được loại dụng cụ.");
    if ("warning" in result && result.warning) toast.warning(result.warning);
    toast.success(isEdit ? "Đã cập nhật loại dụng cụ." : "Đã thêm loại dụng cụ.");
    onSaved();
    onClose();
  };

  return (
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title={isEdit ? "Cập nhật loại dụng cụ" : "Thêm loại dụng cụ"}
      subtitle="Spaulding, chịu nhiệt và phương pháp tiệt khuẩn chỉ định."
      size="lg"
      onSubmit={save}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F l="Mã loại" v={form.ma_danh_muc} o={(v) => setForm({ ...form, ma_danh_muc: v.toUpperCase() })} required />
        <F l="Tên loại" v={form.ten_danh_muc} o={(v) => setForm({ ...form, ten_danh_muc: v })} required />
        <F l="Hình dáng" v={form.hinh_dang} o={(v) => setForm({ ...form, hinh_dang: v })} />
        <F l="Kích thước" v={form.kich_thuoc} o={(v) => setForm({ ...form, kich_thuoc: v })} />
      </div>
      <F l="Công dụng" v={form.cong_dung} o={(v) => setForm({ ...form, cong_dung: v })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <S
          l="Phân loại Spaulding"
          v={form.phan_loai_spaulding}
          o={(v) => setForm({ ...form, phan_loai_spaulding: normalizeSpauldingForMaster(v) })}
          options={[
            { v: "CRITICAL", l: "Thiết yếu (Critical)" },
            { v: "SEMI_CRITICAL", l: "Bán thiết yếu (Semi-critical)" },
            { v: "NON_CRITICAL", l: "Không thiết yếu (Non-critical)" },
          ]}
        />
        <S
          l="Khả năng chịu nhiệt"
          v={form.kha_nang_chiu_nhiet}
          o={(v) => setForm({ ...form, kha_nang_chiu_nhiet: v === "Thấp" ? "Thấp" : "Cao" })}
          options={[
            { v: "Cao", l: "Chịu nhiệt cao (hấp hơi được)" },
            { v: "Thấp", l: "Nhạy nhiệt (Plasma/EO)" },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <S
          l="Phương pháp tiệt khuẩn chỉ định"
          v={form.phuong_phap_tiet_khuan}
          o={(v) => setForm({ ...form, phuong_phap_tiet_khuan: normalizeSterileMethodForMaster(v) })}
          options={[
            { v: "STEAM_134", l: "Hơi nước 134°C" },
            { v: "STEAM_121", l: "Hơi nước 121°C" },
            { v: "PLASMA", l: "Plasma" },
            { v: "EO", l: "Khí EO" },
          ]}
        />
        <S
          l="Phân loại dụng cụ"
          v={form.phan_loai}
          o={(v) => setForm({ ...form, phan_loai: v })}
          options={[
            { v: "PHAU_THUAT", l: "Dụng cụ Phẫu thuật" },
            { v: "THU_THUAT", l: "Dụng cụ Thủ thuật" },
          ]}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-400 ml-1">Số lượng dự phòng kho lẻ</label>
        <input
          type="number"
          min="0"
          value={form.so_luong_kho_du_phong}
          onChange={(e) => setForm({ ...form, so_luong_kho_du_phong: parseInt(e.target.value) || 0 })}
          className={C.controlInput}
        />
      </div>
      <p className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
        <strong>Gợi ý trạm CSSD:</strong> {stationHint.maTramGoiY}
        <span className="mt-0.5 block text-[11px] font-normal text-emerald-800/90">{stationHint.lyDo}</span>
        {resolvedTram ? (
          <span className="mt-0.5 block text-[11px] font-semibold text-emerald-900">
            Trạm thật: {resolvedTram.ten} ({resolvedTram.ma})
            {resolvedTram.matchedBy === "alias" ? ` — khớp từ ${stationHint.maTramGoiY}` : ""}
          </span>
        ) : (
          <span className="mt-0.5 block text-[11px] font-medium text-amber-800">
            Chưa có trạm tương ứng trên sổ viện. Khai tại{" "}
            <a href={getDanhMucAdminPath("TRAM_CSSD")} className="underline">
              Trạm workflow CSSD
            </a>
            . Lưu loại vẫn được — không ghi id trạm giả.
          </span>
        )}
      </p>
      <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
    </QuanTriFormDialogShell>
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
        {options.map((x) => (
          <option key={x.v} value={x.v}>
            {x.l}
          </option>
        ))}
      </select>
    </div>
  );
}
