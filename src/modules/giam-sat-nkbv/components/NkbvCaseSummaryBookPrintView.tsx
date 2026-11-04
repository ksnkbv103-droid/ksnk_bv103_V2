"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import { formatNkbvLoaiDisplay } from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";
import { todayYmdInVn } from "@/lib/format-datetime-vi";

export type NkbvCaseSummaryBookPrintProps = {
  cases: Array<Record<string, unknown>>;
  khoaFilterLabel?: string;
  loaiFilterLabel?: string;
  trangThaiFilterLabel?: string;
  totalCount: number;
};

function fmtDate(raw: unknown): string {
  const s = String(raw || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function NkbvCaseSummaryBookPrintView({
  cases,
  khoaFilterLabel,
  loaiFilterLabel,
  trangThaiFilterLabel,
  totalCount,
}: NkbvCaseSummaryBookPrintProps) {
  const today = todayYmdInVn();

  return (
    <PrintLayout
      title="SỔ THEO DÕI, TỔNG HỢP CA BỆNH NHIỄM KHUẨN BỆNH VIỆN"
      subtitle="(Ban hành kèm theo Quy trình KSNK.QT.33 — Quyết định 3916/QĐ-BYT)"
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      density="compact"
      leftSignatureTitle="NGƯỜI LẬP SỔ"
      rightSignatureTitle="TRƯỞNG KHOA KIỂM SOÁT NHIỄM KHUẨN"
      fileTitle={() =>
        buildPrintFileTitle({
          loai: "NKBV_BM04",
          ma: today.replace(/-/g, ""),
        })
      }
    >
      <div style={{ color: "#000", fontSize: "11px", lineHeight: 1.35 }}>
        {/* === META BAR === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ display: "flex", gap: "12px", color: "#334155", fontSize: "10.5px" }}>
            <span>
              <strong>Khoa:</strong> {khoaFilterLabel || "Toàn viện"}
            </span>
            <span>
              <strong>Loại NKBV:</strong> {loaiFilterLabel || "Tất cả"}
            </span>
            <span>
              <strong>Trạng thái:</strong> {trangThaiFilterLabel || "Tất cả"}
            </span>
            <span>
              <strong>Tổng số ca:</strong> {totalCount}
            </span>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#1e293b", fontSize: "11px" }}>
            Biểu mẫu: BM.04/QT.33
          </span>
        </div>

        {/* === TABLE === */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "6px",
            marginBottom: "12px",
            fontSize: "10px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center" }}>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 2px", width: "4%" }}>STT</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "9%" }}>Mã ca</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "12%" }}>Mã BA / PID</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "16%" }}>Họ và tên người bệnh</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "12%" }}>Khoa điều trị (LOA)</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "8%" }}>Ngày VV</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "8%" }}>Ngày DOE</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "10%" }}>Loại NKBV</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 4px", width: "11%" }}>Tác nhân vi sinh</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 2px", width: "5%" }}>POA/HAI</th>
              <th style={{ border: "1px solid #94a3b8", padding: "4px 2px", width: "5%" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    padding: "16px 8px",
                    fontStyle: "italic",
                    color: "#64748b",
                  }}
                >
                  Không có ca bệnh nào trong danh sách được chọn.
                </td>
              </tr>
            ) : (
              cases.map((c, idx) => {
                const maCa = String(c.ma_ca || c.id || "—");
                const maBa = String(c.ma_benh_an || "—");
                const pid = String(c.ma_benh_nhan || "—");
                const hoTen = String(c.ho_ten_benh_nhan || "—");
                const khoa = String(c.ten_khoa || c.khoa_dieu_tri || "—");
                const ngayVv = fmtDate(c.ngay_vao_vien);
                const ngayDoe = fmtDate(c.ngay_su_kien || c.ngay_phat_hien);
                const loaiNkbv = formatNkbvLoaiDisplay(
                  String(c.loai_nkbv_ma || ""),
                  String(c.loai_nkbv_ten || ""),
                );
                const tacNhan = String(c.tac_nhan_vi_khuan || "—");
                const poaHai = String(c.phan_loai_poa_hai || "—");
                const trangThai = String(c.trang_thai_ten || c.trang_thai_ma || "—");

                return (
                  <tr
                    key={String(c.id || idx)}
                    style={{
                      backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                    }}
                  >
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 2px", textAlign: "center" }}>
                      {idx + 1}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", fontFamily: "monospace", textAlign: "center" }}>
                      {maCa}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", fontFamily: "monospace" }}>
                      {maBa}
                      {pid !== "—" ? ` / ${pid}` : ""}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", fontWeight: 600 }}>
                      {hoTen}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px" }}>
                      {khoa}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", textAlign: "center" }}>
                      {ngayVv}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", textAlign: "center", fontWeight: 600 }}>
                      {ngayDoe}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px" }}>
                      {loaiNkbv}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 4px", fontStyle: "italic" }}>
                      {tacNhan}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 2px", textAlign: "center", fontWeight: 600 }}>
                      {poaHai}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "3px 2px", textAlign: "center" }}>
                      {trangThai}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </PrintLayout>
  );
}
