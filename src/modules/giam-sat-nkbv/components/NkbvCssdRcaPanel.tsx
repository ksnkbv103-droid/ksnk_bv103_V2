"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";
import CssdTraceLink from "./CssdTraceLink";
import { fetchCssdRcaBundle, type CssdRcaBundle } from "../actions/nkbv-cssd-rca.actions";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import { nkbvFormChrome as UI } from "@/modules/giam-sat-nkbv/lib/nkbv-form-chrome";

type Props = {
  maQr?: string | null;
  quyTrinhId?: string | null;
  /** Khi true: hiện hướng dẫn gắn QR dù chưa có liên kết CSSD. */
  showEmptyHint?: boolean;
};

/** Panel RCA SSI → CSSD: mẻ QC + sự cố gắn quy trình. */
export default function NkbvCssdRcaPanel({ maQr, quyTrinhId, showEmptyHint = false }: Props) {
  const [data, setData] = useState<CssdRcaBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLink = Boolean(maQr || quyTrinhId);

  useEffect(() => {
    if (!hasLink) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCssdRcaBundle({ maQr, quyTrinhId }).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setData(null);
      } else {
        setData(res.data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [maQr, quyTrinhId, hasLink]);

  if (!hasLink && !showEmptyHint) return null;

  if (!hasLink && showEmptyHint) {
    return (
      <div className={`mt-3 space-y-1.5 p-3 ${UI.noticeWarning}`}>
        <p className={`${UI.panelTitle} flex items-center gap-1.5 text-amber-900`}>
          <ShieldAlert size={14} aria-hidden />
          RCA CSSD (SSI ↔ dụng cụ)
        </p>
        <p className="text-xs text-amber-950/90 leading-relaxed">
          Chưa gắn mã QR chu trình CSSD. Quét hoặc nhập QR bộ dụng cụ ở form SSI (tab Vi sinh / Lâm sàng), rồi lưu
          checklist — hệ thống sẽ hiện mẻ tiệt khuẩn và sự cố liên quan tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-3 space-y-2 p-3 ${UI.noticeSuccess}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${UI.panelTitle} flex items-center gap-1.5 text-emerald-900`}>
          <ShieldAlert size={14} aria-hidden />
          RCA CSSD (SSI ↔ dụng cụ)
        </p>
        <CssdTraceLink maQr={maQr || data?.maQr} tenBo={data?.tenBo} />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Đang tải chuỗi truy vết…
        </p>
      ) : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {data ? (
        <div className="space-y-2 text-xs text-slate-800">
          <p>
            <span className="font-semibold">Bộ:</span> {data.tenBo || "—"} · QR {data.maQr}
            {data.tramHienTai ? ` · Trạm ${data.tramHienTai.replace(/_/g, " ")}` : ""}
          </p>
          <p>
            <span className="font-semibold">Mẻ TK:</span>{" "}
            {data.maLo ? (
              <>
                {data.maLo}
                {data.ketQuaMe === true ? " (ĐẠT)" : data.ketQuaMe === false ? " (KHÔNG ĐẠT)" : " (chưa QC)"}
              </>
            ) : (
              "Chưa gắn mẻ — kiểm tra mẻ hấp trên quy trình CSSD sau khi bộ qua trạm Tiệt khuẩn."
            )}
          </p>
          {data.incidents.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1">
              {data.incidents.slice(0, 5).map((inc) => (
                <li key={inc.id}>
                  <Link
                    href={cssdSuCoIncidentJournalHref(inc.id)}
                    className="font-semibold text-emerald-800 underline decoration-dotted"
                  >
                    {inc.typeLabel || "Sự cố"}
                  </Link>
                  {inc.station ? ` @ ${inc.station}` : ""} — {inc.moTa.slice(0, 80)}
                  {inc.moTa.length > 80 ? "…" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Không có sự cố CSSD gắn quy trình này.</p>
          )}
        </div>
      ) : !loading && !error ? (
        <p className="text-xs text-slate-500">
          Chưa resolve được quy trình CSSD từ mã QR. Kiểm tra mã chu trình (cycle QR) đã quét đúng trên CSSD chưa.
        </p>
      ) : null}
    </div>
  );
}
