"use client";

import React, { useMemo } from "react";
import type { BangKiemApDungJsonb } from "@/lib/domain/bang-kiem-ap-dung";
import {
  describeNghiaVuChoKhoa,
  formatTanSuatToiThieu,
  listKhoaTrongPhamVi,
  normalizeApDungForSave,
  type KhoaApDungContext,
} from "@/lib/domain/bang-kiem-ap-dung";
import type { BangKiemApDungKhoaOption } from "./bang-kiem-ap-dung-fields";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";
import { quanTriTableChrome as TC } from "../../lib/quan-tri-table-chrome";

type Props = {
  apDung: BangKiemApDungJsonb;
  khoaOptions: BangKiemApDungKhoaOption[];
  actorKhoaId?: string | null;
  actorKhoaLabel?: string | null;
};

function toKhoaContext(opt: BangKiemApDungKhoaOption): KhoaApDungContext {
  const maMatch = opt.label.match(/^\[([^\]]+)\]/);
  const ten = opt.label.replace(/^\[[^\]]+\]\s*/, "");
  return {
    id: opt.id,
    khoi_id: opt.khoi_id ?? null,
    ma_khoa: maMatch?.[1] ?? null,
    ten_khoa: ten || opt.label,
    is_active: true,
  };
}

export default function BangKiemApDungPreview({
  apDung,
  khoaOptions,
  actorKhoaId,
  actorKhoaLabel,
}: Props) {
  const norm = normalizeApDungForSave(apDung);
  const allKhoa = useMemo(() => khoaOptions.map(toKhoaContext), [khoaOptions]);
  const inScope = useMemo(() => listKhoaTrongPhamVi(norm, allKhoa), [norm, allKhoa]);

  const actorCtx = actorKhoaId ? allKhoa.find((k) => k.id === actorKhoaId) : null;
  const actorNghiaVu = actorCtx ? describeNghiaVuChoKhoa(norm, actorCtx) : null;

  const batBuocCount = inScope.filter((k) => {
    const n = describeNghiaVuChoKhoa(norm, k);
    return n.batBuocTgs;
  }).length;
  const tanSuatLabel = formatTanSuatToiThieu(norm);

  return (
    <section className="space-y-3 rounded-[var(--radius-shell)] border border-[var(--primary)]/15 bg-[var(--primary)]/[0.03] p-4">
      <h4 className={`${F.sectionTitle} text-[var(--primary)]`}>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mr-2 text-[11px] font-semibold">
          7
        </span>
        Kết quả — khoa phải làm gì
      </h4>

      <div className={`flex flex-wrap gap-2 ${TC.cellMeta} font-semibold`}>
        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 border border-slate-100">
          {inScope.length} khoa trong phạm vi
        </span>
        {norm.muc_do === "BAT_BUOC" && norm.bat_buoc.tu_giam_sat ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
            {batBuocCount} khoa bắt buộc TGS
          </span>
        ) : null}
        {tanSuatLabel ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800">{tanSuatLabel}</span>
        ) : norm.muc_do === "BAT_BUOC" && norm.bat_buoc.tu_giam_sat ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Chưa quy định tần suất</span>
        ) : null}
      </div>

      {actorNghiaVu && actorKhoaLabel ? (
        <div
          className={`rounded-[var(--radius-shell)] px-4 py-3 text-xs ${
            actorNghiaVu.apDung
              ? actorNghiaVu.batBuocTgs
                ? "bg-emerald-50 border border-emerald-100 text-emerald-900"
                : "bg-white border border-slate-100 text-slate-700"
              : "bg-slate-50 border border-slate-100 text-slate-500"
          }`}
        >
          <p className="font-bold mb-1">Khoa của bạn: {actorKhoaLabel}</p>
          <ul className="list-disc pl-4 space-y-0.5 font-medium">
            {actorNghiaVu.huongDan.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className={F.panelSubtitle}>
        Xem đầy đủ trạng thái kỳ và link tạo phiên tại{" "}
        <a href="/thong-ke/gsc?view=bk-toi" className="font-bold text-[var(--primary)] hover:underline">
          Thống kê GSC → BK tôi phải TGS
        </a>
        .
      </p>

      {inScope.length === 0 ? (
        <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-[var(--radius-shell)] px-4 py-2">
          Chưa có khoa nào trong phạm vi — kiểm tra lại khối/khoa/miễn trừ hoặc chọn «Cả viện» (để trống khối và
          khoa).
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
          {inScope.slice(0, 12).map((k) => {
            const n = describeNghiaVuChoKhoa(norm, k);
            const label = k.ma_khoa ? `[${k.ma_khoa}] ${k.ten_khoa}` : k.ten_khoa;
            return (
              <div
                key={k.id}
                className="rounded-[var(--radius-shell)] bg-white border border-slate-100 px-3 py-2 text-[11px]"
              >
                <p className="font-bold text-slate-800">{label}</p>
                <p className="font-medium text-slate-500 mt-0.5">{n.huongDan[0]}</p>
              </div>
            );
          })}
          {inScope.length > 12 ? (
            <p className={`${F.panelSubtitle} text-slate-400 text-center`}>
              +{inScope.length - 12} khoa khác…
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
