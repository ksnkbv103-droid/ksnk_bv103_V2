"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { recordSteamDailyBdAction } from "../../actions/cssd-batch.actions";
import {
  pickDefaultChuongTrinh,
  resolveChuongTrinhOptionsForMachine,
  type ChuongTrinhMayOption,
} from "../../lib/me-tiet-khuan-chuong-trinh";
import type { SterilizerMethod } from "../../helpers/me-tiet-khuan-machine-kind";
import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_ACTION_SECONDARY,
  CSSD_UI_CONTROL,
  CSSD_UI_CONTROL_NATIVE,
  CSSD_UI_FORM_LABEL,
  CSSD_UI_PANEL,
  CSSD_UI_PANEL_TITLE,
  CSSD_UI_STEP_HINT,
} from "../../shared/ui/cssd-ui-chrome";

const DANH_MUC_THIET_BI_PATH = "/quan-tri-he-thong/danh-muc/thiet-bi";
const DANH_MUC_LOAI_MAY_TK_PATH = getDanhMucAdminPath("LOAI_MAY_TIET_KHUAN");

type Machine = {
  id: string;
  ten_thiet_bi?: string;
  loai_ten_hien_thi?: string;
  phuong_phap?: SterilizerMethod | string | null;
  specs?: Record<string, unknown> | null;
  chuong_trinh_gan_nhat?: string | null;
  mdm_chuong_trinh?: Array<Record<string, unknown>> | null;
};

type Props = {
  machines: Machine[];
  machineId: string;
  nguoiLoad: string;
  chuongTrinhMa: string;
  onMachineChange: (id: string) => void;
  onNguoiLoadChange: (v: string) => void;
  onChuongTrinhMaChange: (ma: string, opt: ChuongTrinhMayOption | null) => void;
  onCancel: () => void;
  onStart: () => void;
};

/** Form tạo mẻ tiệt khuẩn — bắt chọn chương trình theo máy. */
export default function MeTietKhuanCreateStep({
  machines,
  machineId,
  nguoiLoad,
  chuongTrinhMa,
  onMachineChange,
  onNguoiLoadChange,
  onChuongTrinhMaChange,
  onCancel,
  onStart,
}: Props) {
  const [bdPending, startBd] = useTransition();
  const [lastBd, setLastBd] = useState<"DAT" | "KHONG_DAT" | null>(null);
  const selected = machines.find((m) => m.id === machineId);
  const showBd = selected?.phuong_phap === "HOI_NUOC";

  const chuongOptions = useMemo(
    () => resolveChuongTrinhOptionsForMachine(selected),
    [selected],
  );

  const recordBd = (ketQua: "DAT" | "KHONG_DAT") => {
    if (!machineId) {
      toast.error("Chọn máy trước khi ghi BD đầu ngày.");
      return;
    }
    startBd(async () => {
      const r = await recordSteamDailyBdAction({ thietBiId: machineId, ketQua });
      if (!r.success) {
        toast.error(r.error || "Không ghi được BD đầu ngày.");
        return;
      }
      setLastBd(ketQua);
      toast.success(
        ketQua === "DAT"
          ? `Đã ghi BD đầu ngày ĐẠT (${r.ymd}).`
          : `Đã ghi BD đầu ngày không đạt (${r.ymd}) — không tạo mẻ hơi nước cho đến khi có BD đạt mới.`,
      );
    });
  };

  const handleMachineChange = (id: string) => {
    setLastBd(null);
    onMachineChange(id);
    const m = machines.find((x) => x.id === id);
    if (!m) {
      onChuongTrinhMaChange("", null);
      return;
    }
    const opts = resolveChuongTrinhOptionsForMachine(m);
    const def = pickDefaultChuongTrinh(opts, m.chuong_trinh_gan_nhat || undefined);
    onChuongTrinhMaChange(def?.ma || "", def);
  };

  const handleChuongChange = (ma: string) => {
    const opt = chuongOptions.find((o) => o.ma === ma) || null;
    onChuongTrinhMaChange(ma, opt);
  };

  const canStart = Boolean(machineId && nguoiLoad.trim() && chuongTrinhMa);

  return (
    <>
      <button type="button" onClick={onCancel} className={`${CSSD_UI_STEP_HINT} hover:text-slate-700`}>
        ← Danh sách mẻ
      </button>
      <div className="mx-auto max-w-xl space-y-[var(--bv103-space-3)] pt-2">
        <div className={`space-y-8 p-8 ${CSSD_UI_PANEL}`}>
          <div className="text-center">
            <h2 className={CSSD_UI_PANEL_TITLE}>Tạo mẻ mới</h2>
            <p className={CSSD_UI_STEP_HINT}>Chọn thiết bị, chương trình máy và người vận hành</p>
          </div>
          <div className="space-y-[var(--bv103-space-3)]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-4 pr-1">
                <label className={CSSD_UI_FORM_LABEL}>Máy tiệt khuẩn</label>
                <span className="text-[11px] font-medium text-slate-400">
                  <Link href={DANH_MUC_THIET_BI_PATH} className="text-[var(--primary)] underline-offset-2 hover:underline">
                    Danh mục thiết bị và máy
                  </Link>
                  <span className="mx-1.5 text-slate-300" aria-hidden>
                    ·
                  </span>
                  <Link href={DANH_MUC_LOAI_MAY_TK_PATH} className="text-[var(--primary)] underline-offset-2 hover:underline">
                    Loại máy tiệt khuẩn
                  </Link>
                </span>
              </div>
              <select
                className={CSSD_UI_CONTROL_NATIVE}
                value={machineId}
                onChange={(e) => handleMachineChange(e.target.value)}
                data-testid="me-create-machine"
              >
                <option value="">-- Chọn máy --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.loai_ten_hien_thi ? `${m.ten_thiet_bi ?? ""} — ${m.loai_ten_hien_thi}` : (m.ten_thiet_bi ?? "")}
                  </option>
                ))}
              </select>
            </div>
            {machineId ? (
              <div className="space-y-2">
                <label className={`ml-4 ${CSSD_UI_FORM_LABEL}`}>Chương trình máy</label>
                <select
                  className={CSSD_UI_CONTROL_NATIVE}
                  value={chuongTrinhMa}
                  onChange={(e) => handleChuongChange(e.target.value)}
                  data-testid="me-create-chuong-trinh"
                >
                  <option value="">-- Chọn chương trình --</option>
                  {chuongOptions.map((o) => (
                    <option key={o.ma} value={o.ma}>
                      {o.ten}
                      {o.nguon_label ? ` · ${o.nguon_label}` : o.nguon === "qt21_hd03" ? " · mẫu mặc định" : ""}
                    </option>
                  ))}
                </select>
                <p className="pl-4 text-[11px] font-medium text-slate-500">
                  Bắt buộc chọn chương trình. Danh mục theo máy trống → dùng mẫu mặc định theo phương pháp.
                </p>
              </div>
            ) : null}
            {showBd ? (
              <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                <p className={`${CSSD_UI_FORM_LABEL} !ml-0 text-amber-900`}>
                  Bowie–Dick đầu ngày (máy hơi nước)
                </p>
                <p className="text-[11px] font-medium text-amber-800/80">
                  Máy hơi nước cần BD đạt hôm nay trước khi tạo mẻ. BD không đạt thì chặn đến khi ghi BD đạt mới.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={bdPending}
                    onClick={() => recordBd("DAT")}
                    className={`${CSSD_UI_ACTION_PRIMARY} !h-10 !min-h-[40px] !px-3 ${lastBd === "DAT" ? "ring-2 ring-emerald-400" : ""}`}
                    data-testid="steam-daily-bd-dat"
                  >
                    Ghi BD ĐẠT
                  </button>
                  <button
                    type="button"
                    disabled={bdPending}
                    onClick={() => recordBd("KHONG_DAT")}
                    className={`${CSSD_UI_ACTION_SECONDARY} !h-10 !min-h-[40px] !px-3 ${lastBd === "KHONG_DAT" ? "ring-2 ring-rose-400" : ""}`}
                    data-testid="steam-daily-bd-khong-dat"
                  >
                    Ghi BD không đạt
                  </button>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className={`ml-4 ${CSSD_UI_FORM_LABEL}`}>Người nạp mẻ</label>
              <input
                className={CSSD_UI_CONTROL}
                placeholder="Nhập tên người nạp..."
                value={nguoiLoad}
                onChange={(e) => onNguoiLoadChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onCancel} className={`${CSSD_UI_ACTION_SECONDARY} h-12 flex-1`}>
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canStart) {
                  toast.error("Chọn máy, chương trình và người nạp.");
                  return;
                }
                onStart();
              }}
              className={`${CSSD_UI_ACTION_PRIMARY} h-12 flex-1`}
              data-testid="me-create-start"
            >
              <Play size={16} /> Mở mẻ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
