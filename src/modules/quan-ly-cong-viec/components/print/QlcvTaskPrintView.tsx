"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { normalizeQlcvChecklist } from "@/lib/domain/qlcv-checklist";
import { buildPrintFileTitle, shortIdMa } from "@/lib/print/print-file-title";
import { formatLoaiCongViecLabel, formatMucDoUuTienLabel } from "../../lib/qlcv-labels";
import { formatDateVi } from "@/lib/format-datetime-vi";

type TaskLike = {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec?: string | null;
  muc_do_uu_tien?: string | null;
  trang_thai?: string | null;
  han_hoan_thanh?: string | null;
  phan_tram_hoan_thanh?: number | null;
  vi_tri_thuc_hien?: string | null;
  nguoi_phu_trach_ten?: string | null;
  nguoi_giao_ten?: string | null;
  to_cong_tac_ten?: string | null;
  checklist?: unknown;
  nguoi_phu_trach?: { ho_ten?: string | null } | null;
  nguoi_giao?: { ho_ten?: string | null } | null;
  to_cong_tac?: { ten_to?: string | null } | null;
};

type Props = {
  task: TaskLike;
  phoiHopLabels?: string;
  theoDoiLabels?: string;
};

/** In một phiếu công việc (đột xuất hoặc định kỳ đã sinh). */
export function QlcvTaskPrintView({ task, phoiHopLabels = "—", theoDoiLabels = "—" }: Props) {
  const items = normalizeQlcvChecklist(task.checklist);
  const phuTrach = task.nguoi_phu_trach_ten || task.nguoi_phu_trach?.ho_ten || "—";
  const nguoiGiao = task.nguoi_giao_ten || task.nguoi_giao?.ho_ten || "—";
  const to = task.to_cong_tac_ten || task.to_cong_tac?.ten_to || "—";

  return (
    <PrintLayout
      title="PHIẾU CÔNG VIỆC KSNK"
      subtitle={task.tieu_de}
      leftSignatureTitle="NGƯỜI THỰC HIỆN"
      rightSignatureTitle="NGƯỜI THEO DÕI / NGHIỆM THU"
      density="compact"
      fileTitle={() =>
        buildPrintFileTitle({ loai: "CV", ma: shortIdMa(task.id) })
      }
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={lab}>Loại</td>
            <td style={val}>{formatLoaiCongViecLabel(task.loai_cong_viec)}</td>
            <td style={lab}>Ưu tiên</td>
            <td style={val}>{formatMucDoUuTienLabel(task.muc_do_uu_tien)}</td>
          </tr>
          <tr>
            <td style={lab}>Trạng thái</td>
            <td style={val}>{task.trang_thai || "—"}</td>
            <td style={lab}>Tiến độ</td>
            <td style={val}>{Number(task.phan_tram_hoan_thanh ?? 0)}%</td>
          </tr>
          <tr>
            <td style={lab}>Hạn</td>
            <td style={val}>
              {formatDateVi(task.han_hoan_thanh)}
            </td>
            <td style={lab}>Vị trí</td>
            <td style={val}>{task.vi_tri_thuc_hien || "—"}</td>
          </tr>
          <tr>
            <td style={lab}>Người giao</td>
            <td style={val}>{nguoiGiao}</td>
            <td style={lab}>Phụ trách</td>
            <td style={val}>{phuTrach}</td>
          </tr>
          <tr>
            <td style={lab}>Tổ</td>
            <td style={val}>{to}</td>
            <td style={lab}>Phối hợp</td>
            <td style={val}>{phoiHopLabels}</td>
          </tr>
          <tr>
            <td style={lab}>Theo dõi</td>
            <td style={val} colSpan={3}>
              {theoDoiLabels}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Mô tả</p>
      <p style={{ fontSize: 12, marginBottom: 12, whiteSpace: "pre-wrap" }}>
        {task.mo_ta?.trim() || "—"}
      </p>

      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Checklist</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 12, fontStyle: "italic" }}>Không có checklist.</p>
      ) : (
        <ol style={{ fontSize: 12, margin: 0, paddingLeft: 18 }}>
          {items.map((it) => (
            <li key={it.id}>
              {it.done ? "☑" : "☐"} {it.label}
            </li>
          ))}
        </ol>
      )}
    </PrintLayout>
  );
}

const lab: React.CSSProperties = {
  border: "1px solid #333",
  padding: "5px 8px",
  background: "#f3f4f6",
  fontWeight: 700,
  width: "14%",
};
const val: React.CSSProperties = {
  border: "1px solid #333",
  padding: "5px 8px",
  width: "36%",
};
