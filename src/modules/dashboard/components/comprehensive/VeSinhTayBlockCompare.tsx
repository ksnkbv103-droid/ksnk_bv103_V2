"use client";

import React from "react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { useGscChecklistDetail } from "@/modules/giam-sat-chung/hooks/use-gsc-checklist-detail";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { bcthVstStatsHref } from "../../lib/bao-cao-tong-hop-ia";
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
  const deep = payload?.filters?.tu_ngay
    ? {
        tu_ngay: payload.filters.tu_ngay,
        den_ngay: payload.filters.den_ngay,
        khoa_ids: payload.filters.khoa_ids,
      }
    : null;

  return (
    <div className="mt-4 space-y-8">
      <div className="space-y-2">
        <ComprehensiveCompare
          payload={payload}
          selectedKhoaIds={selectedKhoaIds}
          khoaOptions={khoaOptions}
          module="vst"
          blockTitle="A · WHO 5 thời điểm · ty_le_vst"
          subjectHref={bcthVstStatsHref("who", deep)}
        />
        <p className="text-[11px] text-slate-500">
          So sánh khoa của phiếu WHO. Đối tượng và khu vực mở ở thống kê WHO — không nhúng ma trận GSC vào khối này.
        </p>
      </div>
      <BkKhoaBlock
        maBk="BM.07.02"
        title="B · BM.02 · ty_le_vst_ky_thuat"
        hrefId="bm02"
        payload={payload}
        selectedKhoaIds={selectedKhoaIds}
        khoaOptions={khoaOptions}
        detailQuery={detailQuery}
        extraNote={`Khác ${PCT_SURFACE_LABEL.whoPhuDungKyThuat}.`}
      />
      <BkKhoaBlock
        maBk="BM.07.03"
        title="C · BM.03 · ty_le_vst_ngoai_khoa"
        hrefId="bm03"
        payload={payload}
        selectedKhoaIds={selectedKhoaIds}
        khoaOptions={khoaOptions}
        detailQuery={detailQuery}
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
  detailQuery,
  extraNote,
}: {
  maBk: string;
  title: string;
  hrefId: "bm02" | "bm03";
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  detailQuery: DetailQuery;
  extraNote?: string;
}) {
  const enabled = payload?.capabilities.topic_gsc === true;
  const deep = payload?.filters?.tu_ngay
    ? {
        tu_ngay: payload.filters.tu_ngay,
        den_ngay: payload.filters.den_ngay,
        khoa_ids: payload.filters.khoa_ids,
      }
    : null;
  const href = bcthVstStatsHref(hrefId, deep);
  const { detail, loading, error } = useGscChecklistDetail({
    maBk: enabled ? maBk : null,
    ...detailQuery,
  });

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
      <p className="text-[11px] text-slate-500">
        So sánh khoa của riêng {maBk}. Không dùng {PCT_SURFACE_LABEL.gscPool}.
        {extraNote ? ` ${extraNote}` : ""}
      </p>
    </div>
  );
}
