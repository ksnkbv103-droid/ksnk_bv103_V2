"use client";

import React from "react";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { formatPercent2FromRatio } from "@/lib/analytics/supervision-percent";

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
  const score = formatPercent2FromRatio(
    validResults.filter((r) => r.value === "DAT").length,
    validResults.length,
  );

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", lineHeight: 1.3 }}>
        <thead>
          <tr>
            <th style={{ width: "36px", textAlign: "center", border: "1px solid #cbd5e1", padding: "4px 5px" }}>STT</th>
            <th style={{ border: "1px solid #cbd5e1", padding: "4px 5px" }}>Nội dung tiêu chí</th>
            <th style={{ width: "52px", textAlign: "center", border: "1px solid #cbd5e1", padding: "4px 5px" }}>Đạt</th>
            <th style={{ width: "56px", textAlign: "center", border: "1px solid #cbd5e1", padding: "4px 5px" }}>K.Đạt</th>
            <th style={{ width: "80px", textAlign: "center", border: "1px solid #cbd5e1", padding: "4px 5px" }}>Không áp dụng</th>
            <th style={{ minWidth: "100px", border: "1px solid #cbd5e1", padding: "4px 5px" }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {template.criteria.map((c, idx) => {
            const res = resultByCriterionId.get(c.id);
            const note = res?.note ? String(res.note).trim() : "";
            return (
              <tr key={c.id}>
                <td style={{ textAlign: "center", fontWeight: "bold", border: "1px solid #e2e8f0", padding: "4px 5px" }}>{idx + 1}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "4px 5px", verticalAlign: "top" }}>
                  <span style={{ fontWeight: "bold" }}>{c.label}</span>
                  {c.description ? (
                    <>
                      <br />
                      <span style={{ fontSize: "10px", fontStyle: "italic", color: "#64748b" }}>{c.description}</span>
                    </>
                  ) : null}
                </td>
                <td style={{ textAlign: "center", fontSize: "16px", border: "1px solid #e2e8f0", padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "DAT" ? (
                    <span style={{ color: "var(--primary)", fontWeight: "bold" }}>✓</span>
                  ) : null}
                </td>
                <td style={{ textAlign: "center", fontSize: "16px", border: "1px solid #e2e8f0", padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "KHONG_DAT" ? (
                    <span style={{ color: "#e63939", fontWeight: "bold" }}>✕</span>
                  ) : null}
                </td>
                <td style={{ textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "4px 5px", verticalAlign: "middle" }}>
                  {res?.value === "NA" ? "✓" : ""}
                </td>
                <td style={{ fontSize: "11px", border: "1px solid #e2e8f0", padding: "4px 5px", verticalAlign: "top" }}>{note || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: "12px", lineHeight: 1.35 }}>
        <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px 0" }}>
          TỈ LỆ TUÂN THỦ (trên tiêu chí có áp dụng): {score}
        </p>
        <p style={{ fontSize: "13px", margin: 0, paddingTop: "6px", borderTop: "1px solid #e2e8f0" }}>
          <strong>Ghi chú / Kiến nghị chung:</strong> {String(session.ghi_chu_chung || "—")}
        </p>
      </div>
    </>
  );
}
