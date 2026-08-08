// src/modules/giam-sat-chung/components/GiamSatChungPrintView.tsx
"use client";

import React from "react";
import type { MasterOption } from "@/lib/master-data/gateway";
import { ChecklistTemplate, ChecklistResult } from "@/types/giam-sat-chung";
import PrintLayout from "@/components/shared/PrintLayout";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { safeFormatDt, safeFormatNgay } from "./gsc-print-utils";
import { GiamSatChungPrintCriteriaSection } from "./GiamSatChungPrintCriteriaSection";
import type { NhanSuLike } from "../lib/gsc-session-labels";
import {
  resolveGscDoiTuongTen,
  resolveGscKhoaTen,
  resolveGscKhuTen,
  resolveGscNgheTen,
  resolveGscNguoiGiamSatTen,
} from "../lib/gsc-session-labels";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import { gscSessionDisplayRef } from "../lib/gsc-display-ref";

interface GiamSatChungPrintViewProps {
  session: Record<string, unknown>;
  results: ChecklistResult[];
  template: ChecklistTemplate;
  khoas?: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string }>;
  khuVucs?: Array<{ id?: string; ten_danh_muc?: string }>;
  /** Tra cứu tên đối tượng / nghề khi phiên chỉ có UUID (form đang nhập). */
  ngheNghieps?: MasterOption[];
  nhanSus?: NhanSuLike[];
  /** Mã QR mở lại phiên + ảnh đã sinh trước khi in */
  qrCode?: string;
  qrDataUrl?: string;
}

export default function GiamSatChungPrintView({
  session,
  results,
  template,
  khoas = [],
  khuVucs = [],
  ngheNghieps = [],
  nhanSus = [],
  qrCode,
  qrDataUrl,
}: GiamSatChungPrintViewProps) {
  const currentKhoa = resolveGscKhoaTen(session, khoas);
  const currentKhuVuc = resolveGscKhuTen(session, khuVucs);
  const doiTuongTen = resolveGscDoiTuongTen(session, nhanSus);
  const ngheTen = resolveGscNgheTen(session, ngheNghieps);
  const printTitle = String(template.title || "PHIẾU GIÁM SÁT THEO BẢNG KIỂM").toUpperCase();
  const isTuGiamSat = String(session.hinh_thuc_giam_sat || "").toLowerCase().includes("tự giám sát");
  const departmentTitle = isTuGiamSat
    ? String(currentKhoa || "KHOA KIỂM SOÁT NHIỄM KHUẨN").toUpperCase()
    : "KHOA KIỂM SOÁT NHIỄM KHUẨN";
  const cachThuc = String(session.cach_thuc_giam_sat || "");
  const isReplayCamera = isReplayCameraSupervisionCachThuc(cachThuc);
  const tBat = session.thoi_gian_bat_dau;
  const tKt = session.thoi_gian_ket_thuc;
  const khungGioDayDu = Boolean(tBat && tKt);
  const sessionId = String(session.id || "").trim();
  const ngayGS =
    (session.ngay_giam_sat as string) || (session.created_at as string) || null;
  const maHienThi = String(session.ma_hien_thi || "").trim();
  const printMa =
    maHienThi ||
    (sessionId ? gscSessionDisplayRef(sessionId, ngayGS) : "GSC-KHONG_MA");

  return (
    <PrintLayout
      title={printTitle}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle={departmentTitle}
      fileTitle={() => buildPrintFileTitle({ loai: "LSGS", ma: printMa })}
      afterFooter={
        qrDataUrl && qrCode ? (
          <EntityQrBlock dataUrl={qrDataUrl} code={qrCode} caption="Quét mở lại phiếu GSC" variant="compact" />
        ) : null
      }
    >
      <div style={{ lineHeight: 1.35 }}>
        <div style={{ marginBottom: "10px" }}>
          <p style={{ margin: "0 0 3px 0", fontSize: "13px" }}>
            <strong>Khoa/Phòng/Ban được giám sát:</strong>{" "}
            <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{currentKhoa}</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginBottom: "3px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Khu vực:</strong> {currentKhuVuc}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Vị trí cụ thể:</strong> {String(session.vi_tri || "—")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginBottom: "3px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Ngày giám sát:</strong> {safeFormatNgay(session.ngay_giam_sat)}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Người giám sát:</strong> {resolveGscNguoiGiamSatTen(session, nhanSus)}
            </p>
          </div>
          {isReplayCamera ? (
            <p style={{ margin: "0 0 3px 0", fontSize: "13px", lineHeight: 1.4 }}>
              <strong>Khung giờ giám sát (theo băng hình / đoạn được xem lại):</strong>{" "}
              {khungGioDayDu ? (
                <>
                  {safeFormatDt(tBat)} — {safeFormatDt(tKt)}
                </>
              ) : (
                <span style={{ fontStyle: "italic" }}>
                  — (chưa khai báo; nhập Từ–Đến giờ ở phần đầu phiên trước khi in)
                </span>
              )}
            </p>
          ) : khungGioDayDu ? (
            <p style={{ margin: "0 0 3px 0", fontSize: "13px" }}>
              <strong>Khung giờ giám sát:</strong> {safeFormatDt(tBat)} — {safeFormatDt(tKt)}
            </p>
          ) : (
            <p style={{ margin: "0 0 3px 0", fontSize: "13px" }}>
              <strong>Thời điểm ghi nhận:</strong> {safeFormatDt(session.thoi_gian_ghi_nhan)}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginBottom: "3px" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Hình thức giám sát:</strong> {String(session.hinh_thuc_giam_sat || "—")}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              <strong>Cách thức giám sát:</strong> {String(session.cach_thuc_giam_sat || "—")}
            </p>
          </div>

          {session.is_giam_sat_ca_nhan ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginTop: "4px" }}>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Đối tượng được giám sát:</strong> {doiTuongTen}
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Chức danh / nghề nghiệp:</strong> {ngheTen}
              </p>
            </div>
          ) : null}
          {session.is_bo_sung_nguoi_benh ||
          String(session.ma_nguoi_benh || "").trim() ||
          String(session.ten_nguoi_benh || "").trim() ||
          String(session.so_giuong_nguoi_benh || "").trim() ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginTop: "4px" }}>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Mã người bệnh:</strong> {String(session.ma_nguoi_benh || "").trim() || "—"}
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Tên người bệnh:</strong> {String(session.ten_nguoi_benh || "").trim() || "—"}
              </p>
              <p style={{ margin: 0, fontSize: "13px", gridColumn: "1 / -1" }}>
                <strong>Số giường:</strong> {String(session.so_giuong_nguoi_benh || "").trim() || "—"}
              </p>
              <p style={{ margin: 0, fontSize: "13px", gridColumn: "1 / -1" }}>
                <strong>Can thiệp xâm lấn:</strong>{" "}
                {[
                  session.bn_tho_may ? "Thở máy" : null,
                  session.bn_phau_thuat ? "Phẫu thuật" : null,
                  session.bn_cvc ? "Đường truyền trung tâm (CVC)" : null,
                  session.bn_foley ? "Ống thông tiểu" : null,
                ]
                  .filter(Boolean)
                  .join("; ") || "—"}
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Nhiễm đa kháng:</strong>{" "}
                {session.bn_nhiem_mdro
                  ? `Có${session.bn_mdro_phenotype ? ` (${String(session.bn_mdro_phenotype)})` : ""}`
                  : "Không"}
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                <strong>Tác nhân nguy hiểm:</strong>{" "}
                {session.bn_nhiem_tac_nhan_nguy_hiem
                  ? `Có${
                      String(session.bn_tac_nhan_nguy_hiem_ten || "").trim()
                        ? ` — ${String(session.bn_tac_nhan_nguy_hiem_ten).trim()}`
                        : ""
                    }`
                  : "Không"}
              </p>
            </div>
          ) : null}
        </div>

        <div style={{ borderBottom: "1px solid #000", marginBottom: "10px", marginTop: "4px" }} />

        <GiamSatChungPrintCriteriaSection template={template} results={results} session={session} />
      </div>
    </PrintLayout>
  );
}
