// src/modules/cssd-su-co/components/IncidentPrintView.tsx
"use client";

import React, { useMemo } from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { useEntityQrImage } from "@/hooks/useEntityQr";
import { buildPrintFileTitle, pickSuCoPrintMa } from "@/lib/print/print-file-title";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";

export interface IncidentDetailRow {
  id: string;
  su_co_id: string;
  ma_chi_tiet_su_co: string;
  gia_tri_chi_tiet: string;
}

export interface IncidentPrintViewProps {
  incident: {
    id: string;
    ma_qr_quy_trinh?: string | null;
    ma_tram_phat_hien: string;
    ma_tram_gay_loi?: string | null;
    mo_ta?: string | null;
    is_red_alert?: boolean | null;
    created_at?: string | null;
    incident_group?: string | null;
    incident_type_label?: string | null;
    ten_bo?: string | null;
    ma_bo?: string | null;
  };
  details: IncidentDetailRow[];
  qrCode?: string;
  qrDataUrl?: string;
}

/**
 * Helper để tự động chuyển đổi URL Google Drive sang Direct Link (lh3.googleusercontent.com/d/)
 * Giúp hiển thị trực tiếp ảnh thô qua thẻ img trên trình duyệt và bản in.
 */
export function getGoogleDriveDirectLink(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;

  // Hỗ trợ dạng: /file/d/FILE_ID/view?usp=sharing hoặc tương tự
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Hỗ trợ dạng: id=FILE_ID (như open?id=... hoặc uc?id=...)
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }

  return trimmed;
}

const STATION_LABEL_MAP: Record<string, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "Kiểm tra chất lượng (QC)",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

const GROUP_LABEL_MAP: Record<string, string> = {
  PROCESS: "Quy trình xử lý",
  INSTRUMENT: "Hỏng hóc dụng cụ",
  CHEMICAL: "Hóa chất / Vật tư",
  EQUIPMENT: "Thiết bị / Máy móc",
  OTHER: "Sự cố khác",
};

export default function IncidentPrintView({
  incident,
  details,
  qrCode: qrCodeProp,
  qrDataUrl: qrDataUrlProp,
}: IncidentPrintViewProps) {
  const autoQrCode = incident.id ? buildEntityQrCode("CSSD_INCIDENT", incident.id) : "";
  const qrCode = qrCodeProp || autoQrCode;
  const autoQrDataUrl = useEntityQrImage(qrDataUrlProp ? null : qrCode);
  const qrDataUrl = qrDataUrlProp || autoQrDataUrl;

  const detailsMap = useMemo(() => {
    return details.reduce((acc, curr) => {
      acc[curr.ma_chi_tiet_su_co] = curr.gia_tri_chi_tiet;
      return acc;
    }, {} as Record<string, string>);
  }, [details]);

  const errorQr = detailsMap["ERROR_QR"];
  const machineId = detailsMap["MACHINE_ID"];
  const faultOperator = detailsMap["FAULT_OPERATOR"];
  const nguoiPhatHien = detailsMap["NGUOI_PHAT_HIEN"];
  const thoiGianPhatHienAttr = detailsMap["THOI_GIAN_PHAT_HIEN"];
  const rollbackTarget = detailsMap["ROLLBACK_TARGET_STATION"];
  const reporterEmail = detailsMap["REPORTER_EMAIL"];
  const imageEvidence = detailsMap["ANH_MINH_CHUNG"];

  const directImageLink = useMemo(() => {
    return imageEvidence ? getGoogleDriveDirectLink(imageEvidence) : "";
  }, [imageEvidence]);

  const formattedDate = useMemo(() => {
    const raw = thoiGianPhatHienAttr || incident.created_at;
    return formatDateTimeVi(raw, String(raw || "—"));
  }, [incident.created_at, thoiGianPhatHienAttr]);

  // Hướng xử lý đề xuất tương ứng
  const solutionText = useMemo(() => {
    if (incident.incident_group === "INSTRUMENT") {
      return "Đóng băng bộ dụng cụ tại trạm hiện tại. Cấm sử dụng hoặc chuyển tiếp, chờ bổ sung/sửa chữa thiết bị.";
    }
    if (incident.incident_group === "PROCESS") {
      const target = rollbackTarget ? STATION_LABEL_MAP[rollbackTarget] || rollbackTarget : "Làm sạch";
      return `Rollback domino: Tự động chuyển bộ dụng cụ về trạm [${target}] để xử lý lại từ đầu.`;
    }
    if (incident.incident_group === "EQUIPMENT") {
      return "Khóa máy/Ngừng hoạt động. Báo phòng vật tư kỹ thuật sửa chữa & hiệu chuẩn lại thông số.";
    }
    if (incident.incident_group === "CHEMICAL") {
      return "Niêm phong và loại bỏ lô hóa chất/vật tư kém chất lượng. Thay thế lô mới đạt chuẩn.";
    }
    return "Tự động ghi nhận thông tin sự cố chung phục vụ đánh giá KPI & quy trình.";
  }, [incident.incident_group, rollbackTarget]);

  return (
    <PrintLayout
      title="BIÊN BẢN GHI NHẬN SỰ CỐ CSSD"
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      leftSignatureTitle="NGƯỜI PHÁT HIỆN SỰ CỐ"
      rightSignatureTitle="TRƯỞNG BỘ PHẬN KSNK"
      fileTitle={() =>
        buildPrintFileTitle({
          loai: "SUCO",
          ma: pickSuCoPrintMa({ id: incident.id, createdAt: incident.created_at }),
        })
      }
      afterFooter={
        qrDataUrl && qrCode ? (
          <EntityQrBlock
            dataUrl={qrDataUrl}
            code={qrCode}
            caption="Quét mở lại biên bản"
            variant="compact"
          />
        ) : null
      }
    >
      <div style={{ lineHeight: 1.45, fontSize: "13px", color: "#000" }}>
        {incident.is_red_alert ? (
          <div
            style={{
              border: "2px solid #000",
              padding: "8px 12px",
              marginBottom: "14px",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Cảnh báo đỏ: mã bộ dụng cụ này đã xảy ra sự cố từ 2 lần trở lên. Cần rà soát đặc biệt quy trình.
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: "12px" }}>
          <div>
            <strong>Mã biên bản:</strong>{" "}
            <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {pickSuCoPrintMa({ id: incident.id, createdAt: incident.created_at })}
            </span>
          </div>
          <div>
            <strong>Thời điểm phát hiện:</strong> {formattedDate}
          </div>
          <div>
            <strong>Trạm phát hiện:</strong>{" "}
            {STATION_LABEL_MAP[incident.ma_tram_phat_hien] || incident.ma_tram_phat_hien}
          </div>
          <div>
            <strong>Người lập biên bản:</strong> {reporterEmail || "Nhân viên KSNK"}
          </div>
          {nguoiPhatHien ? (
            <div>
              <strong>Người phát hiện:</strong> {nguoiPhatHien}
            </div>
          ) : null}
        </div>

        <div style={{ borderBottom: "1px solid #000", marginBottom: "12px" }} />

        <div style={{ marginBottom: "14px" }}>
          <p style={{ margin: "0 0 6px" }}>
            <strong>Nhóm nghiệp vụ:</strong>{" "}
            <span style={{ textTransform: "uppercase", fontWeight: 800 }}>
              {GROUP_LABEL_MAP[incident.incident_group || ""] || incident.incident_group}
            </span>
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>Loại sự cố:</strong> {incident.incident_type_label || "Không xác định"}
          </p>
          <p style={{ margin: 0, textAlign: "justify" }}>
            <strong>Mô tả chi tiết sự việc:</strong>
          </p>
          <p style={{ margin: "4px 0 0", paddingLeft: 12, fontStyle: "italic", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {incident.mo_ta || "Không có mô tả chi tiết."}
          </p>
        </div>

        <div
          style={{
            border: "1px solid #000",
            padding: "10px 12px",
            marginBottom: "14px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Đối tượng liên quan trực tiếp
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: "12px" }}>
            {incident.ma_qr_quy_trinh ? (
              <>
                <div>
                  <strong>Mã QR Bộ dụng cụ:</strong>{" "}
                  <span style={{ fontFamily: "monospace" }}>{incident.ma_qr_quy_trinh}</span>
                </div>
                <div>
                  <strong>Tên bộ dụng cụ:</strong> {incident.ten_bo || "—"}
                </div>
              </>
            ) : null}

            {machineId && incident.incident_group === "EQUIPMENT" ? (
              <div>
                <strong>Thiết bị gặp sự cố (ID/Mã):</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>{machineId}</span>
              </div>
            ) : null}

            {machineId && incident.incident_group === "CHEMICAL" ? (
              <div>
                <strong>Hóa chất / Vật tư liên quan:</strong> <span>{machineId}</span>
              </div>
            ) : null}

            {errorQr && incident.incident_group === "CHEMICAL" ? (
              <div>
                <strong>Mã lô hóa chất/vật tư:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>{errorQr}</span>
              </div>
            ) : null}

            {errorQr && incident.incident_group === "INSTRUMENT" ? (
              <div>
                <strong>Mã dụng cụ lẻ lỗi:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>{errorQr}</span>
              </div>
            ) : null}

            {incident.ma_tram_gay_loi ? (
              <div>
                <strong>Trạm gây lỗi:</strong>{" "}
                {STATION_LABEL_MAP[incident.ma_tram_gay_loi] || incident.ma_tram_gay_loi}
              </div>
            ) : null}

            {faultOperator ? (
              <div>
                <strong>Người liên quan:</strong> {faultOperator}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <strong>Phương án khắc phục / Trạng thái xử lý:</strong>
          <p style={{ margin: "4px 0 0", paddingLeft: 12, fontWeight: 700, color: "#000" }}>
            {solutionText}
          </p>
        </div>

        {directImageLink ? (
          <div style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
            <strong style={{ display: "block", marginBottom: "6px" }}>Ảnh minh chứng thực địa:</strong>
            <div style={{ display: "flex", justifyContent: "center", border: "1px solid #000", padding: "6px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={directImageLink}
                alt="Minh chứng sự cố"
                style={{
                  maxHeight: "180px",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </PrintLayout>
  );
}
