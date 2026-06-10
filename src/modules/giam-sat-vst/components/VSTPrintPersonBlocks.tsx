"use client";

import React from "react";
import type { ExtendedOpportunity, VSTFormPerson } from "../hooks/useVSTFormHandlers";
import { classifyVstAction } from "../lib/vst-action-classifier";
import { getVstPrintGloveDisplay } from "../lib/vst-print-glove-display";
import { tenNhanVien, tenNghe } from "./vst-print-helpers";

type Nghe = { id?: string; ten_danh_muc?: string };
type NhanSu = { id?: string; ho_ten?: string };

export function VSTPrintPersonBlocks({
  persons,
  ngheNghieps,
  nhanSus,
}: {
  persons: VSTFormPerson[];
  ngheNghieps: Nghe[];
  nhanSus: NhanSu[];
}) {
  return (
    <>
      {persons.map((p, pIdx) => {
        const opps = p.opportunities;
        /** Có hành động là đủ (dữ liệu cũ/import có thể thiếu mốc WHO trên dòng). */
        const validOpps = opps
          .filter((o: ExtendedOpportunity) => Boolean(o.hanh_dong))
          .slice()
          .sort((a, b) => {
            const ta = a.thoi_gian_ghi_nhan ? new Date(a.thoi_gian_ghi_nhan).getTime() : 0;
            const tb = b.thoi_gian_ghi_nhan ? new Date(b.thoi_gian_ghi_nhan).getTime() : 0;
            if (ta !== tb) return ta - tb;
            return String(a.id).localeCompare(String(b.id));
          });
        if (validOpps.length === 0) return null;

        const tenNvRaw = tenNhanVien(
          { nhan_vien_id: p.nhan_vien_id, is_manual: p.is_manual, ten_manual: p.ten_manual },
          nhanSus,
        );
        const tenNv =
          p.id_col === "__MISSING_PERSON__" && tenNvRaw === "—"
            ? "Chưa gán tên đối tượng (dữ liệu import / hệ thống cũ)"
            : tenNvRaw;
        const nn = tenNghe(
          {
            nghe_nghiep_id: p.nghe_nghiep_id,
            nghe_nghiep: (p as { nghe_nghiep?: string }).nghe_nghiep,
          },
          ngheNghieps,
        );

        return (
          <div key={pIdx} className="break-inside-avoid" style={{ marginBottom: "16px" }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                borderBottom: "1px solid #000",
                padding: "6px 0",
                marginBottom: "8px",
                color: "#000",
              }}
            >
              Nhân viên {pIdx + 1}: {tenNv} — {nn}
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={{ width: "32px", textAlign: "center", border: "1px solid #000", padding: "6px", background: "#fff" }}>STT</th>
                  <th style={{ border: "1px solid #000", padding: "6px", background: "#fff" }}>Thời điểm vệ sinh tay (WHO)</th>
                  <th style={{ width: "110px", textAlign: "center", border: "1px solid #000", padding: "6px", background: "#fff" }}>Hành động</th>
                  <th style={{ width: "72px", textAlign: "center", border: "1px solid #000", padding: "6px", background: "#fff" }}>Đúng KT</th>
                  <th style={{ width: "72px", textAlign: "center", border: "1px solid #000", padding: "6px", background: "#fff" }}>Đủ TG</th>
                  <th style={{ width: "80px", textAlign: "center", border: "1px solid #000", padding: "6px", background: "#fff" }}>Găng tay</th>
                </tr>
              </thead>
              <tbody>
                {validOpps.map((opp: ExtendedOpportunity, oIdx: number) => {
                  const moments = (opp.thoi_diems || []).map((m) => String(m).trim()).filter(Boolean);
                  const hd = String(opp.hanh_dong || "");
                  const isMiss = classifyVstAction(opp.hanh_dong).isMissed;
                  return (
                    <tr key={oIdx}>
                      <td style={{ textAlign: "center", border: "1px solid #e2e8f0", padding: "6px" }}>{oIdx + 1}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: "6px" }}>
                        {moments.length > 0 ? moments.join("; ") : "— (không ghi mốc WHO trên dòng)"}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          border: "1px solid #e2e8f0",
                          padding: "6px",
                          color: isMiss ? "#e63939" : "var(--primary)",
                        }}
                      >
                        {isMiss ? "✕ " : "✓ "}
                        {hd}
                      </td>
                      <td style={{ textAlign: "center", border: "1px solid #e2e8f0", padding: "6px", fontSize: "16px" }}>
                        {isMiss ? "—" : opp.dung_ky_thuat ? <span style={{ color: "var(--primary)" }}>✓</span> : <span style={{ color: "#e63939" }}>✕</span>}
                      </td>
                      <td style={{ textAlign: "center", border: "1px solid #e2e8f0", padding: "6px", fontSize: "16px" }}>
                        {isMiss ? "—" : opp.du_thoi_gian ? <span style={{ color: "var(--primary)" }}>✓</span> : <span style={{ color: "#e63939" }}>✕</span>}
                      </td>
                      <td style={{ textAlign: "center", border: "1px solid #e2e8f0", padding: "6px" }}>
                        {getVstPrintGloveDisplay(isMiss, opp.co_deo_gang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
