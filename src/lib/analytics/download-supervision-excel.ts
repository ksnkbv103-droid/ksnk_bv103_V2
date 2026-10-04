"use client";

import { saveAs } from "file-saver";

/** Header tiếng Việt cho xuất giám sát (VST-09). Key kỹ thuật → nhãn. */
export const SUPERVISION_EXCEL_HEADER_VI: Record<string, string> = {
  session_id: "Mã phiên",
  ngay_giam_sat: "Ngày giám sát",
  khoa: "Khoa",
  ten_khu_vuc: "Khu vực",
  vi_tri: "Vị trí",
  hinh_thuc_giam_sat: "Hình thức giám sát",
  ten_nguoi_giam_sat: "Người giám sát",
  thoi_gian_bat_dau: "Giờ bắt đầu phiên",
  thoi_gian_ket_thuc: "Giờ kết thúc phiên",
  ten_doi_tuong: "Tên đối tượng",
  ngoai_danh_muc: "Ngoài danh mục",
  ten_nghe_nghiep: "Nghề nghiệp",
  thoi_diem: "Thời điểm",
  hanh_dong: "Hành động",
  dung_ky_thuat: "Kỹ thuật (phiếu WHO)",
  du_thoi_gian: "Đủ thời gian (phiếu WHO)",
  co_deo_gang: "Đang mang găng (khi bỏ sót)",
  thoi_gian_ghi_nhan: "Giờ ghi nhận cơ hội",
};

function headerLabel(key: string): string {
  return SUPERVISION_EXCEL_HEADER_VI[key] ?? key;
}

function cellValue(v: unknown): string | number | boolean | null {
  if (v === true) return "Có";
  if (v === false) return "Không";
  if (v == null) return "";
  return v as string | number;
}

/** Tải workbook Excel từ mảng object (client). */
export async function downloadRowsAsExcel(
  sheetName: string,
  rows: Record<string, unknown>[],
  fileBase: string,
): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Data");
  if (rows.length === 0) {
    ws.addRow(["(Không có dữ liệu trong phạm vi xuất)"]);
  } else {
    const keys = Object.keys(rows[0]!);
    ws.addRow(keys.map(headerLabel));
    for (const row of rows) {
      ws.addRow(keys.map((k) => cellValue(row[k])));
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `BV103_${fileBase}.xlsx`);
}
