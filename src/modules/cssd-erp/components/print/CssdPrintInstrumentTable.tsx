"use client";

import React from "react";
import type { CssdPrintInstrumentRow } from "../../types/cssd-print.types";

const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  background: "#f5f5f5",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  fontSize: 12,
  verticalAlign: "top",
};

export default function CssdPrintInstrumentTable({
  rows,
  showBoColumn,
  boLabel,
}: {
  rows: CssdPrintInstrumentRow[];
  showBoColumn?: boolean;
  boLabel?: string;
}) {
  if (!rows.length) {
    return (
      <p style={{ fontSize: 12, fontStyle: "italic", margin: "8px 0" }}>
        Chưa có danh mục dụng cụ thành phần trong danh mục bộ.
      </p>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: 36 }}>STT</th>
          {showBoColumn ? <th style={thStyle}>Bộ</th> : null}
          <th style={thStyle}>Tên dụng cụ / cấu phần</th>
          <th style={{ ...thStyle, width: 52, textAlign: "center" }}>KH</th>
          <th style={{ ...thStyle, width: 52, textAlign: "center" }}>TT</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={`${row.ten}-${idx}`}>
            <td style={{ ...tdStyle, textAlign: "center" }}>{idx + 1}</td>
            {showBoColumn ? <td style={tdStyle}>{boLabel || "—"}</td> : null}
            <td style={tdStyle}>{row.ten}</td>
            <td style={{ ...tdStyle, textAlign: "center" }}>{row.keHoach}</td>
            <td style={{ ...tdStyle, textAlign: "center" }}>{row.thucTe}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
