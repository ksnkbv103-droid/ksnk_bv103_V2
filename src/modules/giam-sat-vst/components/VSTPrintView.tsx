// src/modules/giam-sat-vst/components/VSTPrintView.tsx
"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import type { VSTFormPerson } from "../hooks/useVSTFormHandlers";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { formatDateVi, formatDtVi } from "./vst-print-helpers";
import { VSTPrintPersonBlocks } from "./VSTPrintPersonBlocks";
import { classifyVstAction } from "../lib/vst-action-classifier";
import { formatPercent1FromRatio } from "@/lib/analytics/supervision-percent";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import { vstSessionDisplayRef } from "../lib/vst-display-ref";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

const sameId = (a: unknown, b: unknown) => String(a ?? "").trim() === String(b ?? "").trim();

interface VSTPrintViewProps {
  session: Record<string, unknown>;
  persons: VSTFormPerson[];
  ngheNghieps: Array<{ id?: string; ten_danh_muc?: string }>;
  khoas: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string; ma_danh_muc?: string; ma_khoa?: string }>;
  khuVucs: Array<{ id?: string; ten_danh_muc?: string }>;
  nhanSus?: Array<{ id?: string; ho_ten?: string }>;
  qrCode?: string;
  qrDataUrl?: string;
}

export default function VSTPrintView({
  session,
  persons,
  ngheNghieps,
  khoas,
  khuVucs,
  nhanSus = [],
  qrCode,
  qrDataUrl,
}: VSTPrintViewProps) {
  const khoaRow = khoas.find((k) => sameId(k.id, session.khoa_id));
  const currentKhoa = formatKhoaCompactLabel({
    ma_khoa:
      String(session.ma_khoa_phong || "").trim() ||
      khoaRow?.ma_danh_muc ||
      khoaRow?.ma_khoa ||
      null,
    ten_khoa:
      (session.danh_muc_khoa as { ten_danh_muc?: string } | undefined)?.ten_danh_muc ||
      khoaRow?.ten_danh_muc ||
      khoaRow?.ten_khoa ||
      String(session.ten_khoa_phong || "").trim() ||
      null,
  });
  const currentKhuVuc =
    (session.danh_muc_khu_vuc as { ten_danh_muc?: string } | undefined)?.ten_danh_muc ||
    khuVucs.find((kv) => sameId(kv.id, session.khu_vuc_id))?.ten_danh_muc ||
    "—";
  const viTri = String(session.vi_tri_cu_the || session.vi_tri || "").trim() || "—";
  const ngayGS = (session.ngay_giam_sat as string) || (session.created_at as string) || new Date().toISOString();
  const tenGsFlat = String((session as { ten_nguoi_giam_sat?: string }).ten_nguoi_giam_sat || "").trim();
  const nguoiGs =
    (session.nguoi_giam_sat as { ho_ten?: string } | undefined)?.ho_ten?.trim() ||
    (tenGsFlat && tenGsFlat !== "—" ? tenGsFlat : "") ||
    nhanSus.find((n) => sameId(n.id, session.nguoi_giam_sat_id))?.ho_ten ||
    String(session.nguoi_giam_sat_id || "").trim() ||
    "—";
  const isTuGiamSat = String(session.hinh_thuc_giam_sat || "").toLowerCase().includes("tự giám sát");
  const departmentTitle = isTuGiamSat
    ? String(currentKhoa || "KHOA KIỂM SOÁT NHIỄM KHUẨN").toUpperCase()
    : "KHOA KIỂM SOÁT NHIỄM KHUẨN";
  let totalOpp = 0;
  let compliant = 0;
  for (const p of persons) {
    for (const o of p.opportunities) {
      if (!o?.hanh_dong) continue;
      totalOpp += 1;
      if (classifyVstAction(o.hanh_dong).isCompliant) compliant += 1;
    }
  }
  const pctLabel = totalOpp > 0 ? formatPercent1FromRatio(compliant, totalOpp) : null;
  const cachThuc = String(session.cach_thuc_giam_sat || "");
  const isReplayCamera = isReplayCameraSupervisionCachThuc(cachThuc);
  const tBat = session.thoi_gian_bat_dau as string | undefined;
  const tKt = session.thoi_gian_ket_thuc as string | undefined;
  const khungGioDayDu = Boolean(tBat && tKt);
  const sessionId = String(session.id || "").trim();
  const maHienThi = String(session.ma_hien_thi || "").trim();
  const printMa =
    maHienThi ||
    (sessionId ? vstSessionDisplayRef(sessionId, ngayGS) : "VST-KHONG_MA");

  return (
    <PrintLayout
      title="PHIẾU GIÁM SÁT THỰC HÀNH VỆ SINH TAY (WHO 5 THỜI ĐIỂM)"
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle={departmentTitle}
      fileTitle={() => buildPrintFileTitle({ loai: "LSGS", ma: printMa })}
      afterFooter={
        qrDataUrl && qrCode ? (
          <EntityQrBlock dataUrl={qrDataUrl} code={qrCode} caption="Quét mở lại phiếu VST" variant="compact" />
        ) : null
      }
    >
      <div>
        <div style={{ marginBottom: "16px" }}>
          <p style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            <strong>Khoa/Phòng/Ban được giám sát:</strong>{" "}
            <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{currentKhoa}</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Khu vực giám sát:</strong> {currentKhuVuc}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Vị trí cụ thể:</strong> {viTri}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Ngày giám sát:</strong> {formatDateVi(ngayGS)}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Người giám sát:</strong> {nguoiGs}
            </p>
          </div>
          {isReplayCamera ? (
            <p style={{ margin: "0 0 6px 0", fontSize: "13px", lineHeight: 1.4 }}>
              <strong>Khung giờ giám sát (theo băng hình / đoạn được xem lại):</strong>{" "}
              {khungGioDayDu ? (
                <>
                  {formatDtVi(tBat)} — {formatDtVi(tKt)}
                </>
              ) : (
                <span style={{ fontStyle: "italic" }}>
                  — (chưa khai báo; nhập Ngày giám sát và Từ–Đến giờ ở phần đầu phiên trước khi in)
                </span>
              )}
            </p>
          ) : khungGioDayDu ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Thời gian bắt đầu phiên:</strong> {formatDtVi(tBat)}
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Thời gian kết thúc phiên:</strong> {formatDtVi(tKt)}
              </p>
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Hình thức giám sát:</strong> {String(session.hinh_thuc_giam_sat || "—")}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Cách thức giám sát:</strong> {String(session.cach_thuc_giam_sat || "—")}
            </p>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #000", marginBottom: "16px", marginTop: "8px" }} />

        <VSTPrintPersonBlocks persons={persons} ngheNghieps={ngheNghieps} nhanSus={nhanSus} />

        {pctLabel !== null ? (
          <div
            style={{
              marginTop: "20px",
              padding: "8px 0",
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
              borderRadius: 0,
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#000" }}>
              <strong>Tổng hợp phiên:</strong> {compliant}/{totalOpp} lượt ghi nhận có hành động —{" "}
              <strong>tỷ lệ không &quot;Bỏ sót&quot;: {pctLabel}</strong>
            </p>
          </div>
        ) : null}
      </div>
    </PrintLayout>
  );
}
