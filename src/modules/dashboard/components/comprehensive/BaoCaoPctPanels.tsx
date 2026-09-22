"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  aggregateLensRates,
  buildVeSinhTayHub,
  formatPctOrDash,
  PCT_EMPTY,
  rankTopLoi,
  tyLeBkFromCounts,
  type LensBundle,
  type TopLoiInput,
} from "@/lib/domain/bao-cao-pct";
import { pickVeSinhTayChecklistRates, VE_SINH_TAY_WHO } from "@/lib/domain/ve-sinh-tay-catalog";
import { buildGscAnalyticsDeepLink } from "@/lib/analytics/supervision-deep-link";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
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
  deep: Deep;
}) {
  const vstK = payload?.vst?.kpis;
  const checklistRows = payload?.gsc?.checklist_overview ?? payload?.gsc?.dynamic_checklists ?? [];
  const bkRates = pickVeSinhTayChecklistRates(checklistRows);
  const kt = bkRates.find((r) => r.slot === "BM02_KY_THUAT_TQ");
  const nk = bkRates.find((r) => r.slot === "BM03_NGOAI_KHOA");
  const hub = buildVeSinhTayHub({
    so_tuan_thu: vstK?.da_tuan_thu ?? 0,
    tong_co_hoi: vstK?.tong_co_hoi ?? 0,
    ky_thuat: kt?.found ? { n_dat: kt.n_dat, n_kd: kt.n_kd } : null,
    ngoai_khoa: nk?.found ? { n_dat: nk.n_dat, n_kd: nk.n_kd } : null,
  });
  const whoHref = deep ? buildAnalyticsDeepLink("/thong-ke/vst", deep) : "/thong-ke/vst";
  const cards = [
    {
      key: "who",
      label: VE_SINH_TAY_WHO.label,
      code: "QT.07 BM.01 · ty_le_vst",
      display: payload?.capabilities.topic_vst && vstK ? hub.who.display : PCT_EMPTY,
      rate: hub.who.ty_le_vst,
      volume: vstK ? `${hub.who.so_tuan_thu}/${hub.who.tong_co_hoi} cơ hội` : null,
      note: hub.who.tong_co_hoi > 0 && !hub.who.du_mau ? "Dưới ngưỡng diễn giải (cơ hội < 20)" : null,
      href: whoHref,
    },
    {
      key: "bm02",
      label: kt?.label ?? "Kỹ thuật VST thường quy",
      code: "BM.02 · ty_le_vst_ky_thuat",
      display: payload?.capabilities.topic_gsc ? hub.ky_thuat.display : PCT_EMPTY,
      rate: hub.ky_thuat.ty_le_vst_ky_thuat,
      volume: kt?.found ? `${hub.ky_thuat.n_dat}/${hub.ky_thuat.n_ap_dung} áp dụng` : "Chưa có phiên trong kỳ",
      note: hub.ky_thuat.n_ap_dung > 0 && !hub.ky_thuat.du_mau ? "Dưới ngưỡng diễn giải (áp dụng < 30)" : null,
      href: deep ? buildGscAnalyticsDeepLink(deep, kt?.ma_bk ?? "BM.07.02") : "/thong-ke/gsc?bk=BM.07.02",
    },
    {
      key: "bm03",
      label: nk?.label ?? "VST ngoại khoa",
      code: "BM.03 · ty_le_vst_ngoai_khoa",
      display: payload?.capabilities.topic_gsc ? hub.ngoai_khoa.display : PCT_EMPTY,
      rate: hub.ngoai_khoa.ty_le_vst_ngoai_khoa,
      volume: nk?.found ? `${hub.ngoai_khoa.n_dat}/${hub.ngoai_khoa.n_ap_dung} áp dụng` : "Chưa có phiên trong kỳ",
      note: hub.ngoai_khoa.n_ap_dung > 0 && !hub.ngoai_khoa.du_mau ? "Dưới ngưỡng diễn giải (áp dụng < 30)" : null,
      href: deep ? buildGscAnalyticsDeepLink(deep, nk?.ma_bk ?? "BM.07.03") : "/thong-ke/gsc?bk=BM.07.03",
    },
  ];
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
            <div key={c.key} className={`rounded-xl border border-slate-200 bg-white px-3 py-3 ${D.trafficText[tone]}`}>
              <p className="bv103-type-label font-semibold text-slate-700">{c.label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{c.code}</p>
              <p className={`mt-2 ${D.kpiValue}`}>{c.display}</p>
              {c.volume ? <p className="mt-1 bv103-type-label tabular-nums opacity-80">{c.volume}</p> : null}
              {c.note ? <p className="mt-1 text-[10px] text-slate-400">{c.note}</p> : null}
              <Link href={c.href} className="mt-2 inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline">
                Chi tiết <ExternalLink size={10} aria-hidden />
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
          ty_le_bk: <strong className="tabular-nums">{formatPctOrDash(hospital?.ty_le_bk ?? null, hospital?.n_ap_dung ?? 0)}</strong>
          {" "}({hospital?.n_dat ?? 0}/{hospital?.n_ap_dung ?? 0} áp dụng, {k.tong_phien} phiên)
        </p>
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
