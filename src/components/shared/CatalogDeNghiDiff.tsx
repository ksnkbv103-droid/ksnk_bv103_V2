"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { buildDeNghiDiffRows } from "@/lib/domain/cssd-catalog-de-nghi-diff";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  catalogDeNghiStatusLabel,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";

const cell: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontSize: 12 };

/** Bảng «Cũ → Mới» của một phiếu đề nghị + nút In phiếu (A4, chỉ hiện khi in). */
export function CatalogDeNghiDiff({ row }: { row: CssdCatalogDeNghiRow }) {
  const diff = buildDeNghiDiffRows(row);
  const created = row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : "—";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          {CSSD_CATALOG_DE_NGHI_KIND_LABEL[row.targetKind]} · {row.targetMa || "—"} · {created} ·{" "}
          {catalogDeNghiStatusLabel(row.status)}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          In phiếu
        </button>
      </div>
      <table className="w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="border border-slate-200 px-2 py-1">Đối tượng</th>
            <th className="border border-slate-200 px-2 py-1">Nội dung</th>
            <th className="border border-slate-200 px-2 py-1">Cũ</th>
            <th className="border border-slate-200 px-2 py-1">Mới</th>
          </tr>
        </thead>
        <tbody>
          {diff.length === 0 ? (
            <tr>
              <td colSpan={4} className="border border-slate-200 px-2 py-1 text-slate-500">
                Không có thay đổi so với hiện tại.
              </td>
            </tr>
          ) : (
            diff.map((d, i) => (
              <tr key={i}>
                <td className="border border-slate-200 px-2 py-1">{d.doiTuong}</td>
                <td className="border border-slate-200 px-2 py-1">{d.truong}</td>
                <td className="border border-slate-200 px-2 py-1 text-rose-700">{d.cu}</td>
                <td className="border border-slate-200 px-2 py-1 font-semibold text-emerald-700">{d.moi}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <PrintLayout
        title="PHIẾU ĐỀ NGHỊ THAY ĐỔI DANH MỤC"
        subtitle={`${CSSD_CATALOG_DE_NGHI_KIND_LABEL[row.targetKind]} · ${row.targetMa || ""} ${row.targetTen || ""}`.trim()}
        headerTitle="BỆNH VIỆN QUÂN Y 103"
        departmentTitle="KHOA KIỂM SOÁT NHIỄM KHUẨN"
        leftSignatureTitle="NGƯỜI ĐỀ NGHỊ"
        rightSignatureTitle="NGƯỜI DUYỆT"
        density="compact"
        fileTitle={`PHIEU_DE_NGHI_${row.targetMa || row.id}`}
      >
        <p style={{ margin: "0 0 6px 0" }}>
          Lập lúc: {created} · Trạng thái: {catalogDeNghiStatusLabel(row.status)}
          {row.note ? ` · Ghi chú: ${row.note}` : ""}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...cell, width: 32 }}>STT</th>
              <th style={cell}>Đối tượng</th>
              <th style={cell}>Nội dung</th>
              <th style={cell}>Cũ</th>
              <th style={cell}>Mới</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((d, i) => (
              <tr key={i}>
                <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
                <td style={cell}>{d.doiTuong}</td>
                <td style={cell}>{d.truong}</td>
                <td style={cell}>{d.cu}</td>
                <td style={cell}>{d.moi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
