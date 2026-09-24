"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import CssdPrintQrBlock from "./CssdPrintQrBlock";
import { formatCssdPrintDateTime } from "../../lib/cssd-print-format";
import type { CssdBatchPrintData } from "../../types/cssd-print.types";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";

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
  return (
    <PrintLayout
      title="PHIẾU MẺ TIỆT KHUẨN DỤNG CỤ"
      subtitle={`Mã mẻ: ${data.maLo} · Trạng thái: ${data.trangThaiLabel}`}
      leftSignatureTitle="NHÂN VIÊN TIỆT KHUẨN"
      rightSignatureTitle="TRƯỞNG KHOA / ĐD TRƯỞNG CSSD"
      density="compact"
      fileTitle={() =>
        buildPrintFileTitle({ loai: "ME", ma: data.maLo || data.batchId })
      }
      afterFooter={
        qrDataUrl ? (
          <CssdPrintQrBlock dataUrl={qrDataUrl} maLo={data.maLo} caption="Quét truy vết mẻ" variant="compact" />
        ) : null
      }
    >
      <div style={{ marginBottom: 6, pageBreakInside: "avoid" }}>
        {labelRow("Thiết bị tiệt khuẩn", data.thietBi)}
        {labelRow("Phương pháp", data.phuongPhap)}
        {labelRow("Chương trình", data.chuongTrinh)}
        {labelRow("Nhiệt độ", data.nhietDo)}
        {labelRow("Áp suất", data.apSuat)}
        {labelRow("Thời gian chu kỳ", data.thoiGianChuKy)}
        {labelRow("Người nạp", data.nguoiNap)}
        {labelRow("Người dỡ", data.nguoiDo)}
        {labelRow("Người nhả", data.nguoiNha)}
        {labelRow("Giờ bắt đầu", formatCssdPrintDateTime(data.thoiGianBatDau))}
        {labelRow("Giờ kết thúc chu trình", formatCssdPrintDateTime(data.thoiGianKetThucChuTrinh))}
        {labelRow("Giờ nhả", formatCssdPrintDateTime(data.thoiGianNha))}
        {labelRow("Thông số vật lý", data.qcVatLy)}
        {labelRow("CI ngoài gói", data.qcCiNgoai)}
        {labelRow("CI PCD", data.qcCiPcd)}
        {labelRow("BI", data.biLabel)}
        {labelRow("Implant", data.coImplantLabel)}
      </div>

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
            <th style={{ ...tableTh, width: "38%" }}>Mã bộ</th>
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
