"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PackagePlus, PlusCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { receiveNewInstrumentsAction } from "@/modules/cssd-erp/actions/cssd-lifecycle.actions";
import { getLoaiDungCuOptionsAction } from "@/modules/quan-tri-he-thong/danh-muc/actions/bo-dung-cu.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type LoaiOption = {
  id: string;
  ten_danh_muc: string;
};

export default function InstrumentReceiveNewForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [loaiOptions, setLoaiOptions] = useState<LoaiOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedLoaiId, setSelectedLoaiId] = useState("");
  const [soLuong, setSoLuong] = useState(1);
  const [nguonCap, setNguonCap] = useState("Phòng Trang bị BV103");
  const [soChungTu, setSoChungTu] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingOptions(true);
    void getLoaiDungCuOptionsAction().then((res) => {
      if (!alive) return;
      setLoadingOptions(false);
      if (res.success && res.data) {
        setLoaiOptions(res.data);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoaiId) {
      toast.error("Vui lòng chọn loại dụng cụ cần nhập mới.");
      return;
    }
    if (soLuong <= 0) {
      toast.error("Số lượng nhập phải lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await receiveNewInstrumentsAction({
        loaiDungCuId: selectedLoaiId,
        soLuong,
        nguonCap: nguonCap.trim() || undefined,
        soChungTu: soChungTu.trim() || undefined,
        ghiChu: ghiChu.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Không thể ghi nhận nhập kho mới.");
        return;
      }

      toast.success(`Đã tiếp nhận +${soLuong} dụng cụ vào kho lẻ CSSD!`);
      setSubmitted(true);
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi nhập mới.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSoLuong(1);
    setSoChungTu("");
    setGhiChu("");
  };

  if (submitted) {
    return (
      <div className="mx-auto my-4 max-w-xl animate-in space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Tiếp nhận dụng cụ mới thành công!</h3>
          <p className="mt-1 text-xs text-slate-500">
            Số lượng đã được cộng trực tiếp vào cơ số kho lẻ dự phòng CSSD.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button type="button" onClick={handleReset} className={`${T.btnPrimary} text-xs`}>
            <PlusCircle size={15} /> Nhập tiếp loại khác
          </button>
          <Link href="/cssd-dung-cu?tab=LOAI" className={`${T.btnSecondary} text-xs`}>
            Xem tồn kho loại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PackagePlus size={18} className="text-emerald-600" />
            Phiếu Tiếp nhận Dụng cụ Mới (Trang bị / Vật tư y tế)
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Ghi nhận bổ sung cơ số mới vào kho dự phòng CSSD theo chứng từ giao nhận thiết bị y tế.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className={bv103LayoutChrome.labelBlock}>
              Loại dụng cụ tiếp nhận <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedLoaiId}
              onChange={(e) => setSelectedLoaiId(e.target.value)}
              disabled={loadingOptions || submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
              required
            >
              <option value="">-- Chọn loại dụng cụ --</option>
              {loaiOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.ten_danh_muc}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>
              Số lượng tiếp nhận <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={soLuong}
              onChange={(e) => setSoLuong(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white tabular-nums`}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Nguồn cấp / Đơn vị bàn giao</label>
            <input
              type="text"
              value={nguonCap}
              onChange={(e) => setNguonCap(e.target.value)}
              placeholder="VD: Phòng Trang bị BV103, Hãng sản xuất..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Số phiếu nhập / Số hóa đơn / Chứng từ</label>
            <input
              type="text"
              value={soChungTu}
              onChange={(e) => setSoChungTu(e.target.value)}
              placeholder="VD: PNK-202611-001..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Ghi chú tiếp nhận</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Thông tin quy cách, lô sản xuất (nếu có)..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting || !selectedLoaiId}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus size={16} />}
          Xác nhận nhập kho mới
        </button>
      </div>
    </form>
  );
}
