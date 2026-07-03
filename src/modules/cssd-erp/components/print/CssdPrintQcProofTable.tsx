"use client";

import React from "react";

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 5px",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  background: "#f5f5f5",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 5px",
  fontSize: 11,
  verticalAlign: "middle",
  lineHeight: 1.3,
};

const photoTd: React.CSSProperties = {
  ...td,
  width: "36%",
  padding: "2px 3px",
  verticalAlign: "middle",
  wordBreak: "break-word",
};

function ProofPhotoCell({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="cssd-print-proof-frame">
        <span style={{ fontSize: 10, color: "#666", fontStyle: "italic" }}>Không có ảnh</span>
      </div>
    );
  }
  return (
    <div className="cssd-print-proof-frame">
      <img src={url} alt="Minh chứng" />
    </div>
  );
}

/** Bảng QC: mỗi hàng = hạng mục test | kết quả | ảnh minh chứng. */
export default function CssdPrintQcProofTable({
  rows,
}: {
  rows: Array<{ label: string; ketQua: string; anhUrl: string | null }>;
}) {
  return (
    <>
      <p
        style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          margin: "8px 0 4px",
          pageBreakAfter: "avoid",
        }}
      >
        Đánh giá QC &amp; minh chứng
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", maxWidth: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "40%" }}>Hạng mục kiểm tra</th>
            <th style={{ ...th, width: "24%", textAlign: "center" }}>Kết quả</th>
            <th style={{ ...th, width: "36%", textAlign: "center" }}>Ảnh minh chứng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ pageBreakInside: "avoid" }}>
              <td style={{ ...td, fontWeight: 600, wordBreak: "break-word" }}>{row.label}</td>
              <td style={{ ...td, textAlign: "center", fontWeight: 700, wordBreak: "break-word" }}>{row.ketQua}</td>
              <td style={photoTd}>
                <ProofPhotoCell url={row.anhUrl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
