"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import CssdTraceLink from "./CssdTraceLink";
import { fetchCssdRcaBundle, type CssdRcaBundle } from "../actions/nkbv-cssd-rca.actions";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import { nkbvFormChrome as UI } from "@/modules/giam-sat-nkbv/lib/nkbv-form-chrome";
import { stationLabel } from "@/modules/cssd-erp/workflow/domain/cssd-stations";

type Props = {
  maQr?: string | null;
  quyTrinhId?: string | null;
  /** Khi true: hiện hướng dẫn gắn QR dù chưa có liên kết CSSD. */
  showEmptyHint?: boolean;
};

/** Panel RCA SSI → CSSD: mẻ QC + sự cố gắn quy trình và cảnh báo dịch tễ học vết mổ. */
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

  const isDanger = Boolean(
    data?.isRecalledBatch ||
      data?.hasRedAlertIncident ||
      data?.trangThaiBi === "DUONG" ||
      data?.ketQuaBi === false ||
      data?.ketQuaMe === false,
  );

  return (
    <div className={`mt-3 space-y-2 p-3 ${isDanger ? UI.noticeDanger : UI.noticeSuccess}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${UI.panelTitle} flex items-center gap-1.5 ${isDanger ? "text-rose-900" : "text-emerald-900"}`}>
          {isDanger ? (
            <AlertTriangle size={15} className="text-rose-600 animate-pulse" aria-hidden />
          ) : (
            <ShieldAlert size={14} aria-hidden />
          )}
          {isDanger ? "CẢNH BÁO DỊCH TỄ VẾT MỔ: MẺ CSSD CÓ SỰ CỐ / THU HỒI" : "RCA CSSD (SSI ↔ dụng cụ)"}
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
          {isDanger ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {data.trangThaiBi === "DUONG" || data.ketQuaBi === false ? (
                  <span className="inline-flex items-center rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                    BI DƯƠNG TÍNH / THẤT BẠI TIỆT KHUẨN
                  </span>
                ) : null}
                {data.isRecalledBatch || data.trangThaiMe === "THU_HOI" ? (
                  <span className="inline-flex items-center rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                    MẺ TIỆT KHUẨN BỊ THU HỒI
                  </span>
                ) : null}
                {data.ketQuaMe === false ? (
                  <span className="inline-flex items-center rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                    QC MẺ KHÔNG ĐẠT
                  </span>
                ) : null}
                {data.hasRedAlertIncident ? (
                  <span className="inline-flex items-center rounded-md bg-amber-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                    SỰ CỐ KHẨN (RED ALERT)
                  </span>
                ) : null}
              </div>
              <p className="rounded-lg bg-rose-100/90 p-2 text-xs font-medium leading-relaxed text-rose-950">
                <strong>Khuyến cáo KSNK:</strong> Bộ dụng cụ này thuộc chu kỳ tiệt khuẩn có nguy cơ vi sinh cao. Đề nghị kích
                hoạt ngay quy trình theo dõi vết mổ, chỉ định cấy mủ/dịch vết mổ và phân tích SSI theo QT.24 HD.01.
              </p>
            </div>
          ) : null}

          <p>
            <span className="font-semibold">Bộ:</span> {data.tenBo || "—"} · QR {data.maQr}
            {data.tramHienTai ? ` · Trạm ${stationLabel(data.tramHienTai)}` : ""}
          </p>
          <p>
            <span className="font-semibold">Mẻ TK:</span>{" "}
            {data.maLo ? (
              <>
                {data.maLo}
                {data.ketQuaMe === true
                  ? " (ĐẠT)"
                  : data.ketQuaMe === false
                    ? " (KHÔNG ĐẠT)"
                    : data.trangThaiMe === "THU_HOI"
                      ? " (BỊ THU HỒI)"
                      : " (chưa QC)"}
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
                    className="font-semibold text-rose-800 underline decoration-dotted"
                  >
                    {inc.typeLabel || "Sự cố"}
                  </Link>
                  {inc.isRedAlert ? (
                    <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-700">
                      Khẩn cấp
                    </span>
                  ) : null}
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
