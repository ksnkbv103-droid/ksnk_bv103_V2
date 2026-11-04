"use client";

import React, { useMemo } from "react";
import type {
  BaGridCdhaCell,
  BaGridColumn,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import {
  statusBadgeLabel,
  type ViSinhAnalysisStatus,
} from "../lib/nkbv-vi-sinh-analysis-status";
import NkbvGridCriteriaAddPopover from "./NkbvGridCriteriaAddPopover";
import NkbvBaDayGrid, {
  baDayIdentityColumns,
  BA_DAY_COL_W_COMMON,
  BA_DAY_COL_W_NARROW,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import { isDeviceDateInStay } from "../lib/nkbv-ba-device-timeline";
import { nkbvKhoaSelectOptions, type NkbvKhoaOpt } from "../lib/nkbv-khoa-options";

type XnCell = BaGridXnCell;

type TcItem = { key: string; label: string; id?: string };
type CdhaCatalogItem = { criteriaKey: string; title: string; milestoneKind: string };

type Props = {
  days: BaGridColumn[];
  xnByDate: Record<string, XnCell[]>;
  cdhaByDate: Record<string, BaGridCdhaCell[]>;
  ssiTcByDate: Record<string, TcItem[]>;
  surgeryByDate: Record<string, TcItem[]>;
  /** Triệu chứng lâm sàng đã nhập trên BA — hiện mọi ngày, không chỉ IWP. */
  lamSangByDate?: Record<string, TcItem[]>;
  foleyOnDate?: Record<string, boolean>;
  ventOnDate?: Record<string, boolean>;
  cvcOnDate?: Record<string, boolean>;
  statusById: Record<string, ViSinhAnalysisStatus>;
  activeXnId: string | null;
  cdhaCatalog: CdhaCatalogItem[];
  ssiTcCatalog: Array<{ criteriaKey: string; title: string }>;
  allowedEdit: boolean;
  khoaByDate?: Record<string, string>;
  khoas?: NkbvKhoaOpt[];
  onChangeKhoa?: (date: string, khoaId: string) => void;
  defaultKhoa: string;
  /** Ràng buộc tick Foley/Vent/CVC trong đợt nằm viện. */
  ngayVaoVien?: string;
  ngayRaVien?: string | null;
  /**
   * Cửa sổ phân tích (Index / IWP·LS / RIT / SBAP…) — sau TC SSI, trước Khoa.
   * Kết luận + ghi chú đưa vào `tailColumns`.
   */
  windowColumns?: BaDayGridColumnDef[];
  /** Kết luận + ghi chú — sau CVC/Vent/Foley (một lần, không trùng). */
  tailColumns?: BaDayGridColumnDef[];
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onPickXn: (x: XnCell) => void;
  /** Thêm XN tay vào kho — ngày hàng = ngày lấy mẫu. */
  onAddXn?: (date: string) => void;
  onOpenCdha: (x: BaGridCdhaCell) => void;
  onRemoveMilestone: (id: string | undefined) => Promise<void>;
  onEditCdhaDate: (id: string, nextDate: string) => Promise<void>;
  onToggleCdha: (
    date: string,
    criteriaKey: string,
    title: string,
    kind: string,
  ) => Promise<void>;
  onOpenSurgeryOrSsi: (
    id: string,
    date: string,
    label: string,
    criteriaKey: string,
  ) => void;
  onAddSurgery: (date: string) => Promise<void>;
  onToggleSsiTc: (date: string, criteriaKey: string, title: string) => Promise<void>;
  onToggleLamSang?: (
    date: string,
    criteriaKey: string,
    title: string,
    turnOn: boolean,
  ) => Promise<void>;
  onToggleDevice?: (
    date: string,
    key: "device_foley" | "device_ventilator" | "device_central_line",
  ) => void;
};

const COMMON_LS_CATALOG = [
  { criteriaKey: "fever", title: "Sốt > 38,0°C" },
  { criteriaKey: "hypothermia", title: "Hạ thân nhiệt < 36,0°C" },
  { criteriaKey: "chills", title: "Rét run" },
  { criteriaKey: "hypotension", title: "Hạ huyết áp (HATT ≤ 90)" },
  { criteriaKey: "uti_dysuria", title: "Tiểu buốt / Tiểu rắt" },
  { criteriaKey: "uti_urgency", title: "Tiểu gấp" },
  { criteriaKey: "uti_suprapubic_tenderness", title: "Đau trên khớp mu" },
  { criteriaKey: "uti_costovertebral_angle", title: "Đau góc sườn - cột sống" },
  { criteriaKey: "resp_purulent_sputum", title: "Đờm mủ / đổi màu đờm" },
  { criteriaKey: "resp_dyspnea", title: "Khó thở / Thở nhanh" },
  { criteriaKey: "resp_cough", title: "Ho mới xuất hiện hoặc tăng dần" },
  { criteriaKey: "resp_wheezing_rales", title: "Ran ẩm / Ran nổ" },
  { criteriaKey: "ssi_purulent_drainage", title: "Chảy mủ từ vết mổ" },
  { criteriaKey: "ssi_localized_pain", title: "Đau / nhạy cảm đau tại vết mổ" },
  { criteriaKey: "ssi_localized_swelling", title: "Sưng / Nóng / Đỏ tại vết mổ" },
];

/**
 * Bảng chung dọc (timeline trung tâm):
 * Date | HD | Khoa | CVC | Vent | Foley | XN | CĐHA | LS | TC SSI | [Index…SBAP] | Kết luận | Ghi chú
 */
export default function NkbvBaCommonDayGrid({
  days,
  xnByDate,
  cdhaByDate,
  ssiTcByDate,
  surgeryByDate,
  lamSangByDate = {},
  foleyOnDate = {},
  ventOnDate = {},
  cvcOnDate = {},
  statusById,
  activeXnId,
  cdhaCatalog,
  ssiTcCatalog,
  allowedEdit,
  khoaByDate = {},
  khoas = [],
  onChangeKhoa,
  defaultKhoa: _defaultKhoa,
  ngayVaoVien = "",
  ngayRaVien = null,
  windowColumns = [],
  tailColumns = [],
  scrollRef,
  onScrollSync,
  onPickXn,
  onAddXn,
  onOpenCdha,
  onRemoveMilestone,
  onEditCdhaDate: _onEditCdhaDate,
  onToggleCdha,
  onOpenSurgeryOrSsi,
  onAddSurgery,
  onToggleSsiTc,
  onToggleLamSang,
  onToggleDevice,
}: Props) {
  const khoaOptions = nkbvKhoaSelectOptions(khoas);
  const cw = BA_DAY_COL_W_COMMON;

  // Tính chuỗi ngày lưu liên tục của dụng cụ (d1, d2, d3+ ✓) và ngày rút (Rút)
  const cvcStreaks = useMemo(() => {
    const res: Record<string, { streak: number; isRemovedYesterday: boolean }> = {};
    let count = 0;
    for (let i = 0; i < days.length; i++) {
      const d = days[i].date;
      const on = Boolean(cvcOnDate[d]);
      if (on) {
        count += 1;
        res[d] = { streak: count, isRemovedYesterday: false };
      } else {
        const wasOn = i > 0 && Boolean(cvcOnDate[days[i - 1].date]);
        res[d] = { streak: 0, isRemovedYesterday: wasOn };
        count = 0;
      }
    }
    return res;
  }, [days, cvcOnDate]);

  const ventStreaks = useMemo(() => {
    const res: Record<string, { streak: number; isRemovedYesterday: boolean }> = {};
    let count = 0;
    for (let i = 0; i < days.length; i++) {
      const d = days[i].date;
      const on = Boolean(ventOnDate[d]);
      if (on) {
        count += 1;
        res[d] = { streak: count, isRemovedYesterday: false };
      } else {
        const wasOn = i > 0 && Boolean(ventOnDate[days[i - 1].date]);
        res[d] = { streak: 0, isRemovedYesterday: wasOn };
        count = 0;
      }
    }
    return res;
  }, [days, ventOnDate]);

  const foleyStreaks = useMemo(() => {
    const res: Record<string, { streak: number; isRemovedYesterday: boolean }> = {};
    let count = 0;
    for (let i = 0; i < days.length; i++) {
      const d = days[i].date;
      const on = Boolean(foleyOnDate[d]);
      if (on) {
        count += 1;
        res[d] = { streak: count, isRemovedYesterday: false };
      } else {
        const wasOn = i > 0 && Boolean(foleyOnDate[days[i - 1].date]);
        res[d] = { streak: 0, isRemovedYesterday: wasOn };
        count = 0;
      }
    }
    return res;
  }, [days, foleyOnDate]);

  const deviceToggleEnabled = (date: string, alreadyOn: boolean) => {
    if (!allowedEdit || !onToggleDevice) return false;
    if (alreadyOn) return true; // cho tắt tick sai trước VV
    if (!ngayVaoVien) return false;
    return isDeviceDateInStay(date, ngayVaoVien, ngayRaVien).ok;
  };
  const deviceTitle = (base: string, date: string, alreadyOn: boolean) => {
    if (alreadyOn || !ngayVaoVien) return base;
    const bound = isDeviceDateInStay(date, ngayVaoVien, ngayRaVien);
    return bound.ok ? base : bound.reason || base;
  };

  const columns: BaDayGridColumnDef[] = [
    // --- TRỤC 1: HÀNH CHÍNH & PHƠI NHIỄM (Cố định bên trái) ---
    ...baDayIdentityColumns(),
    {
      id: "khoa",
      header: "Khoa",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day, rowIdx) => {
        const khoaId = khoaByDate[day.date] || "";
        const inStay = ngayVaoVien
          ? isDeviceDateInStay(day.date, ngayVaoVien, ngayRaVien).ok
          : false;
        const prevKhoa = rowIdx && rowIdx > 0 ? khoaByDate[days[rowIdx - 1].date] : "";
        const isTransfer = Boolean(prevKhoa && khoaId && prevKhoa !== khoaId);

        return (
          <div className="flex flex-col items-center gap-0.5">
            <select
              className="w-full max-w-full bg-transparent text-center text-[10px] font-medium outline-none"
              value={khoaId}
              disabled={!allowedEdit || !onChangeKhoa || !inStay}
              onChange={(e) => onChangeKhoa?.(day.date, e.target.value)}
              title={khoaOptions.find((o) => o.id === khoaId)?.label || "Chọn khoa theo mã"}
            >
              <option value="">—</option>
              {khoaOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {isTransfer ? (
              <span
                className="rounded bg-indigo-100 px-0.5 text-[9px] font-bold text-indigo-900 border border-indigo-200"
                title={`Chuyển từ [${prevKhoa}] sang [${khoaId}]. Áp dụng Transfer Rule 48h (ngày chuyển & ngày kế tiếp vẫn quy kết khoa cũ nếu DOE xảy ra).`}
              >
                ⇄
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "ct_cvc",
      header: "Cvc",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const info = cvcStreaks[day.date] || { streak: 0, isRemovedYesterday: false };
        const on = info.streak > 0;
        const enabled = deviceToggleEnabled(day.date, on);
        const isGe3 = info.streak >= 3;
        let text = "·";
        let cls = "text-slate-400";
        if (on) {
          text = `d${info.streak}`;
          cls = isGe3
            ? "bg-amber-800 text-white font-bold ring-1 ring-amber-400 shadow-xs"
            : "bg-amber-700/80 text-white font-semibold";
        } else if (info.isRemovedYesterday) {
          text = "Rút";
          cls = "bg-amber-100 text-amber-900 font-bold border border-amber-300";
        }
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_central_line")}
            className={`w-full rounded py-0.5 text-[10px] leading-tight ${cls} ${
              !enabled && !on ? "opacity-30" : ""
            }`}
            title={
              on
                ? `CVC: Ngày thứ ${info.streak} liên tục${isGe3 ? " (Đạt ngưỡng ≥3 ngày lịch CLABSI)" : ""}`
                : info.isRemovedYesterday
                  ? "CVC: Ngày đầu sau rút (Vẫn thuộc phạm vi quy kết CLABSI nếu DOE rơi vào hôm nay)"
                  : deviceTitle("Đường truyền trung tâm — lưu trên timeline BA", day.date, on)
            }
          >
            {text}
          </button>
        );
      },
    },
    {
      id: "ct_vent",
      header: "Vent",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const info = ventStreaks[day.date] || { streak: 0, isRemovedYesterday: false };
        const on = info.streak > 0;
        const enabled = deviceToggleEnabled(day.date, on);
        const isGe3 = info.streak >= 3;
        let text = "·";
        let cls = "text-slate-400";
        if (on) {
          text = `d${info.streak}`;
          cls = isGe3
            ? "bg-violet-800 text-white font-bold ring-1 ring-violet-400 shadow-xs"
            : "bg-violet-700/80 text-white font-semibold";
        } else if (info.isRemovedYesterday) {
          text = "Rút";
          cls = "bg-violet-100 text-violet-900 font-bold border border-violet-300";
        }
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_ventilator")}
            className={`w-full rounded py-0.5 text-[10px] leading-tight ${cls} ${
              !enabled && !on ? "opacity-30" : ""
            }`}
            title={
              on
                ? `Thở máy: Ngày thứ ${info.streak} liên tục${isGe3 ? " (Đạt ngưỡng ≥3 ngày lịch VAP/VAE)" : ""}`
                : info.isRemovedYesterday
                  ? "Thở máy: Ngày đầu sau rút (Vẫn thuộc phạm vi quy kết VAP nếu DOE rơi vào hôm nay)"
                  : deviceTitle("Thở máy — lưu trên timeline BA", day.date, on)
            }
          >
            {text}
          </button>
        );
      },
    },
    {
      id: "ct_foley",
      header: "Foley",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const info = foleyStreaks[day.date] || { streak: 0, isRemovedYesterday: false };
        const on = info.streak > 0;
        const enabled = deviceToggleEnabled(day.date, on);
        const isGe3 = info.streak >= 3;
        let text = "·";
        let cls = "text-slate-400";
        if (on) {
          text = `d${info.streak}`;
          cls = isGe3
            ? "bg-sky-800 text-white font-bold ring-1 ring-sky-400 shadow-xs"
            : "bg-sky-700/80 text-white font-semibold";
        } else if (info.isRemovedYesterday) {
          text = "Rút";
          cls = "bg-sky-100 text-sky-900 font-bold border border-sky-300";
        }
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_foley")}
            className={`w-full rounded py-0.5 text-[10px] leading-tight ${cls} ${
              !enabled && !on ? "opacity-30" : ""
            }`}
            title={
              on
                ? `Foley: Ngày thứ ${info.streak} liên tục${isGe3 ? " (Đạt ngưỡng ≥3 ngày lịch CAUTI)" : ""}`
                : info.isRemovedYesterday
                  ? "Foley: Ngày đầu sau rút (Vẫn thuộc phạm vi quy kết CAUTI nếu DOE rơi vào hôm nay)"
                  : deviceTitle("Ống thông tiểu lưu — lưu trên timeline BA", day.date, on)
            }
          >
            {text}
          </button>
        );
      },
    },
    {
      id: "xn",
      header: "Xn",
      minWidth: cw,
      render: (day) => {
        const items = xnByDate[day.date] || [];
        return (
          <div className="flex flex-col gap-0.5">
            {items.map((x) => {
              const st = statusById[x.id] || "CHUA_PHAN_TICH";
              const badge =
                st === "CHUA_PHAN_TICH"
                  ? "bg-amber-100 text-amber-900"
                  : st === "BO_QUA"
                    ? "bg-slate-100 text-slate-600"
                    : st === "KHONG_DU_TC"
                      ? "bg-amber-100 text-amber-950"
                      : "bg-emerald-100 text-emerald-800";
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => onPickXn(x)}
                  className={`rounded px-0.5 py-0.5 text-left leading-tight hover:bg-amber-50 ${
                    activeXnId === x.id ? "ring-2 ring-rose-500 font-semibold" : ""
                  } ${x.ket_qua_duong_tinh === false ? "opacity-70" : ""}`}
                  title="Chọn từng bệnh phẩm để phân tích"
                >
                  <span
                    className={`mb-0.5 inline-block rounded px-0.5 bv103-type-label font-semibold ${badge}`}
                  >
                    {x.ket_qua_duong_tinh === false ? "Âm" : statusBadgeLabel(st)}
                  </span>
                  <span className="block truncate font-semibold">{x.benh_pham}</span>
                  <span className="block truncate text-slate-700">{x.vi_khuan}</span>
                  {x.so_luong ? (
                    <span className="block truncate text-slate-500">SL {x.so_luong}</span>
                  ) : null}
                </button>
              );
            })}
            {allowedEdit && onAddXn ? (
              <button
                type="button"
                className="text-left text-[11px] font-semibold text-amber-800 hover:underline"
                onClick={() => onAddXn(day.date)}
                title="Thêm XN vi sinh vào kho — ngày lấy mẫu = ngày hàng"
              >
                + XN
              </button>
            ) : null}
            {!items.length && !(allowedEdit && onAddXn) ? (
              <span className="text-slate-300">—</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "cdha",
      header: "Cđha",
      minWidth: cw,
      render: (day) => {
        const items = cdhaByDate[day.date] || [];
        return (
          <div className="relative flex flex-col gap-0.5">
            {items.map((x) => (
              <div
                key={x.id}
                className="flex flex-col gap-0.5 border-b border-emerald-50 pb-0.5 last:border-0"
              >
                <div className="flex items-start gap-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenCdha(x)}
                    className="min-w-0 flex-1 truncate text-left font-medium text-emerald-900 hover:underline"
                  >
                    {x.mo_ta_benh_ly}
                  </button>
                  {allowedEdit && !x.id.startsWith("local-") ? (
                    <button
                      type="button"
                      className="shrink-0 text-[11px] text-rose-500"
                      title="Xóa"
                      onClick={() => void onRemoveMilestone(x.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {allowedEdit ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ CĐHA"
                triggerClassName="cursor-pointer text-[11px] font-semibold text-emerald-600"
                maxHeight={160}
              >
                {cdhaCatalog.map((cat) => (
                  <li key={cat.criteriaKey}>
                    <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[11px] hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={items.some(
                          (x) =>
                            (x.tieu_chuan_key || "imaging_chest") === cat.criteriaKey,
                        )}
                        onChange={() =>
                          void onToggleCdha(
                            day.date,
                            cat.criteriaKey,
                            cat.title,
                            cat.milestoneKind,
                          )
                        }
                      />
                      {cat.title}
                    </label>
                  </li>
                ))}
              </NkbvGridCriteriaAddPopover>
            ) : null}
            {!items.length && !allowedEdit ? (
              <span className="text-slate-300">—</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "ls",
      header: "Ls",
      minWidth: cw,
      render: (day) => {
        const items = lamSangByDate[day.date] || [];
        return (
          <div className="flex flex-col gap-0.5">
            {items.map((it) => (
              <div key={it.id || `${it.key}-${it.label}`} className="flex items-start gap-0.5">
                <span
                  className="min-w-0 flex-1 line-clamp-2 text-[11px] font-semibold text-sky-950"
                  title={it.label}
                >
                  {it.label}
                </span>
                {allowedEdit && it.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-rose-500 hover:text-rose-700"
                    title="Xóa triệu chứng"
                    onClick={() => void onRemoveMilestone(it.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {allowedEdit && onToggleLamSang ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ LS"
                triggerClassName="cursor-pointer text-[11px] font-semibold text-sky-700 hover:underline"
                maxHeight={180}
              >
                {COMMON_LS_CATALOG.map((cat) => {
                  const checked = items.some((x) => x.key === cat.criteriaKey);
                  return (
                    <li key={cat.criteriaKey}>
                      <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[11px] hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            void onToggleLamSang(
                              day.date,
                              cat.criteriaKey,
                              cat.title,
                              !checked,
                            )
                          }
                        />
                        {cat.title}
                      </label>
                    </li>
                  );
                })}
              </NkbvGridCriteriaAddPopover>
            ) : null}
            {!items.length && !(allowedEdit && onToggleLamSang) ? (
              <span className="text-slate-300">—</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "ssi_tc",
      header: "Tc ssi",
      minWidth: cw,
      render: (day) => {
        const items = ssiTcByDate[day.date] || [];
        const surgery = surgeryByDate[day.date] || [];
        return (
          <div className="relative flex flex-col gap-0.5">
            {surgery.map((s) => (
              <div key={s.id || s.key} className="flex items-start gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenSurgeryOrSsi(
                      s.id || `surg-${day.date}`,
                      day.date,
                      s.label,
                      s.key || "procedure_surgery",
                    )
                  }
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-violet-800 hover:underline"
                >
                  {s.label}
                </button>
                {allowedEdit && s.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-rose-500"
                    onClick={() => void onRemoveMilestone(s.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {items.map((it) => (
              <div key={it.id || it.key} className="flex items-start gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenSurgeryOrSsi(
                      it.id || `tc-${day.date}-${it.key}`,
                      day.date,
                      it.label,
                      it.key,
                    )
                  }
                  className="min-w-0 flex-1 line-clamp-2 text-left text-[11px] font-semibold text-violet-950 hover:underline"
                >
                  {it.label}
                </button>
                {allowedEdit && it.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-rose-500"
                    onClick={() => void onRemoveMilestone(it.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {allowedEdit ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ TC"
                triggerClassName="cursor-pointer text-[11px] font-semibold text-violet-600"
                maxHeight={176}
              >
                <li>
                  <button
                    type="button"
                    className="w-full px-1 py-0.5 text-left text-[11px] font-semibold text-violet-800 hover:bg-slate-50"
                    onClick={() => void onAddSurgery(day.date)}
                  >
                    + Ngày mổ (Day 1 SP)
                  </button>
                </li>
                {ssiTcCatalog.map((cat) => (
                  <li key={cat.criteriaKey}>
                    <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[11px] hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={items.some((x) => x.key === cat.criteriaKey)}
                        onChange={() =>
                          void onToggleSsiTc(day.date, cat.criteriaKey, cat.title)
                        }
                      />
                      {cat.title}
                    </label>
                  </li>
                ))}
              </NkbvGridCriteriaAddPopover>
            ) : null}
            {!items.length && !surgery.length && !allowedEdit ? (
              <span className="text-slate-300">—</span>
            ) : null}
          </div>
        );
      },
    },
    ...windowColumns,
    ...tailColumns,
  ];

  return (
    <NkbvBaDayGrid
      days={days}
      columns={columns}
      scrollRef={scrollRef}
      onScrollSync={onScrollSync}
    />
  );
}
