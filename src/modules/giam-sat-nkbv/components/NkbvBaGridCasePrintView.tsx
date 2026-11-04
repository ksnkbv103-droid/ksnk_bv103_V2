"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import { formatNkbvChecklistTypeLabel } from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";
import type { BaGridNghiNgo } from "@/modules/giam-sat-nkbv/lib/nkbv-ba-grid-engine";
import type { NkbvChecklistTypeCode } from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";

export type BaGridPrintCriterion = { label: string; date: string };

export type NkbvBaGridCasePrintProps = {
  maBenhAn: string;
  hoTen?: string | null;
  maBenhNhan?: string | null;
  khoaTen?: string | null;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  nghiNgo: BaGridNghiNgo;
  checklistType: NkbvChecklistTypeCode | string;
  indexDate: string;
  indexKind: "XN" | "CDHA" | "TIEU_CHUAN";
  benhPham?: string | null;
  tacNhan?: string | null;
  nsk: string | null;
  iwpStart?: string | null;
  iwpEnd?: string | null;
  ritEnd?: string | null;
  sbapStart?: string | null;
  sbapEnd?: string | null;
  dayOfHospitalization?: number | null;
  haiStatus?: string | null;
  canThiepLabel?: string | null;
  lienQuanXamLan?: string | null;
  criteria: BaGridPrintCriterion[];
  ketLuanSummary: string;
  ghiChu?: string | null;
  lockStatus: "DRAFT" | "DA_CHOT";
};

function fmtDate(raw: string | null | undefined): string {
  const s = String(raw || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 8px 0", fontSize: "12.5px", textAlign: "justify", lineHeight: 1.45 }}>
      {children}
    </p>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div
      style={{
        margin: "12px 0 6px 0",
        padding: "2px 6px",
        backgroundColor: "#f8fafc",
        borderLeft: "3px solid #1e293b",
        fontSize: "12px",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {n}. {title}
    </div>
  );
}

/**
 * Biên bản / phiếu xác định ca NKBV — chuẩn BM.01/QT.33
 * theo Quy trình KSNK.QT.33 và Quyết định 3916/QĐ-BYT.
 */
export default function NkbvBaGridCasePrintView(props: NkbvBaGridCasePrintProps) {
  const typeLabel = formatNkbvChecklistTypeLabel(props.checklistType as never);
  const indexKindLabel =
    props.indexKind === "XN"
      ? "xét nghiệm vi sinh"
      : props.indexKind === "CDHA"
        ? "chẩn đoán hình ảnh"
        : "tiêu chuẩn chẩn đoán";

  const windowLabel =
    props.nghiNgo === "VAE"
      ? "Event Period"
      : props.nghiNgo === "SSI"
        ? "cửa sổ giám sát SSI"
        : "IWP (±3 ngày quanh Index)";

  const criteriaText =
    props.criteria.length === 0
      ? "Chưa ghi nhận tiêu chí dương tính trong cửa sổ."
      : props.criteria
          .map((c, i) => {
            const d = c.date !== "—" && c.date ? ` (ngày ${fmtDate(c.date)})` : "";
            return `${i + 1}) ${c.label}${d}`;
          })
          .join("; ");

  return (
    <PrintLayout
      title="PHIẾU ĐIỀU TRA CA BỆNH NHIỄM KHUẨN BỆNH VIỆN"
      subtitle={`(Ban hành kèm theo Quy trình KSNK.QT.33 — Quyết định 3916/QĐ-BYT) · ${typeLabel}`}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      density="compact"
      leftSignatureTitle="NGƯỜI ĐIỀU TRA LÂM SÀNG"
      rightSignatureTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      fileTitle={() =>
        buildPrintFileTitle({
          loai: "NKBV_BM01",
          ma: `${props.maBenhAn}_${props.indexDate.replace(/-/g, "")}`,
        })
      }
    >
      <div style={{ color: "#000", lineHeight: 1.4 }}>
        {/* === META BAR === */}
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
              border: props.lockStatus === "DA_CHOT" ? "1px solid #059669" : "1px solid #d97706",
              color: props.lockStatus === "DA_CHOT" ? "#065f46" : "#92400e",
              backgroundColor: props.lockStatus === "DA_CHOT" ? "#ecfdf5" : "#fffbeb",
            }}
          >
            Trạng thái phiếu: {props.lockStatus === "DA_CHOT" ? "ĐÃ CHỐT CA BỆNH" : "BẢN NHÁP (DRAFT)"}
          </span>
          <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#1e293b" }}>
            Biểu mẫu: BM.01/QT.33
          </span>
        </div>

        <SectionTitle n="I" title="Hành chính & Vào viện" />
        <Para>
          Bệnh nhân <strong>{props.hoTen || "—"}</strong>, mã bệnh nhân (PID){" "}
          <strong>{props.maBenhNhan || "—"}</strong>, mã bệnh án{" "}
          <strong style={{ fontFamily: "monospace" }}>{props.maBenhAn}</strong>
          {props.khoaTen ? (
            <>
              , khoa điều trị <strong>{props.khoaTen}</strong>
            </>
          ) : null}
          . Ngày vào viện {fmtDate(props.ngayVaoVien)}
          {props.ngayRaVien ? (
            <>
              ; ngày ra viện {fmtDate(props.ngayRaVien)}
            </>
          ) : (
            <> (đang nằm viện)</>
          )}
          . Loại sự kiện nghi ngờ / xác định: <strong>{typeLabel}</strong> ({props.nghiNgo}).
        </Para>

        <SectionTitle n="II" title="Yếu tố xác định khung (Index)" />
        <Para>
          Yếu tố xác định khung là {indexKindLabel} ngày <strong>{fmtDate(props.indexDate)}</strong>
          {props.benhPham ? (
            <>
              , bệnh phẩm / mô tả: <strong>{props.benhPham}</strong>
            </>
          ) : null}
          {props.tacNhan ? (
            <>
              , tác nhân vi khuẩn: <em>{props.tacNhan}</em>
            </>
          ) : null}
          . Ngày này được dùng làm Index (Ngày X) để dựng cửa sổ thời gian và quy kết bằng chứng.
        </Para>

        <SectionTitle n="III" title="Cửa sổ chẩn đoán · DOE · POA/HAI" />
        <Para>
          Cửa sổ {windowLabel}
          {props.iwpStart && props.iwpEnd
            ? ` từ ${fmtDate(props.iwpStart)} đến ${fmtDate(props.iwpEnd)}`
            : ""}
          . Ngày sự kiện (DOE / NSK) là <strong>{fmtDate(props.nsk)}</strong>
          {props.dayOfHospitalization != null
            ? ` (ngày nằm viện thứ ${props.dayOfHospitalization})`
            : ""}
          . Phân loại POA/HAI theo DOE so với ngày vào viện:{" "}
          <strong>{props.haiStatus || "—"}</strong>.
        </Para>

        <SectionTitle n="IV" title="Tiêu chuẩn trong cửa sổ" />
        <Para>
          Các tiêu chuẩn / triệu chứng đã ghi nhận trong cửa sổ phân tích: {criteriaText}
        </Para>

        <SectionTitle n="V" title="Yếu tố can thiệp · RIT · SBAP" />
        <Para>
          Can thiệp xâm lấn theo dõi: <strong>{props.canThiepLabel || "—"}</strong>
          {props.lienQuanXamLan
            ? `; liên quan xâm lấn: ${
                props.lienQuanXamLan === "co"
                  ? "có"
                  : props.lienQuanXamLan === "khong"
                    ? "không"
                    : "chưa rõ"
              }`
            : ""}
          . Khung RIT (Repeat Infection Timeframe)
          {props.nsk && props.ritEnd
            ? ` từ ${fmtDate(props.nsk)} đến ${fmtDate(props.ritEnd)}`
            : " — chưa xác định"}
          . Cửa sổ Secondary BSI (SBAP)
          {props.sbapStart && props.sbapEnd
            ? ` từ ${fmtDate(props.sbapStart)} đến ${fmtDate(props.sbapEnd)}`
            : " — không áp dụng hoặc chưa có"}
          .
        </Para>

        <SectionTitle n="VI" title="Kết luận & Khuyến cáo KSNK" />
        <Para>
          Kết luận phân tích trên bệnh án: <strong>{props.ketLuanSummary || "—"}</strong>.
        </Para>
        {props.ghiChu ? (
          <Para>
            Ghi chú bổ sung: {props.ghiChu}
          </Para>
        ) : null}
        <Para>
          Khuyến cáo: Thực hiện phòng ngừa chuẩn kết hợp phòng ngừa theo đường lây truyền. Khoa điều trị phối hợp Khoa Kiểm soát Nhiễm khuẩn giám sát chặt chẽ diễn biến lâm sàng của bệnh nhân.
        </Para>
      </div>
    </PrintLayout>
  );
}
