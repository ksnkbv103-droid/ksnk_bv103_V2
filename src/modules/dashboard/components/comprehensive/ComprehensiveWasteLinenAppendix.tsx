"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

export function ComprehensiveWasteLinenAppendix({
  payload,
}: {
  payload: BaoCaoTongHopPayload | null;
}) {
  const data = payload?.chat_thai_do_vai;
  const status = payload?.sources.chat_thai_do_vai;

  if (!payload || status !== "ok" || !data) {
    if (status === "denied" || status === "error") {
      return (
        <section className="rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
          Phụ lục Chất thải & Đồ vải y tế chưa tải được
          {payload?.errors.chat_thai_do_vai ? ` (${payload.errors.chat_thai_do_vai})` : ""}. Không ảnh hưởng chỉ số VST/GSC.
        </section>
      );
    }
    return null;
  }

  const { stats, insights } = data;

  return (
    <section className={`${D.shellPadded} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-[var(--bv103-space-2)]">
        <div>
          <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
            <Trash2 size={18} className="text-amber-600" aria-hidden />
            Phụ lục Hậu cần KSNK — Chất thải & Đồ vải y tế (Toàn viện)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Định lượng cân toàn viện tại nhà rác và đơn vị giặt là &bull; Kỳ ghi nhận: {stats.so_ngay_co_du_lieu}/{stats.so_ngay_ky} ngày ({stats.ty_le_day_du_pct}%)
          </p>
        </div>

        <Link
          href="/chat-thai-do-vai"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] sm:min-h-9 border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-white transition"
        >
          Mở sổ cân & sự cố
          <ExternalLink size={13} aria-hidden />
        </Link>
      </div>

      {payload.filters.khoa_ids?.length ? (
        <p className="text-xs text-slate-500">
          * Lưu ý: Khối lượng cân được thực hiện tập trung toàn viện tại nhà rác và ĐVGL nên không phân tách theo bộ lọc khoa phòng đơn lẻ.
        </p>
      ) : null}

      {/* Cảnh báo an toàn sinh học & gợi ý KSNK */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((item, idx) => {
            const isDanger = item.muc === "NGUY_CO_CAO";
            const isWarning = item.muc === "CANH_BAO";
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isDanger
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : isWarning
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-sky-50 border-sky-200 text-sky-900"
                }`}
              >
                {isDanger ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold mr-1.5">
                    {isDanger ? "[KHẨN AN TOÀN SINH HỌC]" : isWarning ? "[KHUYẾN NGHỊ KSNK]" : "[VẬN HÀNH]"}
                  </span>
                  <span>{item.noiDung}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2 Khối chỉ số Chất thải & Đồ vải */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Khối Chất thải y tế */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Chất thải y tế (Quy trình 11)
            </span>
            <span className="text-xs font-semibold text-slate-700">
              Tổng: <strong>{stats.chat_thai.tong_chat_thai_kg.toLocaleString()}</strong> kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Tỷ lệ CTLN</div>
              <div className="text-base font-bold mt-0.5">
                <span className={stats.chat_thai.ty_le_ctln_pct > 20 ? "text-rose-600" : "text-emerald-700"}>
                  {stats.chat_thai.ty_le_ctln_pct}%
                </span>
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({stats.chat_thai.tong_ctln_kg} kg)
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Chuẩn &le; 20%</div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">CTLN Sắc nhọn</div>
              <div className="text-base font-bold text-amber-800 mt-0.5">
                {stats.chat_thai.kg_sac_nhon.toLocaleString()} kg
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Hộp kháng thủng vàng</div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Suất CTYT/1.000 ng-giường</div>
              <div className="text-base font-bold text-indigo-700 mt-0.5">
                {stats.chat_thai.chat_thai_per_1000_ngay_giuong.toLocaleString()} kg
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Mẫu số: {stats.tong_ngay_giuong.toLocaleString()} ng-g</div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Sự cố phát hiện</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {stats.chat_thai.so_su_co} vụ
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Rách túi, sai loại, mở nắp</div>
            </div>
          </div>
        </div>

        {/* Khối Đồ vải y tế */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Đồ vải y tế (Quy trình 12)
            </span>
            <span className="text-xs font-semibold text-slate-700">
              Tổng bẩn: <strong>{stats.do_vai.tong_ban_kg.toLocaleString()}</strong> kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Tỷ lệ bẩn lây nhiễm</div>
              <div className="text-base font-bold text-rose-700 mt-0.5">
                {stats.do_vai.ty_le_ban_ln_pct}%
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {stats.do_vai.kg_ban_lay_nhiem} kg (túi vàng/tự tan)
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Chênh lệch bẩn - sạch</div>
              <div className="text-base font-bold mt-0.5">
                <span className={Math.abs(stats.do_vai.ty_le_chenh_lech_pct) > 10 ? "text-amber-600" : "text-slate-900"}>
                  {stats.do_vai.chenh_lech_kg > 0 ? `+${stats.do_vai.chenh_lech_kg}` : stats.do_vai.chenh_lech_kg} kg
                </span>
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({stats.do_vai.ty_le_chenh_lech_pct}%)
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Sạch về: {stats.do_vai.kg_sach_ve} kg</div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
              <div className="text-slate-500 font-medium">Suất đồ vải/1.000 ng-giường</div>
              <div className="text-base font-bold text-teal-700 mt-0.5">
                {stats.do_vai.do_vai_per_1000_ngay_giuong.toLocaleString()} kg
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Mẫu số: {stats.tong_ngay_giuong.toLocaleString()} ng-g</div>
            </div>

            <div
              className={`p-2.5 rounded-lg border ${
                stats.do_vai.so_su_co_sac_nhon > 0
                  ? "bg-rose-50 border-rose-300 text-rose-900"
                  : "bg-white border-slate-200/60"
              }`}
            >
              <div className="text-slate-500 font-medium">Lẫn sắc nhọn trong đồ vải</div>
              <div
                className={`text-base font-bold mt-0.5 ${
                  stats.do_vai.so_su_co_sac_nhon > 0 ? "text-rose-700 animate-pulse" : "text-emerald-700"
                }`}
              >
                {stats.do_vai.so_su_co_sac_nhon} vụ
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Mục tiêu: 0 vụ (an toàn NVYT)</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
