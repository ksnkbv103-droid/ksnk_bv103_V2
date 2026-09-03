"use client";

import React from "react";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { formatPercent2FromRatio } from "@/lib/analytics/supervision-percent";
import { isGscNhatKyCach } from "../lib/gsc-score-display";

const border = "1px solid #000";

export function GiamSatChungPrintCriteriaSection({
  template,
  results,
  session,
}: {
  template: ChecklistTemplate;
  results: ChecklistResult[];
  session: Record<string, unknown>;
}) {
  const validResults = results.filter((r) => r.value !== "NA");
  const resultByCriterionId = new Map(results.map((r) => [r.criterionId, r] as const));
  const hideComplianceRate = isGscNhatKyCach(
    template.cach_tinh_diem ?? session.cach_tinh_diem,
    template.loai_giam_sat ?? session.loai_giam_sat,
  );
  const score = hideComplianceRate
    ? null
    : formatPercent2FromRatio(
        validResults.filter((r) => r.value === "DAT").length,
        validResults.length,
      );

  return (
    <>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
          lineHeight: 1.3,
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th style={{ width: "7%", textAlign: "center", border, padding: "4px 5px" }}>STT</th>
            <th style={{ width: "48%", border, padding: "4px 5px" }}>Nội dung tiêu chí</th>
            <th style={{ width: "9%", textAlign: "center", border, padding: "4px 5px" }}>Đạt</th>
            <th style={{ width: "10%", textAlign: "center", border, padding: "4px 5px" }}>K.Đạt</th>
            <th style={{ width: "10%", textAlign: "center", border, padding: "4px 5px" }}>KAD</th>
            <th style={{ width: "16%", border, padding: "4px 5px" }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {template.criteria.map((c, idx) => {
            const res = resultByCriterionId.get(c.id);
            const note = res?.note ? String(res.note).trim() : "";
            return (
              <tr key={c.id}>
                <td style={{ textAlign: "center", fontWeight: "bold", border, padding: "4px 5px" }}>
                  {idx + 1}
                </td>
                <td style={{ border, padding: "4px 5px", verticalAlign: "top", wordBreak: "break-word" }}>
                  <span style={{ fontWeight: "bold" }}>{c.label}</span>
                  {c.description ? (
                    <>
                      <br />
                      <span style={{ fontSize: "10px", fontStyle: "italic", color: "#333" }}>
                        {c.description}
                      </span>
                    </>
                  ) : null}
                </td>
                <td style={{ textAlign: "center", fontSize: "14px", border, padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "DAT" ? <span style={{ fontWeight: "bold" }}>✓</span> : null}
                </td>
                <td style={{ textAlign: "center", fontSize: "14px", border, padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "KHONG_DAT" ? <span style={{ fontWeight: "bold" }}>✕</span> : null}
                </td>
                <td style={{ textAlign: "center", border, padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "NA" ? "✓" : ""}
                </td>
                <td
                  style={{
                    fontSize: "11px",
                    border,
                    padding: "4px 5px",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                  }}
                >
                  {note || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ fontSize: "10px", fontStyle: "italic", margin: "4px 0 0", color: "#333" }}>
        KAD = Không áp dụng
      </p>

      <div style={{ marginTop: "12px", lineHeight: 1.35 }}>
        {score != null ? (
          <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px 0" }}>
            TỈ LỆ TUÂN THỦ (trên tiêu chí có áp dụng): {score}
          </p>
        ) : (
          <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px 0" }}>
            Nhật ký vận hành — không tính tỉ lệ tuân thủ
          </p>
        )}
        <p style={{ fontSize: "13px", margin: 0, paddingTop: "6px", borderTop: border }}>
          <strong>Ghi chú / Kiến nghị chung:</strong> {String(session.ghi_chu_chung || "—")}
        </p>
      </div>
    </>
  );
}
