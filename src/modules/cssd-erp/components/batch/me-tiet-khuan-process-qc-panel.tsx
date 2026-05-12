"use client";

import React from "react";
import { Settings2, Thermometer, User, CheckCircle } from "lucide-react";

function selectTone(
  v: "DAT" | "KHONG_DAT" | "" | "NA",
  mode: "tri" | "bd",
): string {
  if (mode === "bd") {
    if (v === "DAT") return "border-emerald-500 bg-emerald-50 text-emerald-700";
    if (v === "KHONG_DAT") return "border-red-500 bg-red-50 text-red-700";
    return "border-slate-200 bg-white";
  }
  if (v === "DAT") return "border-emerald-500 bg-emerald-50 text-emerald-700";
  if (v === "KHONG_DAT") return "border-red-500 bg-red-50 text-red-700";
  return "border-slate-200 bg-white";
}

export default function MeTietKhuanProcessQcPanel({
  nguoiUnload,
  setNguoiUnload,
  nhietDo,
  setNhietDo,
  testBI,
  setTestBI,
  testCI,
  setTestCI,
  testBD,
  setTestBD,
  onFinish,
}: {
  nguoiUnload: string;
  setNguoiUnload: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  testBI: "DAT" | "KHONG_DAT" | "";
  setTestBI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testCI: "DAT" | "KHONG_DAT" | "";
  setTestCI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testBD: "DAT" | "KHONG_DAT" | "NA";
  setTestBD: (v: "DAT" | "KHONG_DAT" | "NA") => void;
  onFinish: () => void;
}) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col h-[600px]">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="text-[#026f17]" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">3. Thông số & QC (Kết thúc)</h3>
      </div>
      <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-1">
            <User size={12} /> Người dỡ mẻ (Unload)
          </label>
          <input
            className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs focus:border-[#026f17] outline-none"
            placeholder="Tên người dỡ..."
            value={nguoiUnload}
            onChange={(e) => setNguoiUnload(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-1">
            <Thermometer size={12} /> Nhiệt độ & Áp suất
          </label>
          <input
            className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs focus:border-[#026f17] outline-none"
            placeholder="Vd: 134°C - 2.1 bar"
            value={nhietDo}
            onChange={(e) => setNhietDo(e.target.value)}
          />
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">
            Kết quả Test Sinh/Hóa học
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase text-center block">Test BI</label>
              <select
                className={`w-full h-12 rounded-xl text-xs font-bold px-2 outline-none border-2 ${selectTone(testBI, "tri")}`}
                value={testBI}
                onChange={(e) => setTestBI(e.target.value as "DAT" | "KHONG_DAT" | "")}
              >
                <option value="">- Chọn -</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase text-center block">Test CI</label>
              <select
                className={`w-full h-12 rounded-xl text-xs font-bold px-2 outline-none border-2 ${selectTone(testCI, "tri")}`}
                value={testCI}
                onChange={(e) => setTestCI(e.target.value as "DAT" | "KHONG_DAT" | "")}
              >
                <option value="">- Chọn -</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase text-center block">Bowie-Dick</label>
              <select
                className={`w-full h-12 rounded-xl text-xs font-bold px-2 outline-none border-2 ${selectTone(testBD, "bd")}`}
                value={testBD}
                onChange={(e) => setTestBD(e.target.value as "DAT" | "KHONG_DAT" | "NA")}
              >
                <option value="NA">Không áp dụng</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onFinish}
        className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#026f17] text-[12px] font-black uppercase tracking-widest text-[#FFD700] shadow-xl transition-all active:scale-95"
      >
        <CheckCircle size={20} /> Kết thúc mẻ & đánh giá
      </button>
    </div>
  );
}
