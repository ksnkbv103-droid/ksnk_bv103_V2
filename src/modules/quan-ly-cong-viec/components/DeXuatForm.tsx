"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Send, Clock, BarChart } from "lucide-react";
import { createDeXuat } from "../actions/dexuat.actions";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DeXuatForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: formData.get("mo_ta") as string,
      han_hoan_thanh: formData.get("han_hoan_thanh") as string,
      loai_cong_viec: formData.get("loai_cong_viec") as "DINH_KY" | "DOT_XUAT" | "KHAN_CAP" | undefined,
      muc_do_uu_tien: formData.get("muc_do_uu_tien") as "CAO" | "TRUNG_BINH" | "THAP" | undefined,
    };

    try {
      await createDeXuat(payload);
      toast.success("Đã gửi đề xuất thành công! Đang chờ lãnh đạo phê duyệt.");
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi đề xuất");
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "bv103-control-h w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15";
  const inputPlainStyles =
    "bv103-control-h w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15";
  const labelStyles = bv103LayoutChrome.labelBlock;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={`space-y-5 p-5 sm:p-6 ${bv103LayoutChrome.panelSurface}`}>
        <p className={bv103LayoutChrome.noticeSlateRelaxed}>
          Đề xuất chỉ áp dụng cho <strong className="font-semibold text-slate-900">công việc nội bộ Khoa KSNK</strong>.
        </p>

        <div>
          <label className={labelStyles}>Tên công việc đề xuất *</label>
          <input
            name="tieu_de"
            required
            className={inputPlainStyles}
            placeholder="Ví dụ: Kiểm tra vệ sinh khoa Nội định kỳ…"
          />
        </div>

        <div>
          <label className={labelStyles}>Lý do và mô tả chi tiết</label>
          <textarea
            name="mo_ta"
            rows={3}
            className={bv103LayoutChrome.textareaCompact}
            placeholder="Tại sao cần thực hiện công việc này?"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelStyles}>Mức độ quan trọng</label>
            <div className="relative">
              <BarChart size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select name="muc_do_uu_tien" defaultValue="TRUNG_BINH" className={inputStyles}>
                <option value="CAO">Cao</option>
                <option value="TRUNG_BINH">Trung bình</option>
                <option value="THAP">Thấp</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelStyles}>Loại hình công việc</label>
            <select name="loai_cong_viec" defaultValue="DOT_XUAT" className={inputPlainStyles}>
              <option value="DOT_XUAT">Đột xuất (mặc định)</option>
              <option value="DINH_KY">Định kỳ</option>
              <option value="KHAN_CAP">Khẩn cấp</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyles}>Hạn hoàn thành mong muốn</label>
          <div className="relative">
            <Clock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="date" name="han_hoan_thanh" className={inputStyles} />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel?.();
          }}
          className="bv103-control-h rounded-xl border border-slate-200/90 bg-white px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Bỏ qua
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h inline-flex items-center justify-center gap-2 rounded-xl bg-[#026f17] px-8 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#025a12] disabled:opacity-50"
        >
          {loading ? (
            "Đang gửi…"
          ) : (
            <>
              <Send size={14} aria-hidden />
              Gửi đề xuất
            </>
          )}
        </button>
      </div>
    </form>
  );
}
