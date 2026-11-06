"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { lyDoXuatLabel } from "@/lib/domain/cssd-kho-hoa-chat-ly-do-xuat";
import type { TheKho } from "@/lib/domain/cssd-kho-hoa-chat-the-kho";
import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import type { KhoHoaChatGiaoDichRow } from "../../actions/cssd-kho-hoa-chat.actions";

export type KhoPrintItem = { ma_hoa_chat: string; ten_hoa_chat: string; don_vi_tinh: string | null; tong_ton: number };
export type KhoPrintState =
  | { kind: "PHIEU"; item: KhoPrintItem; mov: KhoHoaChatGiaoDichRow }
  | { kind: "THE_KHO"; item: KhoPrintItem; the: TheKho }
  | null;

const th: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 11, fontWeight: 800, background: "#f5f5f5" };
const td: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 12, verticalAlign: "top" };
const row = (label: string, value: string) => (
  <p style={{ margin: "0 0 4px", fontSize: 13, wordBreak: "break-word" }}>
    <strong>{label}:</strong> {value}
  </p>
);

export default function KhoHoaChatPrintView({ state }: { state: KhoPrintState }) {
  if (!state) return null;
  const { item } = state;
  const dvt = item.don_vi_tinh || "";
  const hang = `${item.ten_hoa_chat} (${item.ma_hoa_chat})`;

  if (state.kind === "PHIEU") {
    const m = state.mov;
    const xuat = m.so_luong_co_dau < 0;
    return (
      <PrintLayout
        title={xuat ? "PHIẾU XUẤT KHO HÓA CHẤT, VẬT TƯ" : "PHIẾU NHẬP KHO HÓA CHẤT, VẬT TƯ"}
        subtitle={`Số phiếu: ${m.ma_phieu}`}
        leftSignatureTitle={xuat ? "NGƯỜI LẬP PHIẾU" : "NGƯỜI NHẬP KHO"}
        rightSignatureTitle={xuat ? "NGƯỜI NHẬN / DUYỆT" : "NGƯỜI DUYỆT"}
        fileTitle={() => buildPrintFileTitle({ loai: xuat ? "PXK" : "PNK", ma: m.ma_phieu })}
      >
        {row("Mặt hàng", hang)}
        {row(xuat ? "Số lượng xuất" : "Số lượng nhập", `${Math.abs(m.so_luong_co_dau)} ${dvt}`)}
        {row("Lô", m.ma_lo || "Không mã lô")}
        {row("Hạn sử dụng", m.han_su_dung ? formatDateVi(m.han_su_dung) : "—")}
        {xuat ? row("Lý do xuất", lyDoXuatLabel(m.ly_do_xuat) ?? "—") : null}
        {row("Ghi chú", m.ghi_chu || "—")}
        {row("Thời gian lập", m.created_at ? formatDateTimeVi(m.created_at) : "—")}
        {row("Người lập", m.nguoi_lap_ten || "—")}
        {row("Người duyệt", m.nguoi_duyet_ten || "—")}
        {row("Thời gian duyệt", m.duyet_at ? formatDateTimeVi(m.duyet_at) : "—")}
        {m.tu_duyet_ngoai_le ? row("Lưu ý", "Tự duyệt ngoại lệ (chỉ có một người có quyền duyệt)") : null}
      </PrintLayout>
    );
  }

  const t = state.the;
  return (
    <PrintLayout
      title="THẺ KHO"
      subtitle={hang}
      density="compact"
      leftSignatureTitle="THỦ KHO"
      rightSignatureTitle="TRƯỞNG KHOA / NGƯỜI DUYỆT"
      fileTitle={() => buildPrintFileTitle({ loai: "THEKHO", ma: item.ma_hoa_chat })}
    >
      <p style={{ margin: "0 0 6px", fontSize: 12 }}>
        Đơn vị tính: {dvt || "—"} · Chỉ gồm phiếu đã duyệt · Tồn đầu: <strong>{t.ton_dau}</strong>
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["STT", "Ngày", "Số phiếu", "Lô / HSD", "Lý do", "Nhập", "Xuất", "Tồn"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.dong.length ? (
            t.dong.map((d, i) => (
              <tr key={d.id}>
                <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                <td style={td}>{d.ngay ? formatDateTimeVi(d.ngay) : "—"}</td>
                <td style={td}>{d.ma_phieu}</td>
                <td style={td}>{d.ma_lo || "—"}{d.han_su_dung ? ` · ${formatDateVi(d.han_su_dung)}` : ""}</td>
                <td style={td}>{lyDoXuatLabel(d.ly_do_xuat) ?? (d.nhap ? "Nhập kho" : "")}</td>
                <td style={{ ...td, textAlign: "right" }}>{d.nhap || ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{d.xuat || ""}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{d.ton_sau}</td>
              </tr>
            ))
          ) : (
            <tr><td style={td} colSpan={8}>Chưa có phiếu đã duyệt.</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...td, fontWeight: 800 }} colSpan={5}>Cộng</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{t.tong_nhap}</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{t.tong_xuat}</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{t.ton_cuoi}</td>
          </tr>
        </tfoot>
      </table>
    </PrintLayout>
  );
}
