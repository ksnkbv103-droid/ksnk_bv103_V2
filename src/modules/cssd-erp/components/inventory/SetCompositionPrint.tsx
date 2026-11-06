"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import type { CompositionReconcilePayload } from "../../actions/cssd-composition-reconcile.actions";
import { formatSetQtyLine, summarizeSetComposition } from "../../shared/domain/cssd-set-composition";

const cell: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 12 };

/** Phiếu A4 «Danh mục bộ dụng cụ» — in từ thẻ thành phần bộ; chỉ hiện khi in. */
export default function SetCompositionPrint({ data }: { data: CompositionReconcilePayload }) {
  const sum = summarizeSetComposition(data.items);
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <PrintLayout
      title="DANH MỤC BỘ DỤNG CỤ"
      subtitle={`${data.tenBo || ""} · ${data.maBo || ""}`}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      leftSignatureTitle="NGƯỜI LẬP"
      rightSignatureTitle="NGƯỜI DUYỆT"
      density="compact"
      fileTitle={`DANHMUC_BO_${data.maBo || ""}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 6px 0", fontSize: 12 }}>
        <div>
          <span>Khoa sử dụng: <strong>{data.tenKhoa || "Chưa phân bổ"}</strong></span>
          {data.phanLoaiBo ? <span> · Phân loại: <strong>{data.phanLoaiBo}</strong></span> : null}
        </div>
        <div>
          <span>Ngày in: {today}</span> · <span>{formatSetQtyLine(sum.can, sum.thuc, sum.thieu)}</span>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...cell, width: 32 }}>STT</th>
            <th style={cell}>Mã loại</th>
            <th style={cell}>Tên thành phần</th>
            <th style={{ ...cell, width: 56 }}>Chuẩn</th>
            <th style={{ ...cell, width: 56 }}>Thực tế</th>
            <th style={{ ...cell, width: 90 }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row, i) => (
            <tr key={row.chiTietId}>
              <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
              <td style={cell}>{row.maLoai || ""}</td>
              <td style={cell}>{row.tenDungCuLe}</td>
              <td style={{ ...cell, textAlign: "center" }}>{row.soLuongKeHoach}</td>
              <td style={{ ...cell, textAlign: "center" }}>{row.soLuongThucTe}</td>
              <td style={cell}>{row.isMissing ? "Thiếu" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintLayout>
  );
}
