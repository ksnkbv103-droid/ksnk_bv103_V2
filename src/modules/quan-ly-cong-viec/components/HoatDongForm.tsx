"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { createHoatDong } from "../actions/hoat-dong.actions";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div>
          <label className={`mb-1.5 ml-1 block ${bv103DesignTokens.labelBlockMuted}`}>Nội dung ghi chú *</label>
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
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onCancel) {
              onCancel();
              return;
            }
            formRef.current?.reset();
          }}
          className={`bv103-control-h rounded-lg border border-slate-200 bg-white px-6 py-2.5 ${bv103DesignTokens.labelBlock} font-semibold uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50`}
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`bv103-control-h inline-flex items-center rounded-lg bg-[var(--primary)] px-8 ${bv103DesignTokens.labelBlock} font-semibold uppercase tracking-widest text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50`}
        >
          {loading ? "Đang gửi…" : "Gửi ghi chú"}
        </button>
      </div>
    </form>
  );
}
