// src/modules/cssd-su-co/components/IncidentPrintView.tsx
"use client";

import React, { useMemo } from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { useEntityQrImage } from "@/hooks/useEntityQr";
import { buildPrintFileTitle, pickSuCoPrintMa } from "@/lib/print/print-file-title";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { parseSetReconcileSnapshot } from "../domain/cssd-set-reconcile-attrs";
import { resolveRecallPrintRows } from "../domain/cssd-batch-recall";
import { buildBm01RecallTotals, readRecallMemberJson } from "../domain/cssd-batch-recall-hold";
import { CSSD_RED_ALERT_DISPLAY_MIN } from "../domain/cssd-incident-attributes";
import {
  SET_RECONCILE_KIND_LABEL,
  formatLoaiDungCuLabel,
  setReconcileStatusLabel,
  type SetReconcileLineKind,
} from "@/lib/domain/cssd-set-reconcile";
import { stationLabel } from "@/modules/cssd-erp/workflow/domain/cssd-stations";

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
  try {
    const host = new URL(trimmed).hostname;
    if (host !== "drive.google.com") return trimmed;
  } catch {
    return trimmed;
  }

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
const GROUP_LABEL_MAP: Record<string, string> = {
  PROCESS: "Sự cố quy trình",
  INSTRUMENT: "Hỏng/Mất",
  CHEMICAL: "Sự cố hóa chất",
  EQUIPMENT: "Sự cố máy",
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
  const maLo = detailsMap["MA_LO"] || (incident.incident_group === "PROCESS" ? errorQr : "");
  const machineId = detailsMap["MACHINE_ID"];
  const faultOperator = detailsMap["FAULT_OPERATOR"];
  const nguoiPhatHien = detailsMap["NGUOI_PHAT_HIEN"];
  const thoiGianPhatHienAttr = detailsMap["THOI_GIAN_PHAT_HIEN"];
  const rollbackTarget = detailsMap["ROLLBACK_TARGET_STATION"];
  const reporterEmail = detailsMap["REPORTER_EMAIL"];
  const imageEvidence = detailsMap["ANH_MINH_CHUNG"];
  const batchRecallCount = detailsMap["BATCH_RECALL_COUNT"];
  const batchRecalled = detailsMap["BATCH_RECALL"] === "1";
  const machineHoldQc = detailsMap["MACHINE_HOLD_QC"] === "1";
  const setSnap = parseSetReconcileSnapshot(detailsMap["SET_RECONCILE_SNAPSHOT"]);
  const setStatus = detailsMap["SET_RECONCILE_STATUS"] || "";

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
      return "Ghi nhận Hỏng/Mất trên bộ — rà soát cấu phần (đề nghị đổi danh mục). Không tự khóa bộ trừ khi đã chuyển cấp xử lý.";
    }
    if (incident.incident_group === "PROCESS") {
      if (batchRecalled) {
        const n = batchRecallCount ? ` (${batchRecallCount} bộ)` : "";
        const hold = machineHoldQc ? " Máy mẻ tạm giữ QC." : "";
        const holdPending = detailsMap["RECALL_HOLD_PENDING"];
        const listedBit = detailsMap["RECALL_LISTED_USED"]
          ? " Đã dùng lâm sàng — bàn giao theo dõi NB."
          : "";
        const movedBit = detailsMap["RECALL_MOVED"]
          ? " Bộ trong CSSD về Tiếp nhận."
          : "";
        const pendingBit = holdPending ? " Bộ đã cấp — chờ thu về từ khoa." : "";
        return `Thu hồi mẻ${n}.${movedBit}${pendingBit}${listedBit}${hold}`;
      }
      const target = rollbackTarget ? stationLabel(rollbackTarget) : "Làm sạch";
      return `Thu hồi theo chuỗi: tự động chuyển bộ dụng cụ về trạm [${target}] để xử lý lại từ đầu.`;
    }
    if (incident.incident_group === "EQUIPMENT") {
      return "Khóa máy/Ngừng hoạt động. Báo phòng vật tư kỹ thuật sửa chữa & hiệu chuẩn lại thông số.";
    }
    if (incident.incident_group === "CHEMICAL") {
      return "Niêm phong và loại bỏ lô hóa chất/vật tư kém chất lượng. Thay thế lô mới đạt chuẩn.";
    }
    return "Tự động ghi nhận thông tin sự cố chung phục vụ đánh giá KPI & quy trình.";
  }, [incident.incident_group, rollbackTarget, batchRecalled, batchRecallCount, machineHoldQc, detailsMap]);

  return (
    <PrintLayout
      title="BÁO CÁO SỰ CỐ TIỆT KHUẨN VÀ HỎNG HÓC THIẾT BỊ"
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="ĐƠN VỊ CSSD — KHOA KIỂM SOÁT NHIỄM KHUẨN"
      leftSignatureTitle="NGƯỜI BÁO CÁO"
      rightSignatureTitle="XÁC NHẬN CỦA TRƯỞNG ĐƠN VỊ CSSD"
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
            Cảnh báo đỏ: mã bộ dụng cụ này đã xảy ra sự cố quy trình từ {CSSD_RED_ALERT_DISPLAY_MIN} lần trở
            lên. Cần rà soát đặc biệt quy trình.
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
            {stationLabel(incident.ma_tram_phat_hien)}
          </div>
          <div>
            <strong>Người báo cáo:</strong>{" "}
            {detailsMap["NGUOI_PHAT_HIEN"] || (reporterEmail && !reporterEmail.includes("@") ? reporterEmail : "—")}
          </div>
          <div>
            <strong>Trạng thái phiếu:</strong>{" "}
            {detailsMap["INCIDENT_STATUS"] === "DA_XAC_NHAN"
              ? `Đã xác nhận${detailsMap["INCIDENT_CONFIRMED_BY_NAME"] ? ` — ${detailsMap["INCIDENT_CONFIRMED_BY_NAME"]}` : ""}${detailsMap["INCIDENT_CONFIRMED_AT"] ? ` (${formatDateTimeVi(detailsMap["INCIDENT_CONFIRMED_AT"])})` : ""}`
              : "Chưa xác nhận"}
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
            <strong>Tình huống:</strong> {incident.incident_type_label || "Không xác định"}
          </p>
          <p style={{ margin: 0, textAlign: "justify" }}>
            <strong>Mô tả chi tiết sự việc:</strong>
          </p>
          <p style={{ margin: "4px 0 0", paddingLeft: 12, fontStyle: "italic", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {incident.mo_ta || "Không có mô tả chi tiết."}
          </p>
        </div>

        {setSnap?.lines?.length ? (
          <div style={{ marginBottom: "14px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
              Bảng thành phần bộ {setStatus ? `(${setReconcileStatusLabel(setStatus)})` : ""}
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #000", textAlign: "left", padding: "4px" }}>Dụng cụ</th>
                  <th style={{ borderBottom: "1px solid #000", textAlign: "left", padding: "4px" }}>Mã khắc</th>
                  <th style={{ borderBottom: "1px solid #000", padding: "4px" }}>Chuẩn</th>
                  <th style={{ borderBottom: "1px solid #000", padding: "4px" }}>Hệ thống</th>
                  <th style={{ borderBottom: "1px solid #000", padding: "4px" }}>Đếm</th>
                  <th style={{ borderBottom: "1px solid #000", textAlign: "left", padding: "4px" }}>Lệch</th>
                  <th style={{ borderBottom: "1px solid #000", textAlign: "left", padding: "4px" }}>Bộ đích / ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {setSnap.lines.map((line, i) => (
                  <tr key={`${line.chiTietId || "n"}-${i}`}>
                    <td style={{ padding: "3px 4px" }}>
                      {line.kind === "DOI_LOAI"
                        ? `${formatLoaiDungCuLabel(line.maLoai, line.tenDungCuLe)} → ${formatLoaiDungCuLabel(line.maLoaiDeXuat, line.tenDungCuLeDeXuat || line.tenDungCuLe)}`
                        : formatLoaiDungCuLabel(line.maLoai, line.tenDungCuLe)}
                    </td>
                    <td style={{ padding: "3px 4px", fontFamily: "monospace" }}>{line.maKhac || "—"}</td>
                    <td style={{ padding: "3px 4px", textAlign: "center" }}>
                      {line.kind === "DOI_CHUAN" ? `${line.soLuongChuan}→${line.soLuongChuanDeXuat}` : line.soLuongChuan}
                    </td>
                    <td style={{ padding: "3px 4px", textAlign: "center" }}>{line.soLuongThucTe}</td>
                    <td style={{ padding: "3px 4px", textAlign: "center" }}>{line.soLuongDem}</td>
                    <td style={{ padding: "3px 4px" }}>
                      {SET_RECONCILE_KIND_LABEL[line.kind as SetReconcileLineKind] || line.kind}
                    </td>
                    <td style={{ padding: "3px 4px" }}>
                      {[line.kind === "DIEU_CHUYEN" ? line.maQrDen : "", line.note].filter(Boolean).join(" — ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

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

            {maLo && incident.incident_group === "PROCESS" ? (
              <div>
                <strong>Mã lô mẻ tiệt khuẩn:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>{maLo}</span>
              </div>
            ) : null}

            {batchRecalled && incident.incident_group === "PROCESS" ? (
              <div>
                <strong>Thu hồi cả mẻ:</strong> {batchRecallCount || "có"} bộ cùng mã lô
              </div>
            ) : null}

            {machineHoldQc && incident.incident_group === "PROCESS" ? (
              <div>
                <strong>Máy:</strong> tạm giữ QC
                {machineId ? (
                  <>
                    {" "}
                    — mã thiết bị (nội bộ)
                  </>
                ) : null}
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
                {stationLabel(incident.ma_tram_gay_loi)}
              </div>
            ) : null}

            {faultOperator ? (
              <div>
                <strong>Người liên quan:</strong> {faultOperator}
              </div>
            ) : null}
          </div>
        </div>

        {batchRecalled ? (
          <div style={{ marginBottom: "14px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
              BM.01 — Danh sách bộ trong phạm vi thu hồi
            </p>
            {detailsMap["RECALL_SCOPE"] || detailsMap["RECALL_BATCH_MA"] ? (
              <p style={{ margin: "0 0 6px", fontSize: 11 }}>
                Phạm vi: {detailsMap["RECALL_SCOPE"] === "MULTI_BATCH" ? "Nhiều mẻ kể từ BI âm gần nhất" : "Cả mẻ"}
                {detailsMap["RECALL_BATCH_MA"] ? ` — Mẻ/lô: ${detailsMap["RECALL_BATCH_MA"]}` : ""}
              </p>
            ) : null}
            {(() => {
              const movedRows = resolveRecallPrintRows(detailsMap["RECALL_MOVED"]);
              const holdRows = resolveRecallPrintRows(detailsMap["RECALL_HOLD_PENDING"]);
              const listedJson = readRecallMemberJson(detailsMap["RECALL_LISTED_USED"]);
              const listedRows = resolveRecallPrintRows(detailsMap["RECALL_LISTED_USED"]);
              const totals = buildBm01RecallTotals({
                issuedCount: Number(detailsMap["RECALL_ISSUED_COUNT"] || holdRows.length || 0),
                returnedCount: Number(detailsMap["RECALL_RETURNED_COUNT"] || 0),
                usedCount: Number(detailsMap["RECALL_USED_COUNT"] || listedRows.length || 0),
                pendingCount: holdRows.filter((r) => !String(r.ghiChu || "").includes("Đã thu")).length,
              });
              const renderTable = (
                title: string,
                rows: ReturnType<typeof resolveRecallPrintRows>,
                emptyHint: string,
                cols: "hold" | "used" | "moved",
              ) => (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700 }}>{title}</p>
                  {rows.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, fontStyle: "italic" }}>{emptyHint}</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid #000", padding: 4 }}>STT</th>
                          <th style={{ border: "1px solid #000", padding: 4 }}>Mã bộ</th>
                          {cols === "hold" || cols === "used" ? (
                            <th style={{ border: "1px solid #000", padding: 4 }}>Khoa đang giữ</th>
                          ) : null}
                          {cols === "used" ? (
                            <>
                              <th style={{ border: "1px solid #000", padding: 4 }}>Thời điểm dùng</th>
                              <th style={{ border: "1px solid #000", padding: 4 }}>Ca / thủ thuật</th>
                            </>
                          ) : (
                            <th style={{ border: "1px solid #000", padding: 4 }}>Tình trạng / ghi chú</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={`${title}-${row.maBo}-${i}`}>
                            <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{i + 1}</td>
                            <td style={{ border: "1px solid #000", padding: 4, fontFamily: "monospace" }}>{row.maBo}</td>
                            {cols === "hold" || cols === "used" ? (
                              <td style={{ border: "1px solid #000", padding: 4 }}>
                                {(row as { khoaTen?: string }).khoaTen || row.ghiChu?.split("·")[0] || "—"}
                              </td>
                            ) : null}
                            {cols === "used" ? (
                              <>
                                <td style={{ border: "1px solid #000", padding: 4 }}>
                                  {(listedJson?.[i] as { usedClinicallyAt?: string } | undefined)?.usedClinicallyAt ||
                                    "—"}
                                </td>
                                <td style={{ border: "1px solid #000", padding: 4 }}>{row.maCaMoId || "—"}</td>
                              </>
                            ) : (
                              <td style={{ border: "1px solid #000", padding: 4 }}>{row.ghiChu || "—"}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
              return (
                <>
                  {renderTable(
                    "A. Trong CSSD — về Tiếp nhận ngay",
                    movedRows,
                    "Không có bộ về Tiếp nhận ngay.",
                    "moved",
                  )}
                  {renderTable(
                    "A2. Đã cấp — chờ thu về từ khoa (ký nhận khi quét Tiếp nhận)",
                    holdRows,
                    "Không có bộ chờ thu về.",
                    "hold",
                  )}
                  {renderTable(
                    "B. Đã dùng lâm sàng — bàn giao theo dõi NB",
                    listedRows,
                    "Không có bộ đã dùng lâm sàng.",
                    "used",
                  )}
                  <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700 }}>
                    Tổng BM.01: Xuất theo sổ {totals.xuat} / Thu hồi được {totals.thuHoiDuoc} / Thất lạc–đã dùng{" "}
                    {totals.thatLacHoacDaDung}
                    {totals.choThuVe ? ` (còn chờ ${totals.choThuVe})` : ""}
                  </p>
                </>
              );
            })()}
          </div>
        ) : null}

        <div style={{ marginBottom: "12px" }}>
          <strong>Nguyên nhân sơ bộ:</strong>
          <p style={{ margin: "4px 0 0", minHeight: 28, borderBottom: "1px solid #ccc" }}>
            {detailsMap["NGUYEN_NHAN_SO_BO"] || incident.mo_ta || "—"}
          </p>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <strong>Hành động khắc phục tức thời:</strong>
          <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 12 }}>
            <li style={{ borderBottom: "1px solid #ccc", minHeight: 22 }}>{solutionText}</li>
            <li style={{ borderBottom: "1px solid #ccc", minHeight: 22 }}>&nbsp;</li>
            <li style={{ borderBottom: "1px solid #ccc", minHeight: 22 }}>&nbsp;</li>
            <li style={{ borderBottom: "1px solid #ccc", minHeight: 22 }}>&nbsp;</li>
          </ol>
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
