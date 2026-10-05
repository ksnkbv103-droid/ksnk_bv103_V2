"use client";

import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { SterilizerMethod } from "../../helpers/me-tiet-khuan-machine-kind";
import { CSSD_UI_CONTROL, CSSD_UI_FORM_LABEL } from "../../shared/ui/cssd-ui-chrome";

type Tri = "DAT" | "KHONG_DAT" | "";
type Bi = "CHUA_CO" | "DANG_U" | "AM" | "DUONG" | "";
type Ong = "AM" | "DUONG" | "";

const METHOD_LABEL: Record<SterilizerMethod, string> = {
  HOI_NUOC: "Hơi nước",
  PLASMA_H2O2: "Plasma H₂O₂",
  EO: "EO",
};

function TriTap({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) {
  const opts: { id: Exclude<Tri, "">; label: string; on: string }[] = [
    { id: "DAT", label: "Đạt", on: "border-emerald-600 bg-emerald-600 text-white" },
    { id: "KHONG_DAT", label: "Không đạt", on: "border-red-600 bg-red-600 text-white" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`h-11 flex-1 rounded-xl border-2 text-xs font-semibold ${
            value === opt.id ? opt.on : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BiChoice({
  value,
  onChange,
  allowDangU,
}: {
  value: Bi;
  onChange: (v: Bi) => void;
  allowDangU: boolean;
}) {
  const opts: { id: Exclude<Bi, "">; label: string }[] = [
    { id: "CHUA_CO", label: "Chưa có" },
    ...(allowDangU ? [{ id: "DANG_U" as const, label: "Đã đặt BI – đang ủ" }] : []),
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

function OngChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Ong;
  onChange: (v: Ong) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className={CSSD_UI_FORM_LABEL}>{label}</span>
      <div className="flex gap-2">
        {(
          [
            { id: "DUONG", label: "Dương" },
            { id: "AM", label: "Âm" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`h-10 flex-1 rounded-xl border-2 text-xs font-semibold ${
              value === opt.id ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </label>
  );
}

function BiBm02Fields({
  ongDoiChung,
  setOngDoiChung,
  ongThu,
  setOngThu,
  gioBatDauU,
  setGioBatDauU,
  gioDoc,
  setGioDoc,
  soLoBi,
  setSoLoBi,
}: {
  ongDoiChung: Ong;
  setOngDoiChung: (v: Ong) => void;
  ongThu: Ong;
  setOngThu: (v: Ong) => void;
  gioBatDauU: string;
  setGioBatDauU: (v: string) => void;
  gioDoc: string;
  setGioDoc: (v: string) => void;
  soLoBi: string;
  setSoLoBi: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
      <p className="text-[11px] font-medium text-violet-900">Sổ BI (BM.02) — đối chứng phải dương mới hợp lệ</p>
      <OngChoice label="Ống đối chứng" value={ongDoiChung} onChange={setOngDoiChung} />
      <OngChoice label="Ống thử nghiệm" value={ongThu} onChange={setOngThu} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={CSSD_UI_FORM_LABEL}>Giờ bắt đầu ủ</span>
          <input
            type="datetime-local"
            className={CSSD_UI_CONTROL}
            value={gioBatDauU}
            onChange={(e) => setGioBatDauU(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className={CSSD_UI_FORM_LABEL}>Giờ đọc</span>
          <input
            type="datetime-local"
            className={CSSD_UI_CONTROL}
            value={gioDoc}
            onChange={(e) => setGioDoc(e.target.value)}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={CSSD_UI_FORM_LABEL}>Số lô BI</span>
        <input className={CSSD_UI_CONTROL} value={soLoBi} maxLength={80} onChange={(e) => setSoLoBi(e.target.value)} />
      </label>
    </div>
  );
}

function toIsoFromLocal(value: string): string {
  const s = String(value || "").trim();
  if (!s) return "";
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : s;
}

export default function MeTietKhuanProcessQcPanel({
  showForm,
  method,
  coImplant,
  steamBiReminder,
  choBi,
  biTuanSauNha,
  chuongTrinh,
  setChuongTrinh,
  chuongOptions = [],
  chuongTrinhMa = "",
  onSelectChuongMa,
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
  ongDoiChung,
  setOngDoiChung,
  ongThu,
  setOngThu,
  gioBatDauU,
  setGioBatDauU,
  gioDoc,
  setGioDoc,
  soLoBi,
  setSoLoBi,
  batchId,
  onFinish,
  onSubmitBi,
}: {
  showForm: boolean;
  method: SterilizerMethod | null;
  coImplant: boolean;
  steamBiReminder: string | null;
  choBi: boolean;
  /** ME-01: mẻ hơi nước đã nhả — ghi BI tuần. */
  biTuanSauNha?: boolean;
  chuongTrinh: string;
  setChuongTrinh: (v: string) => void;
  chuongOptions?: { ma: string; ten: string; nguon_label?: string }[];
  chuongTrinhMa?: string;
  onSelectChuongMa?: (ma: string) => void;
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
  ongDoiChung: Ong;
  setOngDoiChung: (v: Ong) => void;
  ongThu: Ong;
  setOngThu: (v: Ong) => void;
  gioBatDauU: string;
  setGioBatDauU: (v: string) => void;
  gioDoc: string;
  setGioDoc: (v: string) => void;
  soLoBi: string;
  setSoLoBi: (v: string) => void;
  batchId: string;
  onFinish: (isPass: boolean) => void;
  onSubmitBi?: (
    ketQua: "AM" | "DUONG",
    biBm02: {
      ongDoiChung: string;
      ongThu: string;
      gioBatDauU: string;
      gioDoc: string;
      soLoBi: string;
    },
  ) => void;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (showForm || choBi || biTuanSauNha) setOpen(true);
  }, [showForm, choBi, biTuanSauNha, batchId]);

  const bm02Payload = () => ({
    ongDoiChung,
    ongThu,
    gioBatDauU: toIsoFromLocal(gioBatDauU),
    gioDoc: toIsoFromLocal(gioDoc),
    soLoBi,
  });

  if (choBi || biTuanSauNha) {
    return (
      <div className="space-y-3 rounded-[var(--radius-shell)] border border-violet-200 bg-violet-50/70 p-6">
        <p className="text-sm font-semibold text-violet-900">
          {biTuanSauNha ? "Ghi BI tuần (mẻ đã nhả)" : "Mẻ đang chờ kết quả BI"}
        </p>
        <p className="text-[11px] font-medium text-violet-800/80">
          {biTuanSauNha
            ? "Ghi sổ BM.02 — âm chỉ cập nhật mốc tuần; dương thì thu hồi."
            : "Ống đối chứng phải dương. Âm → nhả mẻ; dương → lập sự cố."}
        </p>
        <BiBm02Fields
          ongDoiChung={ongDoiChung}
          setOngDoiChung={setOngDoiChung}
          ongThu={ongThu}
          setOngThu={setOngThu}
          gioBatDauU={gioBatDauU}
          setGioBatDauU={setGioBatDauU}
          gioDoc={gioDoc}
          setGioDoc={setGioDoc}
          soLoBi={soLoBi}
          setSoLoBi={setSoLoBi}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white"
            onClick={() => onSubmitBi?.("AM", bm02Payload())}
          >
            {biTuanSauNha ? "Ghi BI âm" : "Nhả mẻ (BI âm)"}
          </button>
          <button
            type="button"
            className="h-11 rounded-xl border border-red-300 bg-white px-4 text-xs font-semibold text-red-700"
            onClick={() => onSubmitBi?.("DUONG", bm02Payload())}
          >
            BI dương
          </button>
        </div>
      </div>
    );
  }

  if (!showForm) return null;

  const biBatBuoc = coImplant || method === "PLASMA_H2O2" || method === "EO";
  const needsBm02 = trangThaiBi === "AM" || trangThaiBi === "DUONG";
  const anyFail =
    thongSoVatLy === "KHONG_DAT" || ciNgoaiGoi === "KHONG_DAT" || ciPcd === "KHONG_DAT" || trangThaiBi === "DUONG";

  const handleFinish = (isPass: boolean) => {
    if (!thongSoVatLy || !ciNgoaiGoi || !ciPcd) {
      toast.error("Thông số vật lý, CI ngoài gói và CI PCD đều phải chọn Đạt hoặc Không đạt.");
      return;
    }
    if (!trangThaiBi) {
      toast.error("Chọn kết quả BI: chưa có, đang ủ, âm hoặc dương.");
      return;
    }
    if (needsBm02 && (!ongDoiChung || !ongThu || !soLoBi || !gioBatDauU || !gioDoc)) {
      toast.error("Nhập đủ sổ BI BM.02 (đối chứng, ống thử, giờ ủ/đọc, số lô).");
      return;
    }
    if (isPass && anyFail) {
      toast.error("Có mục Không đạt hoặc BI dương — không nhả mẻ.");
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
      {!open ? (
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-[var(--radius-shell)] border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
          <Settings2 className="mb-2 h-8 w-8 text-[var(--primary)]" aria-hidden />
          <p className="mb-3 text-xs font-semibold text-slate-700">Đánh giá đang giữ nháp</p>
          <button type="button" onClick={() => setOpen(true)} className="h-11 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white">
            Mở đánh giá
          </button>
        </div>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogTitle className="sr-only">Đánh giá mẻ tiệt khuẩn</DialogTitle>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pr-14">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {method ? METHOD_LABEL[method] : "Chưa rõ phương pháp máy"}
                {coImplant ? " · có implant" : ""}
              </p>
              {biBatBuoc ? (
                <span className="text-[11px] font-medium text-violet-700">
                  BI bắt buộc trước khi nhả
                  {coImplant ? " · không nhả khẩn mẻ có implant" : ""}
                </span>
              ) : null}
            </div>
            {steamBiReminder ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">{steamBiReminder}</p>
            ) : null}
            <label className="block space-y-1">
              <span className={CSSD_UI_FORM_LABEL}>Chương trình</span>
              {chuongOptions.length > 0 ? (
                <select
                  className={CSSD_UI_CONTROL}
                  value={chuongTrinhMa || ""}
                  onChange={(e) => onSelectChuongMa?.(e.target.value)}
                  data-testid="me-qc-chuong-trinh"
                >
                  <option value="">-- Chọn chương trình --</option>
                  {chuongOptions.map((o) => (
                    <option key={o.ma} value={o.ma}>
                      {o.ten}
                      {o.nguon_label ? ` · ${o.nguon_label}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={CSSD_UI_CONTROL} value={chuongTrinh} maxLength={80} onChange={(e) => setChuongTrinh(e.target.value)} />
              )}
              <span className="block text-[11px] text-slate-500">NV có thể sửa nhiệt/áp/thời gian bên dưới — lệch prefill được ghi audit QC.</span>
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
              <p className="text-xs font-semibold text-slate-700">Vật lý</p>
              <TriTap value={thongSoVatLy} onChange={setThongSoVatLy} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">CI ngoài gói</p>
              <TriTap value={ciNgoaiGoi} onChange={setCiNgoaiGoi} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">CI PCD</p>
              <TriTap value={ciPcd} onChange={setCiPcd} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">BI</p>
              <BiChoice value={trangThaiBi} onChange={setTrangThaiBi} allowDangU={!biBatBuoc && method === "HOI_NUOC"} />
            </div>
            {needsBm02 ? (
              <BiBm02Fields
                ongDoiChung={ongDoiChung}
                setOngDoiChung={setOngDoiChung}
                ongThu={ongThu}
                setOngThu={setOngThu}
                gioBatDauU={gioBatDauU}
                setGioBatDauU={setGioBatDauU}
                gioDoc={gioDoc}
                setGioDoc={setGioDoc}
                soLoBi={soLoBi}
                setSoLoBi={setSoLoBi}
              />
            ) : null}
            <div className="flex gap-2 pb-2">
              <button
                type="button"
                className={`h-11 flex-1 rounded-xl text-xs font-semibold text-white ${anyFail ? "bg-slate-300" : "bg-emerald-700"}`}
                onClick={() => handleFinish(true)}
              >
                Nhả mẻ
              </button>
              <button
                type="button"
                className={`h-11 flex-1 rounded-xl text-xs font-semibold ${anyFail ? "bg-red-600 text-white" : "border border-red-200 bg-white text-red-700"}`}
                onClick={() => handleFinish(false)}
              >
                Kết luận không đạt
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
