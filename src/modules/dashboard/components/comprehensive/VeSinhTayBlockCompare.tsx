"use client";

import React from "react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { aggregateLensRates } from "@/lib/domain/bao-cao-pct";
import { useGscChecklistDetail } from "@/modules/giam-sat-chung/hooks/use-gsc-checklist-detail";
import type { GscChecklistDetailPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { bcthVstStatsHref } from "../../lib/bao-cao-tong-hop-ia";
import { SurfaceCutList, VeSinhTayHubCards } from "./BaoCaoPctPanels";
import { ComprehensiveCompare } from "./ComprehensiveCompare";

type DetailQuery = {
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
};

type Props = {
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  detailQuery: DetailQuery;
};

export function VeSinhTayBlockCompare({ payload, selectedKhoaIds, khoaOptions, detailQuery }: Props) {
  const enabled = payload?.capabilities.topic_gsc === true;
  const bm02 = useGscChecklistDetail({ maBk: enabled ? "BM.07.02" : null, ...detailQuery });
  const bm03 = useGscChecklistDetail({ maBk: enabled ? "BM.07.03" : null, ...detailQuery });
  const deep = payload?.filters?.tu_ngay
    ? { tu_ngay: payload.filters.tu_ngay, den_ngay: payload.filters.den_ngay, khoa_ids: payload.filters.khoa_ids }
    : null;

  return (
    <div className="space-y-8">
      <VeSinhTayHubCards
        payload={payload}
        lensById={{
          bm02: aggregateLensRates(bm02.detail?.matrix_hinh_thuc, "bk"),
          bm03: aggregateLensRates(bm03.detail?.matrix_hinh_thuc, "bk"),
        }}
      />
      <div className="space-y-2">
        <ComprehensiveCompare
          payload={payload}
          selectedKhoaIds={selectedKhoaIds}
          khoaOptions={khoaOptions}
          module="vst"
          blockTitle="SURF_WHO · so sánh khoa · ty_le_vst"
          subjectHref={bcthVstStatsHref("who", deep)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SurfaceCutList label="Đối tượng · SURF_WHO" rows={toCompareRows(payload?.vst?.matrix_nghe)} />
          <SurfaceCutList label="Khu vực · SURF_WHO" rows={toCompareRows(payload?.vst?.matrix_khu_vuc)} />
        </div>
        <p className="text-[11px] text-slate-500">
          Khoa, đối tượng, khu vực và lens HT của phiếu WHO. Không dùng ma trận GSC.
        </p>
      </div>
      <BkKhoaBlock
        maBk="BM.07.02"
        title="SURF_BM02 · so sánh khoa · ty_le_vst_ky_thuat"
        hrefId="bm02"
        payload={payload}
        selectedKhoaIds={selectedKhoaIds}
        khoaOptions={khoaOptions}
        detail={bm02.detail}
        loading={bm02.loading}
        error={bm02.error}
        extraNote={`Khác ${PCT_SURFACE_LABEL.whoPhuDungKyThuat}.`}
      />
      <BkKhoaBlock
        maBk="BM.07.03"
        title="SURF_BM03 · so sánh khoa · ty_le_vst_ngoai_khoa"
        hrefId="bm03"
        payload={payload}
        selectedKhoaIds={selectedKhoaIds}
        khoaOptions={khoaOptions}
        detail={bm03.detail}
        loading={bm03.loading}
        error={bm03.error}
      />
    </div>
  );
}

function BkKhoaBlock({
  maBk,
  title,
  hrefId,
  payload,
  selectedKhoaIds,
  khoaOptions,
  detail,
  loading,
  error,
  extraNote,
}: {
  maBk: string;
  title: string;
  hrefId: "bm02" | "bm03";
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  detail: GscChecklistDetailPayload | null;
  loading: boolean;
  error: string | null;
  extraNote?: string;
}) {
  const enabled = payload?.capabilities.topic_gsc === true;
  const deep = payload?.filters?.tu_ngay
    ? { tu_ngay: payload.filters.tu_ngay, den_ngay: payload.filters.den_ngay, khoa_ids: payload.filters.khoa_ids }
    : null;
  const href = bcthVstStatsHref(hrefId, deep);
  const surf = hrefId === "bm02" ? "SURF_BM02" : "SURF_BM03";

  if (!enabled) {
    return <p className="text-xs text-slate-500">N/A — không có quyền nguồn cho {maBk}.</p>;
  }

  return (
    <div className="space-y-2">
      {loading ? <p className="text-xs text-slate-500">Đang tải so sánh khoa {maBk}…</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {!loading ? (
        <ComprehensiveCompare
          payload={payload}
          selectedKhoaIds={selectedKhoaIds}
          khoaOptions={khoaOptions}
          module="gsc"
          gapOverride={detail?.gap_analysis ?? []}
          blockTitle={title}
          subjectHref={href}
        />
      ) : (
        <a href={href} className="text-xs font-semibold text-emerald-700 hover:underline">
          Đối tượng và khu vực · {maBk}
        </a>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <SurfaceCutList label={`Đối tượng · ${surf}`} rows={toCompareRows(detail?.matrix_nghe)} />
        <SurfaceCutList label={`Khu vực · ${surf}`} rows={toCompareRows(detail?.matrix_khu_vuc)} />
      </div>
      <p className="text-[11px] text-slate-500">
        So sánh khoa, đối tượng và khu vực của riêng {maBk}. Không dùng {PCT_SURFACE_LABEL.gscPool}.
        {extraNote ? ` ${extraNote}` : ""}
      </p>
    </div>
  );
}
