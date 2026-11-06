"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, FileX, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  decommissionInstrumentsAction,
  type DecommissionInstrumentsInput,
} from "@/modules/cssd-erp/actions/cssd-lifecycle.actions";
import { getLoaiDungCuOptionsAction } from "@/modules/quan-tri-he-thong/danh-muc/actions/bo-dung-cu.actions";
import { listActiveBoForInstrumentTransferAction } from "@/modules/cssd-su-co/actions/su-co-bo-picker.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type LoaiOption = {
  id: string;
  ten_danh_muc: string;
};

type BoOption = {
  id: string;
  ten_bo: string;
  ma_bo: string | null;
};

export default function InstrumentDecommissionForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [sourceKind, setSourceKind] = useState<"KHO_LE" | "BO_DUNG_CU">("KHO_LE");
  const [loaiOptions, setLoaiOptions] = useState<LoaiOption[]>([]);
  const [boOptions, setBoOptions] = useState<BoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedLoaiId, setSelectedLoaiId] = useState("");
  const [selectedBoId, setSelectedBoId] = useState("");
  const [soLuong, setSoLuong] = useState(1);
  const [lyDo, setLyDo] = useState<DecommissionInstrumentsInput["lyDoLoaiBien"]>("HAO_MON_CO_HOC");
  const [soBienBan, setSoBienBan] = useState("");
  const [nguoiGiamDinh, setNguoiGiamDinh] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingOptions(true);
    void Promise.all([
      getLoaiDungCuOptionsAction(),
      listActiveBoForInstrumentTransferAction(),
    ]).then(([loaiRes, boRes]) => {
      if (!alive) return;
      setLoadingOptions(false);
      if (loaiRes.success && loaiRes.data) {
        setLoaiOptions(loaiRes.data);
      }
      if (boRes.success && boRes.data) {
        setBoOptions(boRes.data);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoaiId) {
      toast.error("Vui lòng chọn loại dụng cụ cần loại biên/thanh lý.");
      return;
    }
    if (sourceKind === "BO_DUNG_CU" && !selectedBoId) {
      toast.error("Vui lòng chọn bộ dụng cụ chứa chi tiết cần loại biên.");
      return;
    }
    if (soLuong <= 0) {
      toast.error("Số lượng loại biên phải lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await decommissionInstrumentsAction({
        sourceKind,
        loaiDungCuId: selectedLoaiId,
        boDungCuId: sourceKind === "BO_DUNG_CU" ? selectedBoId : null,
        soLuong,
        lyDoLoaiBien: lyDo,
        soBienBan: soBienBan.trim() || undefined,
        nguoiGiamDinh: nguoiGiamDinh.trim() || undefined,
        ghiChu: ghiChu.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Không thể thực hiện loại biên.");
        return;
      }

      toast.success(`Đã ghi nhận biên bản loại biên -${soLuong} dụng cụ thành công!`);
      setSubmitted(true);
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi loại biên.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSoLuong(1);
    setSoBienBan("");
    setGhiChu("");
  };

  if (submitted) {
    return (
      <div className="mx-auto my-4 max-w-xl animate-in space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Đã lập biên bản loại biên thành công!</h3>
          <p className="mt-1 text-xs text-slate-500">
            Dụng cụ hao mòn đã được trừ khỏi cơ số kiểm kê mà không ghi nhận thành sự cố an toàn người bệnh.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button type="button" onClick={handleReset} className={`${T.btnPrimary} text-xs`}>
            <PlusCircle size={15} /> Lập biên bản khác
          </button>
          <Link href="/cssd-dung-cu?tab=BO" className={`${T.btnSecondary} text-xs`}>
            Xem danh mục bộ
          </Link>
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
            <FileX size={18} className="text-slate-700" />
            Biên bản Loại biên / Thanh lý Dụng cụ Hao mòn Kỹ thuật
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Dành cho dụng cụ hết hạn sử dụng tiệt khuẩn, cùn mòn hoặc biến dạng cơ học. Tách bạch hoàn toàn khỏi báo hỏng/mất do sơ suất.
          </p>
        </div>

        <div className="flex items-center gap-4 border-b border-slate-100 pb-3 text-xs font-semibold">
          <span className="text-slate-600">Nguồn loại biên:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="sourceKind"
              checked={sourceKind === "KHO_LE"}
              onChange={() => setSourceKind("KHO_LE")}
              className="text-[var(--primary)]"
            />
            Kho dự phòng (Kho lẻ)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="sourceKind"
              checked={sourceKind === "BO_DUNG_CU"}
              onChange={() => setSourceKind("BO_DUNG_CU")}
              className="text-[var(--primary)]"
            />
            Trong bộ dụng cụ cụ thể
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sourceKind === "BO_DUNG_CU" ? (
            <div className="space-y-1.5 md:col-span-2">
              <label className={bv103LayoutChrome.labelBlock}>
                Bộ dụng cụ nguồn <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBoId}
                onChange={(e) => setSelectedBoId(e.target.value)}
                disabled={loadingOptions || submitting}
                className={`${bv103LayoutChrome.controlInput} bg-white`}
                required
              >
                <option value="">-- Chọn bộ dụng cụ --</option>
                {boOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.ma_bo ? `${opt.ma_bo} — ${opt.ten_bo}` : opt.ten_bo}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5 md:col-span-2">
            <label className={bv103LayoutChrome.labelBlock}>
              Loại dụng cụ loại biên <span className="text-red-500">*</span>
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
              Số lượng thanh lý/loại biên <span className="text-red-500">*</span>
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
            <label className={bv103LayoutChrome.labelBlock}>
              Lý do hao mòn kỹ thuật <span className="text-red-500">*</span>
            </label>
            <select
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value as DecommissionInstrumentsInput["lyDoLoaiBien"])}
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
              required
            >
              <option value="HAO_MON_CO_HOC">Hao mòn cơ học / Cùn mép sau chu kỳ sử dụng</option>
              <option value="RI_SET_MOI_KIM_LOAI">Rỉ sét / Mỏi nứt kim loại do nhiệt ẩm</option>
              <option value="HET_TUOI_THO_TIET_KHUAN">Hết tuổi thọ tiệt khuẩn theo quy chuẩn</option>
              <option value="KHONG_CON_PHU_HOP_CHUYEN_MON">Thay đổi quy chuẩn ngoại khoa / Thay thế bộ</option>
              <option value="KHAC">Lý do hao mòn kỹ thuật khác</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Số biên bản / Căn cứ hội đồng</label>
            <input
              type="text"
              value={soBienBan}
              onChange={(e) => setSoBienBan(e.target.value)}
              placeholder="VD: BBTL-2026/01-KSNK..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Cán bộ giám định / ĐD trưởng</label>
            <input
              type="text"
              value={nguoiGiamDinh}
              onChange={(e) => setNguoiGiamDinh(e.target.value)}
              placeholder="VD: KTV Trưởng, Bác sĩ KSNK..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={bv103LayoutChrome.labelBlock}>Ghi chú thẩm định kỹ thuật</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Tình trạng chi tiết (nứt mép, rỉ bề mặt, cong vênh)..."
              disabled={submitting}
              className={`${bv103LayoutChrome.controlInput} bg-white`}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting || !selectedLoaiId || (sourceKind === "BO_DUNG_CU" && !selectedBoId)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 text-xs font-semibold text-white shadow-md hover:bg-slate-900 active:scale-95 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX size={16} />}
          Xác nhận loại biên / Thanh lý
        </button>
      </div>
    </form>
  );
}
