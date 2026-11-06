"use client";

import React, { useMemo, useState } from "react";
import type { PriorEventForDisposition } from "../lib/nkbv-index-event-disposition";
import type { BaGridXnCell } from "../lib/nkbv-ba-grid-engine";
import type { ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

type Props = {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  priorEvents: PriorEventForDisposition[];
  xnList: BaGridXnCell[];
  statusById: Record<string, ViSinhAnalysisStatus>;
  onSelectEvent?: (eventId: string) => void;
};

export default function NkbvPatientSynthesisBar({
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  priorEvents,
  xnList,
  statusById,
  onSelectEvent,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // Thống kê mẫu xét nghiệm
  const labStats = useMemo(() => {
    let chuaPt = 0;
    let daPt = 0;
    let boQua = 0;
    let khongDuTc = 0;

    for (const x of xnList) {
      const st = statusById[x.id] || "CHUA_PHAN_TICH";
      if (st === "CHUA_PHAN_TICH") chuaPt += 1;
      else if (st === "DA_PHAN_TICH") daPt += 1;
      else if (st === "BO_QUA") boQua += 1;
      else if (st === "KHONG_DU_TC") khongDuTc += 1;
    }

    return { total: xnList.length, chuaPt, daPt, boQua, khongDuTc };
  }, [xnList, statusById]);

  // Danh sách sự kiện đã xác lập
  const establishedEvents = useMemo(() => {
    return priorEvents.map((e, idx) => {
      const doe = e.ngay_phat_hien ? e.ngay_phat_hien.slice(0, 10) : "—";
      const loai = e.loai_ten || e.loai_ma || e.vi_tri_nhiem_khuan || "NKBV";
      const tacNhan = e.tac_nhan_vi_khuan || "Chưa rõ căn nguyên";
      return {
        id: e.id,
        order: idx + 1,
        loai,
        doe,
        tacNhan,
        attributedCount: (e.attributed_vi_sinh_ids || []).length,
      };
    });
  }, [priorEvents]);

  return (
    <div className="mx-2 mb-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-[11px] shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Trục trái: Tổng quan bệnh án & Mẫu vi sinh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[11px] text-white">
              Σ
            </span>
            <span>Tổng Hợp Bệnh Án</span>
          </div>

          <div className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
            <span className="text-slate-500">Vi sinh (+):</span>
            <span className="font-bold text-slate-800">{labStats.total} mẫu</span>
            <span className="text-slate-300">|</span>
            {labStats.chuaPt > 0 ? (
              <span className="font-semibold text-amber-700 bg-amber-50 px-1 rounded">
                {labStats.chuaPt} chưa PT
              </span>
            ) : (
              <span className="font-semibold text-emerald-700">100% đã quy kết</span>
            )}
            {labStats.daPt > 0 ? (
              <span className="text-slate-600">({labStats.daPt} thuộc SK)</span>
            ) : null}
            {labStats.khongDuTc + labStats.boQua > 0 ? (
              <span className="text-slate-500 text-[11px]">
                [{labStats.khongDuTc + labStats.boQua} loại trừ]
              </span>
            ) : null}
          </div>

          {/* Huy hiệu số sự kiện đã xác lập */}
          <div className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 border border-sky-200 font-semibold text-sky-900">
            <span>Sự kiện NKBV đã chốt:</span>
            <span className="font-bold text-sky-800">{establishedEvents.length}</span>
          </div>
        </div>

        {/* Trục phải: Nút mở rộng xem bản đồ sự kiện chi tiết */}
        {establishedEvents.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
          >
            {expanded ? "Thu gọn bản đồ SK ▲" : "Xem bản đồ SK chi tiết ▼"}
          </button>
        ) : null}
      </div>

      {/* Danh sách các sự kiện đã xác lập (Pill preview khi thu gọn) */}
      {!expanded && establishedEvents.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
          <span className="text-[11px] text-slate-500">Chuỗi sự kiện:</span>
          {establishedEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvent?.(ev.id)}
              className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-300 text-slate-800 hover:border-sky-400 hover:bg-sky-50/50"
              title={`Bấm để xem sự kiện ${ev.loai} (DOE ${ev.doe})`}
            >
              <span className="font-bold text-sky-800">#{ev.order}</span>
              <span className="font-semibold">{ev.loai}</span>
              <span className="text-slate-500 text-[11px]">(DOE {ev.doe})</span>
              <span className="text-slate-600 truncate max-w-[130px] font-normal">
                · {ev.tacNhan}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Bản đồ sự kiện chi tiết khi mở rộng */}
      {expanded && establishedEvents.length > 0 ? (
        <div className="mt-2 space-y-1.5 border-t border-slate-200/80 pt-2">
          {establishedEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded border border-slate-200 bg-white p-1.5 hover:bg-slate-50/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-sky-100 px-1.5 py-0.5 font-bold text-sky-900">
                  Sự kiện #{ev.order}: {ev.loai}
                </span>
                <span className="text-slate-700">
                  Ngày sự kiện (DOE): <strong className="text-rose-900">{ev.doe}</strong>
                </span>
                <span className="text-slate-600">
                  Căn nguyên vi sinh: <strong className="text-slate-800">{ev.tacNhan}</strong>
                </span>
                {ev.attributedCount > 0 ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800 border border-emerald-200">
                    Gom {ev.attributedCount} mẫu trong RIT/SBAP
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onSelectEvent?.(ev.id)}
                className="text-[11px] font-semibold text-sky-700 hover:underline"
              >
                Mở phiếu →
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
