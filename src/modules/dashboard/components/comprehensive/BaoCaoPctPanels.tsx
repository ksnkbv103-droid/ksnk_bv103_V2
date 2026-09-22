"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import {
  aggregateLensRates,
  formatPctOrDash,
  PCT_EMPTY,
  rankTopLoi,
  tyLeBkFromCounts,
  type LensBundle,
  type TopLoiInput,
} from "@/lib/domain/bao-cao-pct";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
import { buildBcthVstKpiSlots } from "../../lib/bao-cao-tong-hop-ia";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";

type Deep = { tu_ngay: string; den_ngay: string; khoa_ids?: string[] } | null;

function LensStrip({ title, bundle }: { title: string; bundle: LensBundle }) {
  const cells = [
    { label: "Tự giám sát", rate: bundle.tgs },
    { label: "Chuyên trách", rate: bundle.ksnk },
    { label: "Chéo", rate: bundle.cheo },
  ];
  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-600">{title}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
        {cells.map((c) => (
          <span key={c.label}>
            {c.label}: <strong className="tabular-nums">{c.rate.display}</strong>
          </span>
        ))}
        <span>
          Đối soát (TGS − chuyên trách):{" "}
          <strong className="tabular-nums">
            {bundle.do_lech == null ? PCT_EMPTY : `${bundle.do_lech.toFixed(1)} điểm`}
          </strong>
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Chéo không vào đối soát. Cách thức không đổi lens.</p>
    </div>
  );
}

export function VeSinhTayHubCards({
  payload,
  deep,
}: {
  payload: BaoCaoTongHopPayload | null;
  deep?: Deep;
}) {
  const cards = buildBcthVstKpiSlots(payload, deep);
  const whoLens = aggregateLensRates(payload?.vst?.matrix_hinh_thuc, "who");

  return (
    <div className="mb-5 border-b border-slate-100 pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-2">
        <h3 className="bv103-type-section text-slate-700">Vệ sinh tay</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Ba chỉ số cạnh nhau · cùng kỳ/khoa. Không gộp WHO với bảng kiểm.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const tone = complianceToneFromPercent(c.rate);
          return (
            <div key={c.id} className={`rounded-xl border border-slate-200 bg-white px-3 py-3 ${D.trafficText[tone]}`}>
              <p className="bv103-type-label font-semibold text-slate-700">{c.label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{c.code}</p>
              <p className={`mt-2 ${D.kpiValue}`}>{c.display}</p>
              {c.volume ? <p className="mt-1 bv103-type-label tabular-nums opacity-80">{c.volume}</p> : null}
              {c.note ? <p className="mt-1 text-[10px] text-slate-400">{c.note}</p> : null}
              <Link href={c.href} className="mt-2 inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline">
                Đối tượng và khu vực <ExternalLink size={10} aria-hidden />
              </Link>
            </div>
          );
        })}
      </div>
      <LensStrip title="Lens WHO (ty_le_vst)" bundle={whoLens} />
    </div>
  );
}

export function GscBaoCaoPctBlock({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const gsc = payload?.gsc;
  const k = gsc?.kpis;
  const hospital = k ? tyLeBkFromCounts(k.tong_dat, k.tong_quan_sat, k.tong_vi_pham) : null;
  const overview = gsc?.checklist_overview ?? gsc?.dynamic_checklists ?? [];
  const bmRows = overview.map((row) => ({
    ma_bk: row.ma_bk,
    ...tyLeBkFromCounts(row.tong_dat, row.tong_quan_sat, row.tong_vi_pham),
  }));
  const loiInputs: TopLoiInput[] = (gsc?.top_violations ?? []).map((v) => ({
    id: v.criterion_id,
    ten: v.ten_tieu_chi,
    ma_bk: v.ma_bk,
    ten_bang_kiem: v.ten_bang_kiem,
    n_loi: v.so_vi_pham,
    n_ap_dung: v.tong_quan_sat,
    ket_qua: "KHONG_DAT" as const,
  }));
  const rankedLoi = rankTopLoi(loiInputs);
  const topKy = rankedLoi.slice(0, 8);
  const lens = aggregateLensRates(gsc?.matrix_hinh_thuc, "bk");

  if (!payload?.capabilities.topic_gsc || !k) {
    return <p className="text-xs text-slate-500">N/A — không có dữ liệu hoặc không có quyền nguồn.</p>;
  }

  return (
    <div className="mb-5 space-y-3 border-b border-slate-100 pb-5 last:mb-0 last:border-0 last:pb-0">
      <div>
        <h3 className="bv103-type-section text-slate-700">Giám sát chung</h3>
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-semibold">{PCT_SURFACE_LABEL.gscPool}</span>
          {" · ty_le_bk: "}
          <strong className="tabular-nums">{formatPctOrDash(hospital?.ty_le_bk ?? null, hospital?.n_ap_dung ?? 0)}</strong>
          {" "}({hospital?.n_dat ?? 0}/{hospital?.n_ap_dung ?? 0} áp dụng, {k.tong_phien} phiên)
        </p>
        <p className="text-[11px] text-slate-500">Không thuộc 3 KPI vệ sinh tay. Không xếp cạnh WHO, BM.02, BM.03.</p>
        {hospital && hospital.n_ap_dung > 0 && hospital.n_ap_dung < 30 ? (
          <p className="text-[10px] text-slate-400">Dưới ngưỡng diễn giải (áp dụng &lt; 30). Công thức không đổi.</p>
        ) : null}
      </div>
      {bmRows.length > 0 ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {bmRows.map((bm) => {
            const inBm = rankedLoi.filter((t) => t.ma_bk === bm.ma_bk).slice(0, 3);
            return (
              <li key={bm.ma_bk}>
                <span className="font-semibold">{bm.ma_bk}</span>
                {" · ty_le_bm "}
                <span className="tabular-nums">{formatPctOrDash(bm.ty_le_bm, bm.n_ap_dung)}</span>
                {inBm.length > 0 ? (
                  <span className="text-slate-500">
                    {" "}— top lỗi: {inBm.map((t) => `${t.ten} (${t.n_loi} · ${t.ty_le_loi.toFixed(1)}%)`).join("; ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">Chưa có bảng kiểm trong kỳ.</p>
      )}
      <div>
        <p className="text-[11px] font-semibold text-slate-600">Top lỗi toàn kỳ (Không đạt, áp dụng ≥ 5)</p>
        {topKy.length === 0 ? (
          <p className="text-xs text-slate-500">Không có tiêu chí đủ mẫu.</p>
        ) : (
          <ol className="mt-1 list-decimal pl-4 text-xs text-slate-700">
            {topKy.map((t) => (
              <li key={`${t.ma_bk ?? ""}-${t.id}`}>
                {t.ten}
                {t.ma_bk ? ` · ${t.ma_bk}` : ""} — {t.n_loi} lỗi, {t.ty_le_loi.toFixed(1)}%
              </li>
            ))}
          </ol>
        )}
      </div>
      <LensStrip title="Lens bảng kiểm (ty_le_bk)" bundle={lens} />
    </div>
  );
}
