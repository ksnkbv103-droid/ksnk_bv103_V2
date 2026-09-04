"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import type { HoaChatRow } from "../actions/hoa-chat.types";
import { saveHoaChatAction } from "../actions/hoa-chat.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { loaiHoaChatLabel } from "@/lib/domain/cssd-hoa-chat-loai";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";

function mapForm(row: HoaChatRow | null) {
  return {
    id: row?.id || "",
    ma_hoa_chat: String(row?.ma_hoa_chat || ""),
    ten_hoa_chat: String(row?.ten_hoa_chat || ""),
    loai_hoa_chat: String(row?.loai_hoa_chat || "HOA_CHAT"),
    don_vi_tinh: String(row?.don_vi_tinh || ""),
    quy_cach: String(row?.quy_cach || ""),
    nong_do: String(row?.nong_do || ""),
    han_su_dung: row?.han_su_dung ? String(row.han_su_dung).slice(0, 10) : "",
    ghi_chu: String(row?.ghi_chu || ""),
    is_active: row?.is_active !== false,
  };
}

export default function HoaChatFormModal({
  open,
  initialRow,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialRow: HoaChatRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = useMemo(() => mapForm(initialRow), [initialRow]);
  const [form, setForm] = useState(seed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialRow?.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await saveHoaChatAction(form);
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không thể lưu hóa chất.");
    toast.success(isEdit ? "Đã cập nhật hóa chất." : "Đã thêm hóa chất.");
    onSaved();
    onClose();
  };

  return (
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title={isEdit ? "Cập nhật hóa chất" : "Thêm hóa chất"}
      subtitle="Mã, tên, phân loại kho và hạn dùng."
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
          label="Mã HC"
          required
          disabled={isEdit}
          value={form.ma_hoa_chat}
          onChange={(v) => setForm({ ...form, ma_hoa_chat: v.toUpperCase() })}
        />
        <BoDungCuTextField
          label="Tên hóa chất"
          required
          value={form.ten_hoa_chat}
          onChange={(v) => setForm({ ...form, ten_hoa_chat: v })}
        />
        <div className="space-y-1">
          <label className="ml-1 text-[11px] font-medium text-slate-400">Phân loại kho</label>
          <select
            value={form.loai_hoa_chat}
            onChange={(e) => setForm({ ...form, loai_hoa_chat: e.target.value })}
            className={C.controlInput}
          >
            <option value="HOA_CHAT">{loaiHoaChatLabel("HOA_CHAT")}</option>
            <option value="VAT_TU">{loaiHoaChatLabel("VAT_TU")}</option>
            <option value="TEST">{loaiHoaChatLabel("TEST")}</option>
          </select>
        </div>
        <BoDungCuTextField label="Đơn vị tính" value={form.don_vi_tinh} onChange={(v) => setForm({ ...form, don_vi_tinh: v })} />
        <BoDungCuTextField label="Quy cách" value={form.quy_cach} onChange={(v) => setForm({ ...form, quy_cach: v })} />
        <BoDungCuTextField label="Nồng độ" value={form.nong_do} onChange={(v) => setForm({ ...form, nong_do: v })} />
      </div>
      <div className="space-y-1">
        <label className="ml-1 text-[11px] font-medium text-slate-400">Hạn sử dụng</label>
        <input
          type="date"
          value={form.han_su_dung}
          onChange={(e) => setForm({ ...form, han_su_dung: e.target.value })}
          className={C.controlInput}
        />
      </div>
      <div className="space-y-1">
        <label className="ml-1 text-[11px] font-medium text-slate-400">Ghi chú</label>
        <textarea
          value={form.ghi_chu}
          rows={3}
          onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
          className={C.textareaCompact}
        />
      </div>
      <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
    </QuanTriFormDialogShell>
  );
}
