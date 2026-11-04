"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import type { CdcMetricsResult } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import type { RuleEvaluationResult } from "@/modules/giam-sat-nkbv/lib/nkbv-rules-engine";
import { formatNkbvChecklistTypeLabel } from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";
import type { NkbvActiveChecklistType } from "@/modules/giam-sat-nkbv/components/useNkbvChecklistModalState";
import { symptomLabelMap } from "@/modules/giam-sat-nkbv/lib/nkbv-clinical-symptom-catalog";
import { haiPoaLabel } from "../lib/nkbv-shared-timeline";

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

function SectionHeading({ title }: { title: string }) {
  return (
    <div
      style={{
        margin: "10px 0 5px 0",
        padding: "2px 6px",
        backgroundColor: "#f8fafc",
        borderLeft: "3px solid #1e293b",
        fontSize: "12px",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {title}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 2.5px 0", fontSize: "11.5px", lineHeight: 1.35 }}>
      <strong style={{ color: "#334155" }}>{label}:</strong> {value}
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
        ? "Cửa sổ giám sát vết mổ (30/90 ngày)"
        : "Cửa sổ IWP (±3 ngày quanh Index)";

  const tuoiNamSinh = row.nam_sinh
    ? `${new Date().getFullYear() - Number(row.nam_sinh)} tuổi (NS: ${row.nam_sinh})`
    : row.tuoi
      ? `${row.tuoi} tuổi`
      : "—";
  const gioiTinh = row.gioi_tinh ? String(row.gioi_tinh) : "—";
  const khoaDieuTri = String(row.ten_khoa || row.khoa_dieu_tri || "—");
  const ngayRaVien = row.ngay_ra_vien ? fmtDate(String(row.ngay_ra_vien)) : "Đang điều trị";
  const chanDoan = String(row.chan_doan || "—");

  const loaiThietBi = String(
    row.loai_dung_cu_ten ||
      row.loai_can_thiep_ten ||
      (checklistType === "BSI"
        ? "Catheter tĩnh mạch trung tâm (CVC)"
        : checklistType === "UTI"
          ? "Ống thông tiểu lưu (Foley)"
          : checklistType === "VAE" || checklistType === "VAP"
            ? "Máy thở xâm nhập"
            : checklistType === "SSI"
              ? "Phẫu thuật / Vết mổ can thiệp"
              : "Theo dõi lâm sàng / Không thiết bị"),
  );

  const cfuKetQua = String(row.cfu_ml || row.so_luong_khuan_lac || "—");
  const cdhaResult = String(row.cdha_summary || row.ket_qua_cdha || "—");

  return (
    <PrintLayout
      title="PHIẾU ĐIỀU TRA CA BỆNH NHIỄM KHUẨN BỆNH VIỆN"
      subtitle={`(Ban hành kèm theo Quy trình KSNK.QT.33 — Quyết định 3916/QĐ-BYT) · ${typeLabel}`}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      density="compact"
      leftSignatureTitle="NGƯỜI ĐIỀU TRA LÂM SÀNG"
      rightSignatureTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      fileTitle={() => buildPrintFileTitle({ loai: "NKBV_BM01", ma: maCa })}
    >
      <div style={{ lineHeight: 1.35, color: "#000" }}>
        {/* === META BAR: BIỂU MẪU & TRẠNG THÁI === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: "1px dashed #cbd5e1",
            fontSize: "11px",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "3px",
              border: lockStatus === "DA_CHOT" ? "1px solid #059669" : "1px solid #d97706",
              color: lockStatus === "DA_CHOT" ? "#065f46" : "#92400e",
              backgroundColor: lockStatus === "DA_CHOT" ? "#ecfdf5" : "#fffbeb",
            }}
          >
            Trạng thái phiếu: {lockStatus === "DA_CHOT" ? "ĐÃ CHỐT CA BỆNH" : "BẢN NHÁP (DRAFT)"}
          </span>
          <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#1e293b" }}>
            Biểu mẫu: BM.01/QT.33
          </span>
        </div>

        {/* === I. THÔNG TIN HÀNH CHÍNH & VÀO VIỆN === */}
        <SectionHeading title="I. THÔNG TIN HÀNH CHÍNH & VÀO VIỆN" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
          <Row label="Mã ca bệnh" value={<strong style={{ fontFamily: "monospace" }}>{maCa}</strong>} />
          <Row label="Loại sự kiện" value={<strong>{typeLabel}</strong>} />
          <Row label="Mã bệnh án" value={<span style={{ fontFamily: "monospace" }}>{String(row.ma_benh_an || "—")}</span>} />
          <Row label="PID (Mã BN)" value={<span style={{ fontFamily: "monospace" }}>{String(row.ma_benh_nhan || "—")}</span>} />
          <Row label="Họ và tên người bệnh" value={<strong>{String(row.ho_ten_benh_nhan || "—")}</strong>} />
          <Row label="Tuổi / Giới" value={`${tuoiNamSinh} · ${gioiTinh}`} />
          <Row label="Khoa điều trị" value={khoaDieuTri} />
          <Row label="Ngày vào viện" value={fmtDate(ngayVaoVien)} />
          <Row label="Ngày ra viện" value={ngayRaVien} />
          <Row label="Chẩn đoán" value={chanDoan} />
        </div>

        {/* === II. YẾU TỐ CAN THIỆP XÂM LẤN & THIẾT BỊ ĐIỀU TRỊ === */}
        <SectionHeading title="II. YẾU TỐ CAN THIỆP XÂM LẤN & THIẾT BỊ ĐIỀU TRỊ" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
          <Row label="Loại thiết bị / Can thiệp" value={loaiThietBi} />
          <Row
            label="Số ngày can thiệp"
            value={
              liveCdcMetrics
                ? `${liveCdcMetrics.device_placed_days} ngày đặt trước sự kiện`
                : "—"
            }
          />
          <Row
            label="Hiện diện tại DOE / DOE-1"
            value={
              liveCdcMetrics
                ? liveCdcMetrics.device_active_on_event
                  ? "Có (Đạt điều kiện liên quan thiết bị)"
                  : "Không hiện diện tại ngày sự kiện"
                : "—"
            }
          />
          <Row
            label="Ngày đặt / can thiệp"
            value={fmtDate(String(row.ngay_dat_dung_cu || row.ngay_phau_thuat || ""))}
          />
          <Row
            label="Ngày rút / kết thúc"
            value={fmtDate(String(row.ngay_rut_dung_cu || ""))}
          />
        </div>

        {/* === III. THÔNG TIN VI SINH & CẬN LÂM SÀNG (YẾU TỐ INDEX) === */}
        <SectionHeading title="III. THÔNG TIN VI SINH & CẬN LÂM SÀNG (YẾU TỐ INDEX)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
          <Row label="Ngày lấy mẫu / Index" value={fmtDate(String(row.ngay_phat_hien || ""))} />
          <Row label="Bệnh phẩm" value={<strong>{String(row.loai_benh_pham || "—")}</strong>} />
          <Row
            label="Tác nhân vi sinh"
            value={<em>{String(row.tac_nhan_vi_khuan || "—")}</em>}
          />
          <Row label="Định lượng CFU/ml" value={cfuKetQua} />
          {cdhaResult !== "—" ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <Row label="Chẩn đoán hình ảnh" value={cdhaResult} />
            </div>
          ) : null}
        </div>

        {/* === IV. CỬA SỔ CHẨN ĐOÁN & TIÊU CHUẨN XÁC ĐỊNH CA (CDC/NHSN 2026) === */}
        <SectionHeading title="IV. CỬA SỔ CHẨN ĐOÁN & TIÊU CHUẨN XÁC ĐỊNH CA (CDC/NHSN)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
          <Row
            label={windowLabel}
            value={
              liveCdcMetrics?.iwp_start && liveCdcMetrics?.iwp_end
                ? `${fmtDate(liveCdcMetrics.iwp_start)} → ${fmtDate(liveCdcMetrics.iwp_end)}`
                : "—"
            }
          />
          <Row label="Ngày sự kiện (DOE)" value={<strong>{fmtDate(liveCdcMetrics?.doe)}</strong>} />
          <Row
            label="Phân loại POA / HAI"
            value={
              <>
                <strong>{haiPoaLabel(liveCdcMetrics?.haiStatus)}</strong>
                {liveCdcMetrics?.dayOfHospitalization != null
                  ? ` · Ngày nằm viện thứ #${liveCdcMetrics.dayOfHospitalization}`
                  : ""}
              </>
            }
          />
          <Row
            label="Khoa quy kết (LOA)"
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
          <Row
            label="Khung RIT (14 ngày)"
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
            label="Cửa sổ SBAP (Secondary BSI)"
            value={
              liveCdcMetrics?.sbap_start && liveCdcMetrics?.sbap_end
                ? `${fmtDate(liveCdcMetrics.sbap_start)} → ${fmtDate(liveCdcMetrics.sbap_end)}`
                : "Không áp dụng"
            }
          />
        </div>

        <div style={{ marginTop: 4 }}>
          <p style={{ margin: "2px 0 3px 0", fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
            Tiêu chuẩn dương tính trong cửa sổ:
          </p>
          {criteria.length === 0 ? (
            <p style={{ margin: 0, fontSize: "11.5px", fontStyle: "italic", color: "#64748b" }}>
              Chưa ghi nhận tiêu chí dương tính nào trong cửa sổ khảo sát.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "11.5px", lineHeight: 1.35 }}>
              {criteria.map((c) => (
                <li key={c.label}>
                  {c.label}
                  {c.date !== "—" ? ` (ngày ghi nhận: ${c.date})` : " (chưa gắn ngày)"}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* === V. KẾT LUẬN & XÁC NHẬN === */}
        <SectionHeading title="V. KẾT LUẬN & XÁC NHẬN" />
        <Row
          label="Kết luận phân loại"
          value={
            <strong style={{ color: liveEvaluation.is_positive ? "#0f766e" : "#b91c1c" }}>
              {liveEvaluation.classification || "—"}{" "}
              {liveEvaluation.is_positive ? "(ĐẠT TIÊU CHUẨN CA BỆNH)" : "(CHƯA ĐẠT / LOẠI TRỪ)"}
            </strong>
          }
        />
        <Row label="Căn cứ / Diễn giải engine" value={liveEvaluation.reason || "—"} />
        <Row
          label="Biện pháp kiểm soát khuyến cáo"
          value="Thực hiện nghiêm ngặt phòng ngừa chuẩn kết hợp phòng ngừa theo đường lây truyền (tiếp xúc / giọt bắn). Giám sát tuân thủ vệ sinh tay và khử khuẩn bề mặt."
        />
        {row.ghi_chu ? (
          <Row label="Ghi chú lâm sàng" value={String(row.ghi_chu)} />
        ) : null}
      </div>
    </PrintLayout>
  );
}
