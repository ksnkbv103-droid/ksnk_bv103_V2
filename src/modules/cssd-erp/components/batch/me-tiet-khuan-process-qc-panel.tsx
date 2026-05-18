"use client";

import React from "react";
import { Settings2, Thermometer, User, CheckCircle, Camera } from "lucide-react";

function selectTone(v: "DAT" | "KHONG_DAT" | "" | "NA", mode: "tri" | "bd"): string {
  if (mode === "bd") {
    if (v === "DAT") return "border-emerald-500 bg-emerald-50 text-emerald-700";
    if (v === "KHONG_DAT") return "border-red-500 bg-red-50 text-red-700";
    return "border-slate-200 bg-white";
  }
  if (v === "DAT") return "border-emerald-500 bg-emerald-50 text-emerald-700";
  if (v === "KHONG_DAT") return "border-red-500 bg-red-50 text-red-700";
  return "border-slate-200 bg-white";
}

type Tri = "DAT" | "KHONG_DAT" | "";

export default function MeTietKhuanProcessQcPanel({
  showForm,
  showBowieDick,
  nguoiUnload,
  setNguoiUnload,
  nhietDo,
  setNhietDo,
  thongSoMay,
  setThongSoMay,
  chiThiTiepXuc,
  setChiThiTiepXuc,
  chiThiDaThongSo,
  setChiThiDaThongSo,
  testSinhHoc,
  setTestSinhHoc,
  testCI,
  setTestCI,
  testBD,
  setTestBD,
  anhMay,
  setAnhMay,
  anhTiepXuc,
  setAnhTiepXuc,
  anhDaThongSo,
  setAnhDaThongSo,
  anhSinhHoc,
  setAnhSinhHoc,
  anhBowieDick,
  setAnhBowieDick,
  onFinish,
}: {
  showForm: boolean;
  showBowieDick: boolean;
  nguoiUnload: string;
  setNguoiUnload: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  thongSoMay: string;
  setThongSoMay: (v: string) => void;
  chiThiTiepXuc: Tri;
  setChiThiTiepXuc: (v: Tri) => void;
  chiThiDaThongSo: Tri;
  setChiThiDaThongSo: (v: Tri) => void;
  testSinhHoc: "DAT" | "KHONG_DAT" | "NA" | "";
  setTestSinhHoc: (v: "DAT" | "KHONG_DAT" | "NA" | "") => void;
  testCI: "DAT" | "KHONG_DAT" | "";
  setTestCI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testBD: "DAT" | "KHONG_DAT" | "NA";
  setTestBD: (v: "DAT" | "KHONG_DAT" | "NA") => void;
  anhMay: string;
  setAnhMay: (v: string) => void;
  anhTiepXuc: string;
  setAnhTiepXuc: (v: string) => void;
  anhDaThongSo: string;
  setAnhDaThongSo: (v: string) => void;
  anhSinhHoc: string;
  setAnhSinhHoc: (v: string) => void;
  anhBowieDick: string;
  setAnhBowieDick: (v: string) => void;
  onFinish: (isPass: boolean) => void;
}) {
  if (!showForm) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[40px] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center shadow-inner">
        <Settings2 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Chưa mở form đánh giá</p>
        <p className="mt-2 max-w-sm text-[11px] font-medium leading-relaxed text-slate-500">
          Sau khi chạy xong chu trình trên máy, bấm <strong className="text-slate-700">«Kết thúc chu trình tiệt khuẩn»</strong> ở cột
          giữa để nhập thông số máy, chỉ thị và kết luận mẻ.
        </p>
      </div>
    );
  }

  const photoRow = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500">
        <Camera className="h-3 w-3" aria-hidden /> Ảnh minh chứng — {label}
      </label>
      <input
        className="h-11 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-medium outline-none focus:border-[#026f17]"
        placeholder="URL hoặc mã tham chiếu file (tùy cấu hình lưu trữ)…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Settings2 className="text-[#026f17]" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Thông số & đánh giá QC</h3>
      </div>
      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto pr-2">
        <div className="space-y-2">
          <label className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
            <User size={12} /> Người dỡ mẻ
          </label>
          <input
            className="h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-xs font-bold outline-none focus:border-[#026f17]"
            placeholder="Tên người dỡ…"
            value={nguoiUnload}
            onChange={(e) => setNguoiUnload(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
            <Thermometer size={12} /> Nhiệt độ & áp suất (ghi nhận mẻ)
          </label>
          <input
            className="h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-xs font-bold outline-none focus:border-[#026f17]"
            placeholder="Ví dụ: 134°C — 2,1 bar"
            value={nhietDo}
            onChange={(e) => setNhietDo(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase text-slate-500">Thông số máy (chu trình)</label>
          <textarea
            className="min-h-[72px] w-full resize-none rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs font-medium outline-none focus:border-[#026f17]"
            placeholder="Thời gian, chương trình, số chu kỳ…"
            value={thongSoMay}
            onChange={(e) => setThongSoMay(e.target.value)}
          />
          {photoRow("thông số máy", anhMay, setAnhMay)}
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h4 className="border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-700">Chỉ thị</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500">Chỉ thị tiếp xúc</label>
              <select
                className={`h-12 w-full rounded-xl border-2 px-2 text-xs font-bold outline-none ${selectTone(chiThiTiepXuc, "tri")}`}
                value={chiThiTiepXuc}
                onChange={(e) => setChiThiTiepXuc(e.target.value as Tri)}
              >
                <option value="">- Chọn -</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
              {photoRow("chỉ thị tiếp xúc", anhTiepXuc, setAnhTiepXuc)}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500">Chỉ thị đa thông số</label>
              <select
                className={`h-12 w-full rounded-xl border-2 px-2 text-xs font-bold outline-none ${selectTone(chiThiDaThongSo, "tri")}`}
                value={chiThiDaThongSo}
                onChange={(e) => setChiThiDaThongSo(e.target.value as Tri)}
              >
                <option value="">- Chọn -</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
              {photoRow("chỉ thị đa thông số", anhDaThongSo, setAnhDaThongSo)}
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h4 className="border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-700">Test tùy chọn</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500">Test sinh học (mẻ)</label>
              <select
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-2 text-xs font-bold outline-none"
                value={testSinhHoc}
                onChange={(e) => setTestSinhHoc(e.target.value as "DAT" | "KHONG_DAT" | "NA" | "")}
              >
                <option value="NA">Không làm</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
              {photoRow("test sinh học", anhSinhHoc, setAnhSinhHoc)}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500">Chỉ thị hóa học (CI)</label>
              <select
                className={`h-12 w-full rounded-xl border-2 px-2 text-xs font-bold outline-none ${selectTone(testCI, "tri")}`}
                value={testCI}
                onChange={(e) => setTestCI(e.target.value as "DAT" | "KHONG_DAT" | "")}
              >
                <option value="">- Chọn -</option>
                <option value="DAT">ĐẠT</option>
                <option value="KHONG_DAT">KHÔNG ĐẠT</option>
              </select>
            </div>
            {showBowieDick ? (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500">Bowie–Dick (hơi nước)</label>
                <select
                  className={`h-12 w-full rounded-xl border-2 px-2 text-xs font-bold outline-none ${selectTone(testBD, "bd")}`}
                  value={testBD}
                  onChange={(e) => setTestBD(e.target.value as "DAT" | "KHONG_DAT" | "NA")}
                >
                  <option value="NA">Không làm</option>
                  <option value="DAT">ĐẠT</option>
                  <option value="KHONG_DAT">KHÔNG ĐẠT</option>
                </select>
                {photoRow("Bowie–Dick", anhBowieDick, setAnhBowieDick)}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-medium text-slate-500">
                Bowie–Dick: <span className="font-semibold text-slate-700">không bắt buộc</span> với loại máy này.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onFinish(true)}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#026f17] text-[11px] font-black uppercase tracking-widest text-[#FFD700] shadow-lg transition-all active:scale-[0.99]"
        >
          <CheckCircle size={18} /> Kết luận ĐẠT → Cấp phát
        </button>
        <button
          type="button"
          onClick={() => onFinish(false)}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 text-[11px] font-black uppercase tracking-widest text-red-700 transition-all active:scale-[0.99]"
        >
          Kết luận KHÔNG ĐẠT
        </button>
      </div>
    </div>
  );
}
