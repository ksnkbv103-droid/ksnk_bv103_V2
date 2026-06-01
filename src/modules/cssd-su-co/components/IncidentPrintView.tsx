// src/modules/cssd-su-co/components/IncidentPrintView.tsx
"use client";

import React, { useMemo } from "react";
import PrintLayout from "@/components/shared/PrintLayout";

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
    ten_loai_su_co?: string | null;
    ten_bo?: string | null;
    ma_bo?: string | null;
  };
  details: IncidentDetailRow[];
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

export default function IncidentPrintView({ incident, details }: IncidentPrintViewProps) {
  const detailsMap = useMemo(() => {
    return details.reduce((acc, curr) => {
      acc[curr.ma_chi_tiet_su_co] = curr.gia_tri_chi_tiet;
      return acc;
    }, {} as Record<string, string>);
  }, [details]);

  const errorQr = detailsMap["ERROR_QR"];
  const machineId = detailsMap["MACHINE_ID"];
  const faultOperator = detailsMap["FAULT_OPERATOR"];
  const rollbackTarget = detailsMap["ROLLBACK_TARGET_STATION"];
  const incidentKind = detailsMap["INCIDENT_KIND"];
  const reporterEmail = detailsMap["REPORTER_EMAIL"];
  const imageEvidence = detailsMap["ANH_MINH_CHUNG"];

  const directImageLink = useMemo(() => {
    return imageEvidence ? getGoogleDriveDirectLink(imageEvidence) : "";
  }, [imageEvidence]);

  const formattedDate = useMemo(() => {
    if (!incident.created_at) return "—";
    try {
      const d = new Date(incident.created_at);
      return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ngày ${d.toLocaleDateString("vi-VN")}`;
    } catch {
      return incident.created_at;
    }
  }, [incident.created_at]);

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
    >
      <div style={{ lineHeight: 1.5, fontSize: "14px", color: "#000" }}>
        
        {/* CẢNH BÁO ĐỎ NẾU TÁI DIỄN */}
        {incident.is_red_alert && (
          <div style={{
            border: "2px solid #dc2626",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️ CẢNH BÁO ĐỎ: Mã bộ dụng cụ này đã xảy ra sự cố từ 2 lần trở lên. Cần rà soát đặc biệt quy trình!</span>
          </div>
        )}

        {/* THÔNG TIN HÀNH CHÍNH */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: "16px" }}>
          <div>
            <strong>Mã biên bản:</strong> <span style={{ fontFamily: "monospace", fontSize: "13px" }}>{incident.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div>
            <strong>Thời điểm phát hiện:</strong> {formattedDate}
          </div>
          <div>
            <strong>Trạm phát hiện:</strong> {STATION_LABEL_MAP[incident.ma_tram_phat_hien] || incident.ma_tram_phat_hien}
          </div>
          <div>
            <strong>Người báo cáo:</strong> {reporterEmail || "Nhân viên KSNK"}
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #000", marginBottom: "16px" }} />

        {/* CHI TIẾT SỰ CỐ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div style={{ marginBottom: "8px" }}>
            <strong>Phân loại sự cố:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{GROUP_LABEL_MAP[incident.incident_group || ""] || incident.incident_group}</span>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong>Loại sự cố chi tiết:</strong> {incident.incident_type_label || incident.ten_loai_su_co || "Không xác định"}
          </div>
          <div style={{ marginBottom: "12px", textAlign: "justify" }}>
            <strong>Mô tả chi tiết sự việc:</strong>
            <p style={{ margin: "4px 0 0 0", paddingLeft: "12px", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
              {incident.mo_ta || "Không có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {/* ĐỐI TƯỢNG LIÊN QUAN TRỰC TIẾP */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px"
        }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Đối tượng liên quan trực tiếp
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: "13px" }}>
            {incident.ma_qr_quy_trinh && (
              <>
                <div>
                  <strong>Mã QR Bộ dụng cụ:</strong> <span style={{ fontFamily: "monospace" }}>{incident.ma_qr_quy_trinh}</span>
                </div>
                <div>
                  <strong>Tên bộ dụng cụ:</strong> {incident.ten_bo || "—"}
                </div>
              </>
            )}

            {machineId && incident.incident_group === "EQUIPMENT" && (
              <div>
                <strong>Thiết bị gặp sự cố (ID/Mã):</strong> <span style={{ fontFamily: "monospace" }}>{machineId}</span>
              </div>
            )}

            {machineId && incident.incident_group === "CHEMICAL" && (
              <div>
                <strong>Hóa chất / Vật tư liên quan:</strong> <span>{machineId}</span>
              </div>
            )}

            {errorQr && incident.incident_group === "CHEMICAL" && (
              <div>
                <strong>Mã lô hóa chất/vật tư:</strong> <span style={{ fontFamily: "monospace" }}>{errorQr}</span>
              </div>
            )}

            {errorQr && incident.incident_group === "INSTRUMENT" && (
              <div>
                <strong>Mã dụng cụ lẻ lỗi:</strong> <span style={{ fontFamily: "monospace" }}>{errorQr}</span>
              </div>
            )}

            {incident.ma_tram_gay_loi && (
              <div>
                <strong>Trạm gây lỗi:</strong> {STATION_LABEL_MAP[incident.ma_tram_gay_loi] || incident.ma_tram_gay_loi}
              </div>
            )}

            {faultOperator && (
              <div>
                <strong>Nhân sự liên quan / Người liên quan:</strong> {faultOperator}
              </div>
            )}
          </div>
        </div>

        {/* PHƯƠNG ÁN KHẮC PHỤC / DOMINO ACTION */}
        <div style={{ marginBottom: "24px" }}>
          <strong>Phương án khắc phục / Trạng thái xử lý:</strong>
          <p style={{ margin: "4px 0 0 0", paddingLeft: "12px", fontWeight: "bold", color: "#1e3a8a" }}>
            {solutionText}
          </p>
        </div>

        {/* ẢNH MINH CHỨNG THỰC ĐỊA */}
        {directImageLink && (
          <div style={{ marginBottom: "32px", pageBreakInside: "avoid" }}>
            <strong style={{ display: "block", marginBottom: "8px" }}>Ảnh minh chứng thực địa:</strong>
            <div style={{ display: "flex", justifyContent: "center", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px", backgroundColor: "#fff" }}>
              <img
                src={directImageLink}
                alt="Minh chứng sự cố"
                style={{
                  maxHeight: "260px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        )}

      </div>
    </PrintLayout>
  );
}
