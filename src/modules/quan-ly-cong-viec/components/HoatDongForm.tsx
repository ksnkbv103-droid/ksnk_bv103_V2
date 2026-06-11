"use client";

import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { createHoatDong } from "../actions/hoat-dong.actions";

interface Props {
  congViecId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HoatDongForm({ congViecId, onSuccess, onCancel }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const noiDung = formData.get("noi_dung") as string;

    try {
      await createHoatDong({
        id_cong_viec: congViecId,
        loai_hoat_dong: "BAO_CAO_TIEN_DO",
        noi_dung: noiDung,
      });

      toast.success("Đã ghi chú tiến độ.");
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi ghi chú");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`${UI.sectionGapLg} animate-in fade-in duration-500`}>
      <div className={`${UI.shellPadded} space-y-4 shadow-sm`}>
        <div>
          <label className={`mb-1.5 block ${UI.formLabel}`}>Nội dung ghi chú *</label>
          <textarea
            name="noi_dung"
            required
            rows={4}
            className="min-h-[100px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
            placeholder="Ghi chú bổ sung (tiến độ % cập nhật qua checklist phía trên)…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onCancel) {
              onCancel();
              return;
            }
            formRef.current?.reset();
          }} className={UI.btnSecondary}>
          Hủy
        </button>
        <button type="submit" disabled={loading} className={UI.btnPrimary}>
          {loading ? "Đang gửi…" : "Gửi ghi chú"}
        </button>
      </div>
    </form>
  );
}
