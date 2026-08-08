"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import { formatLoaiCongViecLabel } from "../../lib/qlcv-labels";
import type { QlcvPeriodRange } from "../../lib/qlcv-period-range";
import type { CongViecView } from "../../types";
import { formatDateVi } from "@/lib/format-datetime-vi";

type Props = {
  period: QlcvPeriodRange;
  tasks: CongViecView[];
};

export function QlcvPeriodExecPrintView({ period, tasks }: Props) {
  const sorted = [...tasks].sort((a, b) => {
    const ha = String(a.han_hoan_thanh || a.created_at || "").slice(0, 10);
    const hb = String(b.han_hoan_thanh || b.created_at || "").slice(0, 10);
    return ha.localeCompare(hb) || String(a.tieu_de).localeCompare(String(b.tieu_de));
  });

  const printMa = `${period.kind}_${period.startIso.slice(0, 7)}`;

  return (
    <PrintLayout
      title="BẢNG NỘI DUNG CÔNG VIỆC (THỰC THI)"
      subtitle={period.label}
      leftSignatureTitle="NGƯỜI TỔNG HỢP"
      rightSignatureTitle="THỦ TRƯỞNG ĐƠN VỊ"
      density="compact"
      fileTitle={() => buildPrintFileTitle({ loai: "TTCV", ma: printMa })}
    >
      <p style={{ fontSize: 12, marginBottom: 12 }}>
        Phiếu trên bảng Điều hành trong kỳ (đột xuất + định kỳ đã sinh) — phổ biến / quán triệt / lưu trữ.
      </p>
      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, fontStyle: "italic" }}>
          Không có phiếu trong kỳ. Kiểm tra: đã «Sinh phiếu hôm nay» cho định kỳ? Việc đột xuất đã có hạn / ngày tạo
          trong kỳ?
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "6%" }}>STT</th>
              <th style={{ ...th, width: "28%" }}>Tiêu đề</th>
              <th style={{ ...th, width: "12%" }}>Loại</th>
              <th style={{ ...th, width: "14%" }}>Vị trí</th>
              <th style={{ ...th, width: "14%" }}>Phụ trách</th>
              <th style={{ ...th, width: "12%" }}>Hạn</th>
              <th style={{ ...th, width: "8%" }}>TT</th>
              <th style={{ ...th, width: "6%" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.id}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{t.tieu_de}</td>
                <td style={td}>{formatLoaiCongViecLabel(t.loai_cong_viec)}</td>
                <td style={td}>{t.vi_tri_thuc_hien || "—"}</td>
                <td style={td}>{t.nguoi_phu_trach_ten || "—"}</td>
                <td style={td}>
                  {formatDateVi(t.han_hoan_thanh)}
                </td>
                <td style={td}>{t.trang_thai}</td>
                <td style={td}>{Number(t.phan_tram_hoan_thanh ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PrintLayout>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  textAlign: "left",
  background: "#fff",
  wordBreak: "break-word",
};
const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  verticalAlign: "top",
  wordBreak: "break-word",
};
