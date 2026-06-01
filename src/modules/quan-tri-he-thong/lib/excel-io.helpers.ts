"use client";

import ExcelJS from "exceljs";
// @ts-expect-error — xlsx không khai báo types đầy đủ trong dự án
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type DanhMucType = "khoa-phong" | "hoa-chat" | "thiet-bi" | "nhan-su";

interface TemplateColumn {
  header: string;
  key: string;
  width: number;
  note?: string;
  required?: boolean;
}

const TEMPLATE_SPECS: Record<DanhMucType, TemplateColumn[]> = {
  "khoa-phong": [
    { header: "Mã khoa*", key: "ma_khoa", width: 15, required: true, note: "Mã khoa duy nhất, không trùng lặp, viết liền không dấu (VD: KHOA_NGOAI)" },
    { header: "Tên khoa*", key: "ten_khoa", width: 25, required: true, note: "Tên đầy đủ của khoa phòng (VD: Khoa Ngoại chấn thương)" },
    { header: "Khối khoa", key: "ten_khoi", width: 18, note: "Khối thuộc khoa phòng (Lâm sàng, Cận lâm sàng, Hậu cần, Hành chính)" },
    { header: "Mô tả chức năng", key: "mo_ta_chuc_nang", width: 30, note: "Mô tả ngắn gọn chức năng nhiệm vụ" },
    { header: "Số bác sĩ", key: "so_bac_si", width: 12, note: "Số lượng bác sĩ trong khoa (Phải là số nguyên >= 0)" },
    { header: "Số điều dưỡng", key: "so_dieu_duong", width: 15, note: "Số lượng điều dưỡng trong khoa (Phải là số nguyên >= 0)" },
    { header: "Số giường bệnh thường", key: "so_giuong_benh_thuong", width: 22, note: "Số giường kế hoạch thường (Số nguyên >= 0)" },
    { header: "Số giường cấp cứu", key: "so_giuong_cap_cuu", width: 20, note: "Số giường cấp cứu chuyên biệt (Số nguyên >= 0)" },
  ],
  "hoa-chat": [
    { header: "Mã hóa chất*", key: "ma_hoa_chat", width: 18, required: true, note: "Mã định danh hóa chất, không trùng lặp (VD: HC001, C2H5OH)" },
    { header: "Tên hóa chất*", key: "ten_hoa_chat", width: 28, required: true, note: "Tên hóa chất hoặc vật tư y tế" },
    { header: "Loại hóa chất", key: "loai_hoa_chat", width: 18, note: "Phân loại (Ví dụ: Sát khuẩn, Tẩy rửa, Chỉ thị)" },
    { header: "Đơn vị tính", key: "don_vi_tinh", width: 15, note: "Đơn vị đo lường (Ví dụ: Chai, Lít, Viên, Hộp)" },
    { header: "Hạn sử dụng", key: "han_su_dung", width: 16, note: "Định dạng ngày YYYY-MM-DD (Ví dụ: 2026-12-31)" },
    { header: "Ngưỡng tồn tối thiểu", key: "nguong_ton_toi_thieu", width: 22, note: "Mức cảnh báo tồn kho tối thiểu (Số >= 0)" },
  ],
  "thiet-bi": [
    { header: "Mã thiết bị*", key: "ma_thiet_bi", width: 18, required: true, note: "Mã định danh máy/thiết bị tiệt khuẩn, không trùng lặp (VD: MAY_HAP_01)" },
    { header: "Tên thiết bị*", key: "ten_thiet_bi", width: 25, required: true, note: "Tên thiết bị tiệt khuẩn y tế" },
    { header: "Loại máy tiệt khuẩn", key: "ten_loai_may", width: 22, note: "Loại máy tiệt khuẩn (Ví dụ: Hấp ướt, Hấp nhiệt độ thấp, Plasma)" },
    { header: "Ngày sử dụng", key: "ngay_dua_vao_su_dung", width: 16, note: "Ngày đưa vào sử dụng, định dạng YYYY-MM-DD" },
    { header: "Chu kỳ bảo trì (ngày)", key: "chu_ky_bao_tri_ngay", width: 22, note: "Số ngày giữa các đợt bảo trì định kỳ (Số nguyên > 0, mặc định: 180)" },
  ],
  "nhan-su": [
    { header: "Mã nhân viên*", key: "ma_nv", width: 16, required: true, note: "Mã số nhân viên y tế duy nhất (VD: NV1023)" },
    { header: "Họ tên nhân sự*", key: "ho_ten", width: 25, required: true, note: "Họ và tên đầy đủ nhân sự y tế" },
    { header: "Email đăng nhập", key: "email", width: 22, note: "Email đăng nhập hệ thống, đúng định dạng (Ví dụ: bacsi.a@bv103.vn)" },
    { header: "Số điện thoại", key: "so_dien_thoai", width: 16, note: "Số điện thoại liên lạc" },
    { header: "Giới tính", key: "gioi_tinh", width: 12, note: "Giới tính (Nam, Nữ)" },
    { header: "Ngày sinh", key: "ngay_sinh", width: 15, note: "Ngày sinh định dạng YYYY-MM-DD (Ví dụ: 1990-05-15)" },
    { header: "Mã khoa phòng*", key: "ma_khoa", width: 18, required: true, note: "Mã khoa phòng nhân viên thuộc về (Phải trùng khớp mã khoa phòng hệ thống)" },
    { header: "Mã tổ công tác", key: "ma_to", width: 18, note: "Mã tổ công tác trong khoa nếu có (Phẫu thuật, CSSD, Hành chính...)" },
    { header: "Tên chức vụ", key: "ten_chuc_vu", width: 16, note: "Chức vụ (Ví dụ: Trưởng khoa, Điều dưỡng trưởng, Nhân viên)" },
    { header: "Tên chức danh", key: "ten_chuc_danh", width: 16, note: "Chức danh khoa học (Ví dụ: PGS.TS, Thạc sĩ, Bác sĩ CKI, Cử nhân)" },
  ],
};

const DUMMY_DATA: Record<DanhMucType, Record<string, any>[]> = {
  "khoa-phong": [
    { ma_khoa: "KHOA_NGOAI", ten_khoa: "Khoa Ngoại chấn thương", ten_roi: "Lâm sàng", mo_ta_chuc_nang: "Tiếp nhận và phẫu thuật chấn thương", so_bac_si: 12, so_dieu_duong: 24, so_giuong_benh_thuong: 40, so_giuong_cap_cuu: 5 },
    { ma_khoa: "KHOA_KSNK", ten_khoa: "Khoa Kiểm soát nhiễm khuẩn", ten_roi: "Hậu cần", mo_ta_chuc_nang: "Quản lý vô khuẩn và giám sát nhiễm khuẩn viện", so_bac_si: 3, so_dieu_duong: 8, so_giuong_benh_thuong: 0, so_giuong_cap_cuu: 0 }
  ],
  "hoa-chat": [
    { ma_hoa_chat: "HC001", ten_hoa_chat: "Cồn 70 độ sát khuẩn tay", loai_hoa_chat: "Sát khuẩn", don_vi_tinh: "Chai 1L", han_su_dung: "2027-06-30", nguong_ton_toi_thieu: 20 },
    { ma_hoa_chat: "HC002", ten_hoa_chat: "Chỉ thị sinh học 3M", loai_hoa_chat: "Chỉ thị", don_vi_tinh: "Hộp 50 ống", han_su_dung: "2026-12-31", nguong_ton_toi_thieu: 5 }
  ],
  "thiet-bi": [
    { ma_thiet_bi: "MAY_HAP_01", ten_thiet_bi: "Máy hấp nhiệt Autoclave 3M", ten_loai_may: "Hấp ướt", ngay_dua_vao_su_dung: "2025-01-10", chu_ky_bao_tri_ngay: 180 },
    { ma_thiet_bi: "MAY_PLASMA_02", ten_thiet_bi: "Máy tiệt khuẩn nhiệt độ thấp Plasma Sterrad", ten_loai_may: "Hấp Plasma", ngay_dua_vao_su_dung: "2025-08-20", chu_ky_bao_tri_ngay: 90 }
  ],
  "nhan-su": [
    { ma_nv: "NV101", ho_ten: "Nguyễn Văn A", email: "nguyenvana@bv103.vn", so_dien_thoai: "0912345678", gioi_tinh: "Nam", ngay_sinh: "1985-04-12", ma_khoa: "KHOA_NGOAI", ma_to: "TO_MO", ten_chuc_vu: "Trưởng khoa", ten_chuc_danh: "PGS.TS. Bác sĩ" },
    { ma_nv: "NV102", ho_ten: "Trần Thị B", email: "tranthib@bv103.vn", so_dien_thoai: "0987654321", gioi_tinh: "Nữ", ngay_sinh: "1992-09-25", ma_khoa: "KHOA_KSNK", ma_to: "TO_CSSD", ten_chuc_vu: "Điều dưỡng trưởng", ten_chuc_danh: "Cử nhân Điều dưỡng" }
  ]
};

/**
 * Generate and export a highly styled Excel Template for Master Data Catalogs.
 */
export async function exportDanhMucTemplate(type: DanhMucType) {
  const columns = TEMPLATE_SPECS[type];
  const dummy = DUMMY_DATA[type];
  if (!columns) return;

  const workbook = new ExcelJS.Workbook();
  const sheetName = type === "khoa-phong" ? "Khoa Phong" : type === "hoa-chat" ? "Hoa Chat" : type === "thiet-bi" ? "Thiet Bi" : "Nhan Su";
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // 1. Title Banner
  const titleText = `BẢNG MẪU NHẬP LIỆU DỰ LIỆU DANH MỤC: ${type.toUpperCase()}`;
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 35;
  const titleCell = titleRow.getCell(1);
  titleCell.value = titleText;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF026F17" } // Emerald green theme
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // 2. Instructions Row
  const instruction = "Ghi chú: Các cột có dấu hoa thị (*) là bắt buộc. Vui lòng không thay đổi cấu trúc/thứ tự các cột. Xóa các dòng mẫu trước khi import.";
  worksheet.mergeCells(2, 1, 2, columns.length);
  const instructionRow = worksheet.getRow(2);
  instructionRow.height = 20;
  const instCell = instructionRow.getCell(1);
  instCell.value = instruction;
  instCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF7F8C8D" } };
  instCell.alignment = { vertical: "middle", horizontal: "left" };

  // 3. Setup Headers
  const headerRow = worksheet.getRow(3);
  headerRow.height = 26;
  
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: col.required ? "FFFF0000" : "FF2C3E50" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" } // Mint green background
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFBDC3C7" } },
      bottom: { style: "medium", color: { argb: "FF026F17" } },
      left: { style: "thin", color: { argb: "FFBDC3C7" } },
      right: { style: "thin", color: { argb: "FFBDC3C7" } }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    
    // Add validation note as tooltip (comment) in cell if exists
    if (col.note) {
      cell.note = {
        texts: [{ text: col.note, font: { size: 9, name: "Arial" } }],
        margins: { inset: [0.1, 0.1, 0.1, 0.1] }
      };
    }

    // Set column properties
    const excelCol = worksheet.getColumn(idx + 1);
    excelCol.width = col.width;
    excelCol.key = col.key;
  });

  // 4. Populate Dummy/Mock Data rows
  dummy.forEach((rowData, rIdx) => {
    const rowNum = 4 + rIdx;
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    
    columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = rowData[col.key];
      cell.font = { name: "Arial", size: 9, color: { argb: "FF555555" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } }
      };
      // Center code columns, align left text
      cell.alignment = { 
        vertical: "middle", 
        horizontal: col.key.startsWith("ma_") || col.key === "email" || col.key === "ngay_sinh" || col.key === "han_su_dung" || col.key === "ngay_dua_vao_su_dung" ? "center" : "left" 
      };
    });
  });

  // 5. Generate and download file using file-saver
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([buffer], { type: fileType });
  const fileName = `Mau_Nhap_Danh_Muc_${type.toUpperCase()}_BV103.xlsx`;
  saveAs(blob, fileName);
}

/**
 * Parses uploaded Excel File on Client-side into JSON array.
 * Robustly normalizes columns to match database keys.
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Tệp tin trống hoặc không thể đọc dữ liệu.");
        }
        
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays, defval: "" preserves empty columns
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        
        if (rawRows.length < 4) {
          throw new Error("Tệp không có dữ liệu nhập liệu. Dòng dữ liệu bắt đầu từ dòng thứ 4.");
        }

        const headers = rawRows[2] as string[]; // Row 3 contains headers (0-indexed 2)
        if (!headers || headers.length === 0) {
          throw new Error("Không tìm thấy dòng tiêu đề cột y tế (dòng số 3).");
        }

        const dataRows = rawRows.slice(3) as any[][];
        
        // Map header labels to database fields based on column indexing
        const mappedData = dataRows
          .filter((row: any[]) => row.some((val: any) => String(val).trim() !== "")) // Filter out empty rows
          .map((row: any[]) => {
            const record: Record<string, any> = {};
            headers.forEach((header, cIdx) => {
              const cleanHeader = String(header || "").trim();
              const dbKey = getDbKeyFromHeader(cleanHeader);
              if (dbKey) {
                let cellVal = row[cIdx];
                
                // Normalize dates parsed as Excel numbers
                if (dbKey.startsWith("ngay_") || dbKey === "han_su_dung" || dbKey === "ngay_sinh") {
                  cellVal = normalizeExcelDate(cellVal);
                }
                
                record[dbKey] = cellVal !== undefined ? String(cellVal).trim() : "";
              }
            });
            return record;
          });

        resolve(mappedData);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("Lỗi đọc tệp Excel."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Maps Excel header labels to DB keys based on regexes.
 */
function getDbKeyFromHeader(header: string): string | null {
  const h = header.toLowerCase();
  
  if (h.includes("mã khoa")) return "ma_khoa";
  if (h.includes("tên khoa")) return "ten_khoa";
  if (h.includes("khối khoa")) return "ten_khoi";
  if (h.includes("mô tả chức năng")) return "mo_ta_chuc_nang";
  if (h.includes("số bác sĩ")) return "so_bac_si";
  if (h.includes("số điều dưỡng")) return "so_dieu_duong";
  if (h.includes("số giường bệnh thường")) return "so_giuong_benh_thuong";
  if (h.includes("số giường cấp cứu")) return "so_giuong_cap_cuu";
  
  if (h.includes("mã hóa chất")) return "ma_hoa_chat";
  if (h.includes("tên hóa chất")) return "ten_hoa_chat";
  if (h.includes("loại hóa chất")) return "loai_hoa_chat";
  if (h.includes("đơn vị tính")) return "don_vi_tinh";
  if (h.includes("hạn sử dụng")) return "han_su_dung";
  if (h.includes("ngưỡng tồn tối thiểu")) return "nguong_ton_toi_thieu";
  
  if (h.includes("mã thiết bị")) return "ma_thiet_bi";
  if (h.includes("tên thiết bị")) return "ten_thiet_bi";
  if (h.includes("loại máy tiệt khuẩn")) return "ten_loai_may";
  if (h.includes("ngày sử dụng")) return "ngay_dua_vao_su_dung";
  if (h.includes("chu kỳ bảo trì")) return "chu_ky_bao_tri_ngay";
  
  if (h.includes("mã nhân viên")) return "ma_nv";
  if (h.includes("họ tên")) return "ho_ten";
  if (h.includes("email")) return "email";
  if (h.includes("số điện thoại")) return "so_dien_thoai";
  if (h.includes("giới tính")) return "gioi_tinh";
  if (h.includes("ngày sinh")) return "ngay_sinh";
  if (h.includes("mã tổ")) return "ma_to";
  if (h.includes("chức vụ")) return "ten_chuc_vu";
  if (h.includes("chức danh")) return "ten_chuc_danh";

  return null;
}

/**
 * Handle Excel Date values which can be loaded as serial numbers.
 */
function normalizeExcelDate(val: any): string {
  if (!val) return "";
  if (typeof val === "number") {
    // Excel base date is Dec 30, 1899 due to leap year bug
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split("T")[0];
  }
  
  const str = String(val).trim();
  // Check if string matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Check if DD/MM/YYYY
  const dmParts = str.split(/[\/\-]/);
  if (dmParts.length === 3) {
    if (dmParts[2].length === 4) {
      // DD/MM/YYYY -> YYYY-MM-DD
      const day = dmParts[0].padStart(2, "0");
      const month = dmParts[1].padStart(2, "0");
      const year = dmParts[2];
      return `${year}-${month}-${day}`;
    } else if (dmParts[0].length === 4) {
      // YYYY/MM/DD
      const year = dmParts[0];
      const month = dmParts[1].padStart(2, "0");
      const day = dmParts[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return str;
}
