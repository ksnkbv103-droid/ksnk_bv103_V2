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

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <p
      style={{
        margin: "14px 0 6px 0",
        fontSize: "13px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {n}. {title}
    </p>
  );
}

/**
 * Biên bản / phiếu xác định ca NKBV — dạng văn bản (không bảng),
 * cùng khung mục với form báo cáo ca bệnh (clinical-forms hàng 0–9).
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
      title={`PHIẾU XÁC ĐỊNH CA NKBV — ${typeLabel}`}
      headerTitle="BỆNH VIỆN QUÂN Y 103"
      departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
      density="compact"
      leftSignatureTitle="NGƯỜI XÁC NHẬN LÂM SÀNG"
      rightSignatureTitle="KSNK XÁC NHẬN CHỐT CA"
      fileTitle={() =>
        buildPrintFileTitle({
          loai: "NKBV_PXDC",
          ma: `${props.maBenhAn}_${props.indexDate.replace(/-/g, "")}`,
        })
      }
    >
      <div style={{ color: "#000" }}>
        <Para>
          <strong>
            Trạng thái phiếu:{" "}
            {props.lockStatus === "DA_CHOT" ? "ĐÃ CHỐT" : "NHÁP (DRAFT)"}
          </strong>
          . Tài liệu này là biên bản phân tích nhiễm khuẩn bệnh viện theo tiêu chuẩn CDC/NHSN,
          lập trên bệnh án sau khi hoàn tất phân tích trên lưới thời gian.
        </Para>

        <SectionTitle n={1} title="Hành chính" />
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

        <SectionTitle n={2} title="Yếu tố xác định khung (Index)" />
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

        <SectionTitle n={3} title="Cửa sổ thời gian · DOE · POA/HAI" />
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

        <SectionTitle n={4} title="Tiêu chuẩn trong cửa sổ" />
        <Para>
          Các tiêu chuẩn / triệu chứng đã ghi nhận trong cửa sổ phân tích: {criteriaText}
        </Para>

        <SectionTitle n={5} title="Dụng cụ xâm lấn · RIT · SBAP" />
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

        <SectionTitle n={6} title="Kết luận" />
        <Para>
          Kết luận phân tích trên bệnh án: <strong>{props.ketLuanSummary || "—"}</strong>.
        </Para>
        {props.ghiChu ? (
          <Para>
            Ghi chú bổ sung: {props.ghiChu}
          </Para>
        ) : null}

        <Para>
          Đề nghị người xác nhận lâm sàng và Khoa Kiểm soát Nhiễm khuẩn ký xác nhận bên dưới để hoàn
          tất hồ sơ giám sát nhiễm khuẩn bệnh viện.
        </Para>
      </div>
    </PrintLayout>
  );
}
