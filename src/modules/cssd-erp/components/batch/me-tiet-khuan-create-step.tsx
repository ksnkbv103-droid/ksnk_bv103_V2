"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { recordSteamDailyBdAction } from "../../actions/cssd-batch.actions";
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
  const [bdPending, startBd] = useTransition();
  const [lastBd, setLastBd] = useState<"DAT" | "KHONG_DAT" | null>(null);

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
          : `Đã ghi BD đầu ngày KHÔNG ĐẠT (${r.ymd}) — không được nạp mẻ steam.`,
      );
    });
  };

  return (
    <>
      <button type="button" onClick={onCancel} className={`${CSSD_UI_STEP_HINT} hover:text-slate-700`}>
        ← Danh sách mẻ
      </button>
      <div className="mx-auto max-w-xl space-y-[var(--bv103-space-3)] pt-2">
        <div className={`space-y-8 p-8 ${CSSD_UI_PANEL}`}>
          <div className="text-center">
            <h2 className={CSSD_UI_PANEL_TITLE}>Tạo mẻ mới</h2>
            <p className={CSSD_UI_STEP_HINT}>Chọn thiết bị và người vận hành</p>
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
                onChange={(e) => {
                  setLastBd(null);
                  onMachineChange(e.target.value);
                }}
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
              <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                <p className={`${CSSD_UI_FORM_LABEL} !ml-0 text-amber-900`}>
                  Bowie–Dick đầu ngày (steam · QT.21)
                </p>
                <p className="text-[11px] font-medium text-amber-800/80">
                  Máy steam bắt buộc BD ĐẠT hôm nay trước khi tạo/chốt nạp. Không thay BD trên form QC mẻ.
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
              <label className={`ml-4 ${CSSD_UI_FORM_LABEL}`}>Người load mẻ</label>
              <input
                className={CSSD_UI_CONTROL}
                placeholder="Nhập tên người load..."
                value={nguoiLoad}
                onChange={(e) => onNguoiLoadChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onCancel} className={`${CSSD_UI_ACTION_SECONDARY} h-12 flex-1`}>
              Hủy
            </button>
            <button type="button" onClick={onStart} className={`${CSSD_UI_ACTION_PRIMARY} h-12 flex-1`}>
              <Play size={16} /> Bắt đầu mẻ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
