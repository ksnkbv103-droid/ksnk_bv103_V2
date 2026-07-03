"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import CssdPrintQrBlock from "./CssdPrintQrBlock";
import CssdPrintQcProofTable from "./CssdPrintQcProofTable";
import {
  buildCssdQcProofRows,
  formatCssdPrintDateTime,
} from "../../lib/cssd-print-format";
import type { CssdBatchPrintData } from "../../types/cssd-print.types";

const labelRow = (label: string, value: string) => (
  <p style={{ margin: "0 0 3px 0", fontSize: 12, lineHeight: 1.35 }}>
    <strong>{label}:</strong> {value}
  </p>
);

const tableTh: React.CSSProperties = {
  border: "1px solid #000",
  padding: 4,
  fontSize: 11,
  fontWeight: 800,
};

const tableTd: React.CSSProperties = {
  border: "1px solid #000",
  padding: 4,
  fontSize: 12,
  wordBreak: "break-word",
};

export default function CssdBatchPrintView({
  data,
  qrDataUrl,
}: {
  data: CssdBatchPrintData;
  qrDataUrl: string;
}) {
  const qcRows = buildCssdQcProofRows(data);

  return (
    <PrintLayout
      title="PHIẾU MẺ TIỆT KHUẨN DỤNG CỤ"
      subtitle={`Mã mẻ: ${data.maLo} · ${data.ketQuaDat ? "KẾT LUẬN: ĐẠT" : "KẾT LUẬN: KHÔNG ĐẠT"}`}
      leftSignatureTitle="NHÂN VIÊN TIỆT KHUẨN"
      rightSignatureTitle="TRƯỞNG KHOA / ĐD TRƯỞNG CSSD"
      density="compact"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 6,
          pageBreakInside: "avoid",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {labelRow("Thiết bị tiệt khuẩn", data.thietBi)}
          {labelRow("Người load mẻ", data.nguoiLoad)}
          {labelRow("Người dỡ mẻ / QC", data.nguoiUnload)}
          {labelRow("Bắt đầu mẻ", formatCssdPrintDateTime(data.thoiGianBatDau))}
          {labelRow("Kết thúc mẻ", formatCssdPrintDateTime(data.thoiGianKetThuc))}
        </div>
        <CssdPrintQrBlock dataUrl={qrDataUrl} maLo={data.maLo} variant="compact" />
      </div>

      <CssdPrintQcProofTable rows={qcRows} />

      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          textTransform: "uppercase",
          margin: "10px 0 4px",
          pageBreakBefore: "auto",
        }}
      >
        Danh sách bộ dụng cụ trong mẻ ({data.members.length})
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...tableTh, width: "8%" }}>STT</th>
            <th style={{ ...tableTh, width: "38%" }}>Mã QR bộ</th>
            <th style={{ ...tableTh, width: "54%" }}>Tên bộ</th>
          </tr>
        </thead>
        <tbody>
          {data.members.map((m) => (
            <tr key={m.maQrBo}>
              <td style={{ ...tableTd, textAlign: "center" }}>{m.stt}</td>
              <td style={{ ...tableTd, fontSize: 11, fontFamily: "monospace" }}>{m.maQrBo}</td>
              <td style={tableTd}>{m.tenBo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.ghiChuQc ? (
        <p style={{ marginTop: 8, fontSize: 11, pageBreakInside: "avoid", wordBreak: "break-word" }}>
          <strong>Ghi chú QC:</strong> {data.ghiChuQc}
        </p>
      ) : null}
    </PrintLayout>
  );
}
