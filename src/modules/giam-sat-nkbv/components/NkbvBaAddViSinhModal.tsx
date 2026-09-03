"use client";

/**
 * Thêm XN vi sinh từ ngày lưới BA — prefill mã BA + ngày lấy mẫu → kho fact_vi_sinh.
 */

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { createNkbvViSinhStoreRecord } from "../actions/giam-sat-nkbv-vi-sinh-store.actions";
import type { NkbvViSinhKetQua } from "../lib/nkbv-vi-sinh-template";
import { specimenSelectGroups } from "../lib/nkbv-specimen-canonical";
import { nkbvKhoaSelectOptions } from "../lib/nkbv-khoa-options";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

type KhoaOpt = { id: string; ma?: string; ten: string };

type Props = {
  open: boolean;
  onClose: () => void;
  maBenhAn: string;
  ngayLayMau: string;
  maBenhNhan?: string | null;
  hoTen?: string | null;
  ngayVaoVien?: string | null;
  defaultKhoaId?: string | null;
  khoas?: KhoaOpt[];
  onCreated?: () => void;
};

function toKhoaSelectOpts(khoas: KhoaOpt[]) {
  return nkbvKhoaSelectOptions(
    khoas.map((k) => ({
      id: k.id,
      ma_danh_muc: k.ma || null,
      ten_danh_muc: k.ten || null,
    })),
  );
}

function genMaXn(maBa: string, ngay: string): string {
  const d = ngay.replace(/-/g, "").slice(0, 8);
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MAN-${maBa.slice(0, 12)}-${d}-${r}`;
}

export default function NkbvBaAddViSinhModal({
  open,
  onClose,
  maBenhAn,
  ngayLayMau,
  maBenhNhan,
  hoTen,
  ngayVaoVien,
  defaultKhoaId,
  khoas = [],
  onCreated,
}: Props) {
  const khoaOptions = useMemo(() => toKhoaSelectOpts(khoas), [khoas]);
  const specimenGroups = useMemo(() => specimenSelectGroups(), []);
  const [maXn, setMaXn] = useState(() => genMaXn(maBenhAn, ngayLayMau));
  const [khoaId, setKhoaId] = useState(defaultKhoaId || "");
  const [chuan, setChuan] = useState("");
  const [loaiLis, setLoaiLis] = useState("");
  const [tacNhan, setTacNhan] = useState("");
  const [soLuong, setSoLuong] = useState("");
  const [ketQua, setKetQua] = useState<NkbvViSinhKetQua>("DUONG_TINH");
  const [busy, setBusy] = useState(false);

  // Mỗi lần mở ngày mới — sinh mã XN + khoa mặc định lại
  React.useEffect(() => {
    if (!open) return;
    setMaXn(genMaXn(maBenhAn, ngayLayMau));
    setKhoaId(defaultKhoaId || "");
    setChuan("");
    setLoaiLis("");
    setTacNhan("");
    setSoLuong("");
    setKetQua("DUONG_TINH");
  }, [open, maBenhAn, ngayLayMau, defaultKhoaId]);

  if (!open) return null;

  const onSubmit = async () => {
    const chuanCode = chuan.trim();
    const bp = loaiLis.trim() || chuanCode;
    if (!khoaId.trim()) {
      toast.error("Chọn khoa chỉ định");
      return;
    }
    if (!bp) {
      toast.error("Chọn / nhập loại bệnh phẩm");
      return;
    }
    if (!tacNhan.trim() && ketQua === "DUONG_TINH") {
      toast.error("Nhập tác nhân (XN dương tính)");
      return;
    }
    setBusy(true);
    const res = await createNkbvViSinhStoreRecord({
      ma_xet_nghiem: maXn.trim() || genMaXn(maBenhAn, ngayLayMau),
      ma_benh_an: maBenhAn,
      ma_benh_nhan: maBenhNhan || null,
      ho_ten_benh_nhan: hoTen || null,
      ngay_lay_mau: ngayLayMau,
      ngay_vao_vien: ngayVaoVien || null,
      khoa_yeu_cau_id: khoaId,
      loai_benh_pham: bp,
      loai_benh_pham_chuan: chuanCode || null,
      tac_nhan: tacNhan.trim() || "—",
      so_luong: soLuong.trim() || null,
      ket_qua: ketQua,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error || "Không thêm được XN");
      return;
    }
    toast.success(
      ketQua === "DUONG_TINH"
        ? "Đã thêm XN (+) — hiện trên cột xét nghiệm"
        : "Đã thêm XN vào kho (âm tính không lên lưới phân tích)",
    );
    onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3">
      <div
        className={`${C.panelSurface} max-h-[90vh] w-full max-w-md overflow-auto p-4`}
        role="dialog"
        aria-labelledby="ba-add-xn-title"
      >
        <h3 id="ba-add-xn-title" className={`${C.panelTitle} text-sm`}>
          Thêm xét nghiệm vi sinh
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Từ ngày lưới · BA <span className="font-semibold">{maBenhAn}</span> · lấy mẫu{" "}
          <span className="font-semibold">{ngayLayMau}</span>
        </p>

        <div className="mt-3 space-y-2 text-[11px]">
          <label className="block">
            <span className="font-semibold text-slate-600">Mã XN</span>
            <input
              className={`${C.controlInput} mt-0.5 w-full`}
              value={maXn}
              onChange={(e) => setMaXn(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Khoa chỉ định</span>
            <select
              className={`${C.controlInput} mt-0.5 w-full`}
              value={khoaId}
              onChange={(e) => setKhoaId(e.target.value)}
            >
              <option value="">— Chọn khoa —</option>
              {khoaOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Bệnh phẩm chuẩn (CDC)</span>
            <select
              className={`${C.controlInput} mt-0.5 w-full`}
              value={chuan}
              onChange={(e) => {
                setChuan(e.target.value);
                if (!loaiLis) setLoaiLis(e.target.value);
              }}
            >
              <option value="">— Chọn —</option>
              {specimenGroups.map((g) => (
                <optgroup key={g.group} label={g.groupLabel}>
                  {g.options.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Bệnh phẩm (nhãn LIS)</span>
            <input
              className={`${C.controlInput} mt-0.5 w-full`}
              value={loaiLis}
              onChange={(e) => setLoaiLis(e.target.value)}
              placeholder="VD: Nước tiểu giữa dòng"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Tác nhân</span>
            <input
              className={`${C.controlInput} mt-0.5 w-full`}
              value={tacNhan}
              onChange={(e) => setTacNhan(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Số lượng / CFU</span>
            <input
              className={`${C.controlInput} mt-0.5 w-full`}
              value={soLuong}
              onChange={(e) => setSoLuong(e.target.value)}
              placeholder="VD: 10^5"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600">Kết quả</span>
            <select
              className={`${C.controlInput} mt-0.5 w-full`}
              value={ketQua}
              onChange={(e) => setKetQua(e.target.value as NkbvViSinhKetQua)}
            >
              <option value="DUONG_TINH">Dương tính (lên lưới)</option>
              <option value="AM_TINH">Âm tính</option>
              <option value="NHIEU">Nhiễu</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold"
            onClick={onClose}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            onClick={() => void onSubmit()}
            disabled={busy}
          >
            {busy ? "Đang lưu…" : "Lưu vào kho"}
          </button>
        </div>
      </div>
    </div>
  );
}
