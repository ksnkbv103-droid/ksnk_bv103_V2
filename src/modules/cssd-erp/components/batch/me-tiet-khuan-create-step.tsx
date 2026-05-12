"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";

const DANH_MUC_THIET_BI_PATH = "/quan-tri-he-thong/danh-muc/thiet-bi";
const DANH_MUC_LOAI_MAY_TK_PATH = getDanhMucAdminPath("LOAI_MAY_TIET_KHUAN");

type Machine = { id: string; ten_thiet_bi?: string; loai_ten_hien_thi?: string };

type Props = {
  machines: Machine[];
  machineId: string;
  nguoiLoad: string;
  onMachineChange: (id: string) => void;
  onNguoiLoadChange: (v: string) => void;
  onCancel: () => void;
  onStart: () => void;
};

/** Form tạo mẻ tiệt khuẩn (tách file để trang chính gọn). */
export default function MeTietKhuanCreateStep({
  machines,
  machineId,
  nguoiLoad,
  onMachineChange,
  onNguoiLoadChange,
  onCancel,
  onStart,
}: Props) {
  return (
    <>
      <button type="button" onClick={onCancel} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#026f17]">
        ← Danh sách mẻ
      </button>
      <div className="mx-auto max-w-xl space-y-6 pt-2">
        <div className="space-y-8 rounded-[40px] border border-slate-100 bg-white p-8 shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#026f17]">Tạo mẻ mới</h2>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Bước 1: Chọn thiết bị và người vận hành</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-4 pr-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Máy tiệt khuẩn</label>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <Link href={DANH_MUC_THIET_BI_PATH} className="text-[#026f17] underline-offset-2 hover:underline">
                    Danh mục thiết bị và máy
                  </Link>
                  <span className="mx-1.5 text-slate-300" aria-hidden>
                    ·
                  </span>
                  <Link href={DANH_MUC_LOAI_MAY_TK_PATH} className="text-[#026f17] underline-offset-2 hover:underline">
                    Loại máy tiệt khuẩn
                  </Link>
                </span>
              </div>
              <select
                className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 text-sm font-bold outline-none focus:border-[#026f17]"
                value={machineId}
                onChange={(e) => onMachineChange(e.target.value)}
              >
                <option value="">-- Chọn máy --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.loai_ten_hien_thi ? `${m.ten_thiet_bi ?? ""} — ${m.loai_ten_hien_thi}` : (m.ten_thiet_bi ?? "")}
                  </option>
                ))}
              </select>
              <p className="ml-4 text-[10px] leading-relaxed text-slate-500">
                Danh sách lấy từ{" "}
                <strong className="font-semibold text-slate-700">thiết bị hoạt động/sẵn sàng</strong> có gắn loại trong
                danh mục loại máy — chỉnh tại hai liên kết phía trên nếu cần thêm máy hay loại mới.
              </p>
            </div>
            <div className="space-y-2">
              <label className="ml-4 text-[10px] font-black uppercase text-slate-500">Người load mẻ</label>
              <input
                className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 text-sm font-bold outline-none focus:border-[#026f17]"
                placeholder="Nhập tên người load..."
                value={nguoiLoad}
                onChange={(e) => onNguoiLoadChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onCancel} className="h-14 flex-1 rounded-2xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Hủy
            </button>
            <button type="button" onClick={onStart} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#026f17] text-[10px] font-black uppercase tracking-widest text-[#FFD700] shadow-xl">
              <Play size={16} /> Bắt đầu mẻ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
