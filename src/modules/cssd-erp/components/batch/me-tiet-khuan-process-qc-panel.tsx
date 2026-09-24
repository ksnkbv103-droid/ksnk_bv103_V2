"use client";

import React from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PassFailToggle } from "./me-tiet-khuan-qc-primitives";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { SterilizerMethod } from "../../helpers/me-tiet-khuan-machine-kind";
import { CSSD_UI_CONTROL, CSSD_UI_FORM_LABEL } from "../../shared/ui/cssd-ui-chrome";

type Tri = "DAT" | "KHONG_DAT" | "";
type Bi = "CHUA_CO" | "AM" | "DUONG" | "";

const METHOD_LABEL: Record<SterilizerMethod, string> = {
  HOI_NUOC: "Hơi nước",
  PLASMA_H2O2: "Plasma H₂O₂",
  EO: "EO",
};

function BiChoice({
  value,
  onChange,
}: {
  value: Bi;
  onChange: (v: Bi) => void;
}) {
  const opts: { id: Bi; label: string }[] = [
    { id: "CHUA_CO", label: "Chưa có kết quả" },
    { id: "AM", label: "Âm" },
    { id: "DUONG", label: "Dương" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`h-11 rounded-xl border-2 px-3 text-xs font-semibold ${
            value === opt.id ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function MeTietKhuanProcessQcPanel({
  showForm,
  method,
  coImplant,
  steamBiReminder,
  choBi,
  chuongTrinh,
  setChuongTrinh,
  nhietDo,
  setNhietDo,
  apSuat,
  setApSuat,
  thoiGianChuKy,
  setThoiGianChuKy,
  thongSoVatLy,
  setThongSoVatLy,
  ciNgoaiGoi,
  setCiNgoaiGoi,
  ciPcd,
  setCiPcd,
  trangThaiBi,
  setTrangThaiBi,
  anhMinhChung,
  setAnhMinhChung,
  onFinish,
  onSubmitBi,
}: {
  showForm: boolean;
  method: SterilizerMethod | null;
  coImplant: boolean;
  steamBiReminder: string | null;
  choBi: boolean;
  chuongTrinh: string;
  setChuongTrinh: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  apSuat: string;
  setApSuat: (v: string) => void;
  thoiGianChuKy: string;
  setThoiGianChuKy: (v: string) => void;
  thongSoVatLy: Tri;
  setThongSoVatLy: (v: Tri) => void;
  ciNgoaiGoi: Tri;
  setCiNgoaiGoi: (v: Tri) => void;
  ciPcd: Tri;
  setCiPcd: (v: Tri) => void;
  trangThaiBi: Bi;
  setTrangThaiBi: (v: Bi) => void;
  anhMinhChung: string;
  setAnhMinhChung: (v: string) => void;
  onFinish: (isPass: boolean) => void;
  onSubmitBi?: (ketQua: "AM" | "DUONG") => void;
}) {
  if (choBi) {
    return (
      <div className="space-y-3 rounded-[var(--radius-shell)] border border-violet-200 bg-violet-50/70 p-6">
        <p className="text-sm font-semibold text-violet-900">Mẻ đang chờ kết quả BI</p>
        <p className="text-[11px] font-medium text-violet-800/80">
          Bộ chưa sang kho vô khuẩn. Nhập kết quả khi có: âm thì nhả mẻ, dương thì lập sự cố.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-11 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white" onClick={() => onSubmitBi?.("AM")}>
            BI âm — nhả mẻ
          </button>
          <button type="button" className="h-11 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white" onClick={() => onSubmitBi?.("DUONG")}>
            BI dương
          </button>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
        <Settings2 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-xs font-medium text-slate-500">Chưa mở form — bấm «Xong máy — mở đánh giá QC».</p>
      </div>
    );
  }

  const biBatBuoc = coImplant || method === "PLASMA_H2O2" || method === "EO";
  const anyFail = thongSoVatLy === "KHONG_DAT" || ciNgoaiGoi === "KHONG_DAT" || ciPcd === "KHONG_DAT" || trangThaiBi === "DUONG";

  const handleFinish = (isPass: boolean) => {
    if (!thongSoVatLy || !ciNgoaiGoi || !ciPcd) {
      toast.error("Thông số vật lý, CI ngoài gói và CI PCD đều phải chọn Đạt hoặc Không đạt.");
      return;
    }
    if (!trangThaiBi) {
      toast.error("Chọn kết quả BI: chưa có, âm hoặc dương.");
      return;
    }
    if (isPass && anyFail) {
      toast.error("Có mục Không đạt hoặc BI dương — không kết luận đạt.");
      return;
    }
    if (!isPass && !anyFail) {
      toast.error("Chưa có mục Không đạt.");
      return;
    }
    onFinish(isPass);
  };

  return (
    <>
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-[var(--radius-shell)] border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
        <Settings2 className="mb-2 h-8 w-8 text-[var(--primary)]" aria-hidden />
        <p className="text-xs font-semibold text-slate-700">Đánh giá QC đang mở</p>
      </div>
      <Dialog open={showForm} onOpenChange={() => { /* giữ mở đến khi kết luận */ }}>
        <DialogContent
          className="flex max-h-[min(90dvh,880px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Đánh giá QC mẻ tiệt khuẩn</DialogTitle>
          <div className="space-y-4 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {method ? METHOD_LABEL[method] : "Chưa rõ phương pháp máy"}
                {coImplant ? " · có implant" : ""}
              </p>
              {biBatBuoc ? (
                <span className="text-[11px] font-medium text-violet-700">BI bắt buộc trước khi nhả</span>
              ) : null}
            </div>
            {steamBiReminder ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
                {steamBiReminder}
              </p>
            ) : null}
            <label className="block space-y-1">
              <span className={CSSD_UI_FORM_LABEL}>Chương trình</span>
              <input className={CSSD_UI_CONTROL} value={chuongTrinh} maxLength={80} onChange={(e) => setChuongTrinh(e.target.value)} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className={CSSD_UI_FORM_LABEL}>Nhiệt độ</span>
                <input className={CSSD_UI_CONTROL} inputMode="decimal" value={nhietDo} onChange={(e) => setNhietDo(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className={CSSD_UI_FORM_LABEL}>Áp suất</span>
                <input className={CSSD_UI_CONTROL} inputMode="decimal" value={apSuat} onChange={(e) => setApSuat(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className={CSSD_UI_FORM_LABEL}>Thời gian chu kỳ (phút)</span>
                <input className={CSSD_UI_CONTROL} inputMode="numeric" value={thoiGianChuKy} onChange={(e) => setThoiGianChuKy(e.target.value)} />
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Thông số vật lý</p>
              <PassFailToggle value={thongSoVatLy} onChange={setThongSoVatLy} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">CI ngoài gói (một lần cho cả mẻ)</p>
              <PassFailToggle value={ciNgoaiGoi} onChange={setCiNgoaiGoi} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">CI PCD (loại 5)</p>
              <PassFailToggle value={ciPcd} onChange={setCiPcd} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Chỉ thị sinh học (BI)</p>
              <BiChoice value={trangThaiBi} onChange={setTrangThaiBi} />
            </div>
            <label className="block space-y-1">
              <span className={CSSD_UI_FORM_LABEL}>Ảnh minh chứng (không bắt buộc)</span>
              <input className={CSSD_UI_CONTROL} value={anhMinhChung} onChange={(e) => setAnhMinhChung(e.target.value)} placeholder="URL nếu có" />
            </label>
            <div className="flex gap-2 pb-2">
              <button type="button" className="h-11 flex-1 rounded-xl bg-emerald-600 text-xs font-semibold text-white" onClick={() => handleFinish(true)}>
                Kết luận đạt
              </button>
              <button type="button" className="h-11 flex-1 rounded-xl bg-red-600 text-xs font-semibold text-white" onClick={() => handleFinish(false)}>
                Kết luận không đạt
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
