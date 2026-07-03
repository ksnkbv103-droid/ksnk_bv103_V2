"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import CssdCapPhatQrStrip from "./CssdCapPhatQrStrip";
import CssdPrintInstrumentTable from "./CssdPrintInstrumentTable";
import {
  formatCssdPrintDate,
  formatCssdPrintDateTime,
  formatCssdTriLabel,
} from "../../lib/cssd-print-format";
import type { CssdCapPhatPrintData } from "../../types/cssd-print.types";
import type { CssdCapPhatPrintQrs } from "../../hooks/use-cssd-print";

const labelRow = (label: string, value: string) => (
  <p style={{ margin: "0 0 4px 0", fontSize: 13 }}>
    <strong>{label}:</strong> {value}
  </p>
);

export default function CssdCapPhatPrintView({
  data,
  qrs,
}: {
  data: CssdCapPhatPrintData;
  qrs: CssdCapPhatPrintQrs;
}) {
  return (
    <PrintLayout
      title="PHIẾU CẤP PHÁT DỤNG CỤ VÔ KHUẨN"
      subtitle={`Bộ: ${data.tenBo}`}
      leftSignatureTitle="NHÂN VIÊN CSSD (CẤP PHÁT)"
      rightSignatureTitle="NGƯỜI NHẬN (PHÒNG MỔ / KHOA LÂM SÀNG)"
    >
      <CssdCapPhatQrStrip
        maQrBo={data.maQrBo}
        maCycleQr={data.maCycleQr}
        maLo={data.maLo}
        qrBoDataUrl={qrs.qrBoDataUrl}
        qrCycleDataUrl={qrs.qrCycleDataUrl}
        qrMeDataUrl={qrs.qrMeDataUrl}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          {labelRow("Tên bộ dụng cụ", data.tenBo.toUpperCase())}
          {labelRow("Mã QR bộ", data.maQrBo)}
          {data.maCycleQr ? labelRow("Mã chu trình xử lý", data.maCycleQr) : null}
          {labelRow("Hạn sử dụng vô khuẩn", formatCssdPrintDate(data.hanSuDung))}
          {labelRow("Người cấp phát", data.nguoiCapPhat)}
          {labelRow("Thời gian cấp phát", formatCssdPrintDateTime(data.thoiGianCapPhat))}
        </div>
        <div>
          {labelRow("Mã mẻ tiệt khuẩn", data.maLo)}
          {labelRow("Thiết bị TK", data.thietBi)}
          {labelRow("Người load mẻ", data.nguoiLoad)}
          {labelRow("Người dỡ mẻ", data.nguoiUnload)}
          {labelRow("Kết thúc mẻ TK", formatCssdPrintDateTime(data.thoiGianKetThucMe))}
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", margin: "12px 0 6px" }}>
        Thông số tiệt khuẩn (từ mẻ {data.maLo})
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
        <span><strong>Nhiệt/áp:</strong> {data.nhietDoApSuat}</span>
        <span><strong>Thông số máy:</strong> {data.thongSoMay}</span>
        <span><strong>CI:</strong> {formatCssdTriLabel(data.testCI)}</span>
        <span><strong>Chỉ thị TX:</strong> {formatCssdTriLabel(data.chiThiTiepXuc)}</span>
        <span><strong>Chỉ thị ĐTS:</strong> {formatCssdTriLabel(data.chiThiDaThongSo)}</span>
        <span><strong>BI:</strong> {formatCssdTriLabel(data.testSinhHoc)}</span>
        <span><strong>Bowie–Dick:</strong> {formatCssdTriLabel(data.testBowieDick)}</span>
      </div>

      <p style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", margin: "20px 0 6px" }}>
        Danh mục dụng cụ trong bộ cấp phát
      </p>
      <CssdPrintInstrumentTable rows={data.instruments} />

      <p style={{ marginTop: 16, fontSize: 11, fontStyle: "italic", color: "#444" }}>
        Quét QR bộ ({data.maQrBo}), chu trình ({data.maCycleQr || "—"}) hoặc mẻ ({data.maLo}) để truy vết.
        Gán ca mổ / bệnh nhân tại tab Truy vết trên trang Quy trình CSSD.
      </p>
    </PrintLayout>
  );
}
