"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import type { CdcMetricsResult } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import type { RuleEvaluationResult } from "@/modules/giam-sat-nkbv/lib/nkbv-rules-engine";
import { formatNkbvChecklistTypeLabel } from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";
import type { NkbvActiveChecklistType } from "@/modules/giam-sat-nkbv/components/useNkbvChecklistModalState";
import { symptomLabelMap } from "@/modules/giam-sat-nkbv/lib/nkbv-clinical-symptom-catalog";

type Props = {
  row: Record<string, unknown>;
  checklistType: NkbvActiveChecklistType;
  liveCdcMetrics: CdcMetricsResult | null;
  liveEvaluation: RuleEvaluationResult;
  symptomDates: Record<string, string>;
  activeForm: Record<string, unknown> | null;
  ngayVaoVien: string;
  lockStatus: "DRAFT" | "DA_CHOT";
};

function fmtDate(raw: string | null | undefined): string {
  const s = String(raw || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const SYMPTOM_LABELS: Record<string, string> = symptomLabelMap();

function collectPositiveCriteria(
  form: Record<string, unknown> | null,
  symptomDates: Record<string, string>,
): Array<{ label: string; date: string }> {
  if (!form) return [];
  const out: Array<{ label: string; date: string }> = [];
  for (const [key, label] of Object.entries(SYMPTOM_LABELS)) {
    if (form[key] === true) {
      out.push({ label, date: fmtDate(symptomDates[key]) });
    }
  }
  return out;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 3px 0", fontSize: "12px" }}>
      <strong>{label}:</strong> {value}
    </p>
  );
}

export default function NkbvCasePrintView({
  row,
  checklistType,
  liveCdcMetrics,
  liveEvaluation,
  symptomDates,
  activeForm,
  ngayVaoVien,
  lockStatus,
}: Props) {
  const maCa = String(row.ma_ca || row.id || "KHONG_MA");
  const typeLabel = formatNkbvChecklistTypeLabel(checklistType);
  const criteria = collectPositiveCriteria(activeForm, symptomDates);
  const windowLabel =
    liveCdcMetrics?.uses_clinical_iwp === false && checklistType === "VAE"
      ? "Event Period"
      : checklistType === "SSI"
        ? "Surveillance / cửa sổ triệu chứng"
        : "IWP (±3 ngày)";

  return (
    <PrintLayout
      title={`PHIẾU XÁC ĐỊNH CA NKBV — ${typeLabel}`}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      density="compact"
      leftSignatureTitle="NGƯỜI XÁC NHẬN LÂM SÀNG"
      rightSignatureTitle="KSNK XÁC NHẬN CHỐT CA"
      fileTitle={() => buildPrintFileTitle({ loai: "NKBV_PXDC", ma: maCa })}
    >
      <div style={{ lineHeight: 1.35, color: "#000" }}>
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: lockStatus === "DA_CHOT" ? "#065f46" : "#92400e",
          }}
        >
          Trạng thái phiếu: {lockStatus === "DA_CHOT" ? "ĐÃ CHỐT" : "NHÁP (DRAFT)"}
        </p>

        <section style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>
            1. Hành chính
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px" }}>
            <Row label="Mã ca" value={<span style={{ fontFamily: "monospace" }}>{maCa}</span>} />
            <Row label="Loại sự kiện" value={typeLabel} />
            <Row label="Mã bệnh án" value={String(row.ma_benh_an || "—")} />
            <Row label="PID" value={String(row.ma_benh_nhan || "—")} />
            <Row label="Họ tên" value={String(row.ho_ten_benh_nhan || "—")} />
            <Row label="Ngày vào viện" value={fmtDate(ngayVaoVien)} />
            <Row label="Ngày Index / lấy mẫu" value={fmtDate(String(row.ngay_phat_hien || ""))} />
            <Row label="Bệnh phẩm" value={String(row.loai_benh_pham || "—")} />
            <Row
              label="Tác nhân"
              value={<em>{String(row.tac_nhan_vi_khuan || "—")}</em>}
            />
          </div>
        </section>

        <section style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>
            2. Cửa sổ thời gian · DOE · POA/HAI
          </p>
          <Row
            label={windowLabel}
            value={
              liveCdcMetrics?.iwp_start && liveCdcMetrics?.iwp_end
                ? `${fmtDate(liveCdcMetrics.iwp_start)} → ${fmtDate(liveCdcMetrics.iwp_end)}`
                : "—"
            }
          />
          <Row label="Ngày sự kiện (DOE)" value={fmtDate(liveCdcMetrics?.doe)} />
          <Row
            label="POA / HAI"
            value={
              <>
                {liveCdcMetrics?.haiStatus || "—"}
                {liveCdcMetrics?.dayOfHospitalization != null
                  ? ` · Ngày nằm viện #${liveCdcMetrics.dayOfHospitalization}`
                  : ""}
              </>
            }
          />
          <Row
            label="LOA — Khoa quy kết"
            value={
              liveCdcMetrics?.attributedStay
                ? `${liveCdcMetrics.attributedStay.ten_khoa}${
                    liveCdcMetrics.attributionReason
                      ? ` (${liveCdcMetrics.attributionReason})`
                      : ""
                  }`
                : "—"
            }
          />
        </section>

        <section style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>
            3. Tiêu chuẩn trong cửa sổ
          </p>
          {criteria.length === 0 ? (
            <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic" }}>Chưa ghi nhận tiêu chí dương tính.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "12px" }}>
              {criteria.map((c) => (
                <li key={c.label}>
                  {c.label}
                  {c.date !== "—" ? ` — ngày ${c.date}` : " — chưa gắn ngày"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>
            4. Dụng cụ · RIT · SBAP
          </p>
          <Row
            label="Dụng cụ xâm lấn"
            value={
              liveCdcMetrics
                ? `${liveCdcMetrics.device_placed_days} ngày · ${
                    liveCdcMetrics.device_active_on_event
                      ? "Hiện diện DOE/DOE−1"
                      : "Không hiện diện ngày sự kiện"
                  }`
                : "—"
            }
          />
          <Row
            label="RIT"
            value={
              liveCdcMetrics?.doe
                ? `${fmtDate(liveCdcMetrics.doe)} → ${fmtDate(
                    (() => {
                      const d = liveCdcMetrics.doe.slice(0, 10);
                      const dt = new Date(`${d}T12:00:00`);
                      dt.setDate(dt.getDate() + 13);
                      return dt.toISOString().slice(0, 10);
                    })(),
                  )}`
                : "—"
            }
          />
          <Row
            label="SBAP (Secondary BSI)"
            value={
              liveCdcMetrics?.sbap_start && liveCdcMetrics?.sbap_end
                ? `${fmtDate(liveCdcMetrics.sbap_start)} → ${fmtDate(liveCdcMetrics.sbap_end)}`
                : "—"
            }
          />
        </section>

        <section style={{ marginBottom: 6 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>
            5. Kết luận tiêu chuẩn
          </p>
          <Row
            label="Phân loại"
            value={`${liveEvaluation.classification || "—"}${
              liveEvaluation.is_positive ? " (đạt)" : " (chưa đạt / loại)"
            }`}
          />
          <Row label="Lý do engine" value={liveEvaluation.reason || "—"} />
          <Row label="Trạng thái ca (hệ thống)" value={String(row.trang_thai_ten || row.trang_thai_ma || "—")} />
        </section>
      </div>
    </PrintLayout>
  );
}
