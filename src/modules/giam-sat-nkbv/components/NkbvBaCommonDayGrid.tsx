"use client";

import React, { useState } from "react";
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

type XnCell = BaGridXnCell;

type TcItem = { key: string; label: string; id?: string };
type CdhaCatalogItem = { criteriaKey: string; title: string; milestoneKind: string };

type Props = {
  days: BaGridColumn[];
  xnByDate: Record<string, XnCell[]>;
  cdhaByDate: Record<string, BaGridCdhaCell[]>;
  ssiTcByDate: Record<string, TcItem[]>;
  surgeryByDate: Record<string, TcItem[]>;
  foleyOnDate?: Record<string, boolean>;
  ventOnDate?: Record<string, boolean>;
  cvcOnDate?: Record<string, boolean>;
  statusById: Record<string, ViSinhAnalysisStatus>;
  activeXnId: string | null;
  cdhaCatalog: CdhaCatalogItem[];
  ssiTcCatalog: Array<{ criteriaKey: string; title: string }>;
  allowedEdit: boolean;
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
  onToggleDevice?: (
    date: string,
    key: "device_foley" | "device_ventilator" | "device_central_line",
  ) => void;
};

/**
 * Bảng chung dọc (timeline trung tâm):
 * Date | HD | XN | CĐHA | TC SSI | [Index…SBAP] | Khoa | CVC | Vent | Foley | Kết luận | Ghi chú
 */
export default function NkbvBaCommonDayGrid({
  days,
  xnByDate,
  cdhaByDate,
  ssiTcByDate,
  surgeryByDate,
  foleyOnDate = {},
  ventOnDate = {},
  cvcOnDate = {},
  statusById,
  activeXnId,
  cdhaCatalog,
  ssiTcCatalog,
  allowedEdit,
  defaultKhoa,
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
  onEditCdhaDate,
  onToggleCdha,
  onOpenSurgeryOrSsi,
  onAddSurgery,
  onToggleSsiTc,
  onToggleDevice,
}: Props) {
  const [khoaMap, setKhoaMap] = useState<Record<string, string>>({});
  const cw = BA_DAY_COL_W_COMMON;
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
    ...baDayIdentityColumns(),
    {
      id: "xn",
      header: "XN",
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
                  }`}
                  title="Chọn từng bệnh phẩm để phân tích"
                >
                  <span
                    className={`mb-0.5 inline-block rounded px-0.5 text-[9px] font-bold ${badge}`}
                  >
                    {statusBadgeLabel(st)}
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
                className="text-left text-[10px] font-semibold text-amber-800 hover:underline"
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
      header: "CĐHA",
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
                      className="shrink-0 text-[10px] text-rose-500"
                      title="Xóa"
                      onClick={() => void onRemoveMilestone(x.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {allowedEdit && !x.id.startsWith("local-") ? (
                  <input
                    type="date"
                    className="w-full bg-emerald-50/50 text-[9px]"
                    value={x.ngay.slice(0, 10)}
                    title="Sửa ngày CĐHA"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && v !== x.ngay.slice(0, 10)) void onEditCdhaDate(x.id, v);
                    }}
                  />
                ) : null}
              </div>
            ))}
            {allowedEdit ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ CĐHA"
                triggerClassName="cursor-pointer text-[10px] font-semibold text-emerald-600"
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
      id: "ssi_tc",
      header: "TC SSI",
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
                  className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold text-violet-800 hover:underline"
                >
                  {s.label}
                </button>
                {allowedEdit && s.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[10px] text-rose-500"
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
                  className="min-w-0 flex-1 line-clamp-2 text-left text-[10px] font-semibold text-violet-950 hover:underline"
                >
                  {it.label}
                </button>
                {allowedEdit && it.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[10px] text-rose-500"
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
                triggerClassName="cursor-pointer text-[10px] font-semibold text-violet-600"
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
    {
      id: "khoa",
      header: "Khoa",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => (
        <input
          className="w-full bg-transparent text-center text-[9px] outline-none"
          value={khoaMap[day.date] ?? defaultKhoa}
          disabled={!allowedEdit}
          onChange={(e) => setKhoaMap((p) => ({ ...p, [day.date]: e.target.value }))}
          placeholder="—"
          title={khoaMap[day.date] ?? defaultKhoa}
        />
      ),
    },
    {
      id: "ct_cvc",
      header: "CVC",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const on = Boolean(cvcOnDate[day.date]);
        const enabled = deviceToggleEnabled(day.date, on);
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_central_line")}
            className={`w-full rounded py-0.5 text-[9px] font-bold ${
              on ? "bg-amber-800 text-white" : "text-slate-400"
            } ${!enabled && !on ? "opacity-40" : ""}`}
            title={deviceTitle("Đường truyền trung tâm — lưu trên timeline BA", day.date, on)}
          >
            {on ? "X" : "·"}
          </button>
        );
      },
    },
    {
      id: "ct_vent",
      header: "Vent",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const on = Boolean(ventOnDate[day.date]);
        const enabled = deviceToggleEnabled(day.date, on);
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_ventilator")}
            className={`w-full rounded py-0.5 text-[9px] font-bold ${
              on ? "bg-violet-800 text-white" : "text-slate-400"
            } ${!enabled && !on ? "opacity-40" : ""}`}
            title={deviceTitle("Thở máy — lưu trên timeline BA", day.date, on)}
          >
            {on ? "X" : "·"}
          </button>
        );
      },
    },
    {
      id: "ct_foley",
      header: "Foley",
      minWidth: BA_DAY_COL_W_NARROW,
      render: (day) => {
        const on = Boolean(foleyOnDate[day.date]);
        const enabled = deviceToggleEnabled(day.date, on);
        return (
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onToggleDevice?.(day.date, "device_foley")}
            className={`w-full rounded py-0.5 text-[9px] font-bold ${
              on ? "bg-sky-800 text-white" : "text-slate-400"
            } ${!enabled && !on ? "opacity-40" : ""}`}
            title={deviceTitle("Ống thông tiểu lưu — lưu trên timeline BA", day.date, on)}
          >
            {on ? "X" : "·"}
          </button>
        );
      },
    },
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
