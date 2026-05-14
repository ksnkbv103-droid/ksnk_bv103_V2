"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createHoatDong } from "../actions/hoat-dong.actions";

interface Props {
  congViecId: string;
  /** Bắt đầu thanh trượt theo % hiện tại trên DB */
  initialPhanTram?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HoatDongForm({ congViecId, initialPhanTram = 0, onSuccess, onCancel }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n / 5) * 5));
  const [phanTram, setPhanTram] = useState(() => clampPct(initialPhanTram));

  useEffect(() => {
    setPhanTram(clampPct(initialPhanTram));
  }, [congViecId, initialPhanTram]);

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
        phan_tram_hoan_thanh: phanTram,
      });

      toast.success("Gửi báo cáo tiến độ thành công!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi báo cáo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
            Nội dung báo cáo *
          </label>
          <textarea
            name="noi_dung"
            required
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium outline-none focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]/20 transition-all resize-none min-h-[100px]"
            placeholder="Mô tả những gì bạn đã hoàn thành..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tiến độ công việc
            </label>
            <span className="text-xs font-black text-[#026f17]">{phanTram}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={phanTram}
            onChange={(e) => setPhanTram(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#026f17]"
          />
          <p className="mt-2 text-[10px] font-medium text-slate-400">
            100%: chuyển sang trạng thái chờ cấp trên nghiệm thu (trên hệ thống là «Chờ nghiệm thu»).
          </p>
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
            setPhanTram(clampPct(initialPhanTram));
          }}
          className="bv103-control-h rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h inline-flex items-center rounded-lg bg-[#026f17] px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-[#015a12] disabled:opacity-50"
        >
          {loading ? "Đang gửi báo cáo..." : "Gửi báo cáo tiến độ"}
        </button>
      </div>
    </form>
  );
}
