/**
 * Domain thuần cho Quản lý Chất thải Y tế & Đồ vải Y tế.
 * 9 con số cốt lõi và các gợi ý phân tích xu hướng KSNK.
 */

import {
  type LoaiMucSoCan,
  type SoCanRow,
  type SuCoRow,
  type NgayGiuongRow,
  type ThongKeKyHauCan,
} from "../types";

export interface CanhBaoGoiY {
  muc: "NGUY_CO_CAO" | "CANH_BAO" | "THONG_TIN";
  noiDung: string;
  phanHe: "CHAT_THAI" | "DO_VAI";
}

/**
 * Tính toán thống kê kỳ từ danh sách dòng cân, ngày giường và sự cố.
 */
export function computeThongKeKyHauCan(
  soCanRows: SoCanRow[],
  ngayGiuongRows: NgayGiuongRow[],
  suCoRows: SuCoRow[],
  tuNgay: string,
  denNgay: string
): ThongKeKyHauCan {
  const dTu = new Date(tuNgay);
  const dDen = new Date(denNgay);
  const diffTime = Math.max(0, dDen.getTime() - dTu.getTime());
  const so_ngay_ky = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let kg_sac_nhon = 0;
  let kg_con_lai = 0;
  let kg_thong_thuong = 0;
  let kg_ban_thuong = 0;
  let kg_ban_lay_nhiem = 0;
  let kg_sach_ve = 0;

  const activeDates = new Set<string>();

  for (const r of soCanRows) {
    if (!r.is_active) continue;
    if (r.ngay_can >= tuNgay && r.ngay_can <= denNgay) {
      activeDates.add(r.ngay_can);
      const val = Number(r.khoi_luong_kg) || 0;
      switch (r.loai_muc) {
        case "CT_LAY_NHIEM_SAC_NHON":
          kg_sac_nhon += val;
          break;
        case "CT_LAY_NHIEM_CON_LAI":
          kg_con_lai += val;
          break;
        case "CT_THONG_THUONG":
          kg_thong_thuong += val;
          break;
        case "DO_VAI_BAN_THUONG":
          kg_ban_thuong += val;
          break;
        case "DO_VAI_BAN_LAY_NHIEM":
          kg_ban_lay_nhiem += val;
          break;
        case "DO_VAI_SACH_VE":
          kg_sach_ve += val;
          break;
      }
    }
  }

  const so_ngay_co_du_lieu = activeDates.size;
  const ty_le_day_du_pct =
    so_ngay_ky > 0 ? Math.round((so_ngay_co_du_lieu / so_ngay_ky) * 1000) / 10 : 0;

  // Chất thải
  const tong_ctln_kg = Math.round((kg_sac_nhon + kg_con_lai) * 100) / 100;
  const tong_chat_thai_kg = Math.round((tong_ctln_kg + kg_thong_thuong) * 100) / 100;
  const ty_le_ctln_pct =
    tong_chat_thai_kg > 0 ? Math.round((tong_ctln_kg / tong_chat_thai_kg) * 10000) / 100 : 0;

  // Đồ vải
  const tong_ban_kg = Math.round((kg_ban_thuong + kg_ban_lay_nhiem) * 100) / 100;
  const ty_le_ban_ln_pct =
    tong_ban_kg > 0 ? Math.round((kg_ban_lay_nhiem / tong_ban_kg) * 10000) / 100 : 0;
  const chenh_lech_kg = Math.round((tong_ban_kg - kg_sach_ve) * 100) / 100;
  const ty_le_chenh_lech_pct =
    tong_ban_kg > 0 ? Math.round((chenh_lech_kg / tong_ban_kg) * 10000) / 100 : 0;

  // Mẫu số ngày giường
  let tong_ngay_giuong = 0;
  for (const g of ngayGiuongRows) {
    tong_ngay_giuong += Number(g.so_ngay_giuong) || 0;
  }

  const chat_thai_per_1000_ngay_giuong =
    tong_ngay_giuong > 0 ? Math.round((tong_chat_thai_kg / tong_ngay_giuong) * 100000) / 100 : 0;

  const do_vai_per_1000_ngay_giuong =
    tong_ngay_giuong > 0 ? Math.round((tong_ban_kg / tong_ngay_giuong) * 100000) / 100 : 0;

  // Sự cố
  let so_su_co_ct = 0;
  let so_su_co_dv = 0;
  let so_su_co_sac_nhon = 0;

  for (const s of suCoRows) {
    if (!s.is_active) continue;
    if (s.ngay_ghi_nhan >= tuNgay && s.ngay_ghi_nhan <= denNgay) {
      if (s.phan_he === "CHAT_THAI") so_su_co_ct++;
      if (s.phan_he === "DO_VAI") so_su_co_dv++;
      if (s.loai_su_co === "LAN_SAC_NHON_DO_VAI") so_su_co_sac_nhon++;
    }
  }

  return {
    tu_ngay: tuNgay,
    den_ngay: denNgay,
    so_ngay_ky,
    so_ngay_co_du_lieu,
    ty_le_day_du_pct,
    tong_ngay_giuong,
    chat_thai: {
      kg_sac_nhon: Math.round(kg_sac_nhon * 100) / 100,
      kg_con_lai: Math.round(kg_con_lai * 100) / 100,
      kg_thong_thuong: Math.round(kg_thong_thuong * 100) / 100,
      tong_ctln_kg,
      tong_chat_thai_kg,
      ty_le_ctln_pct,
      chat_thai_per_1000_ngay_giuong,
      so_su_co: so_su_co_ct,
    },
    do_vai: {
      kg_ban_thuong: Math.round(kg_ban_thuong * 100) / 100,
      kg_ban_lay_nhiem: Math.round(kg_ban_lay_nhiem * 100) / 100,
      tong_ban_kg,
      ty_le_ban_ln_pct,
      kg_sach_ve: Math.round(kg_sach_ve * 100) / 100,
      chenh_lech_kg,
      ty_le_chenh_lech_pct,
      do_vai_per_1000_ngay_giuong,
      so_su_co_chung: so_su_co_dv,
      so_su_co_sac_nhon,
    },
  };
}

/**
 * Sinh gợi ý hành động KSNK từ các con số định lượng (theo Mục 4 Kế hoạch).
 */
export function generateInsightsHauCan(stats: ThongKeKyHauCan): CanhBaoGoiY[] {
  const insights: CanhBaoGoiY[] = [];

  // 1. Cảnh báo an toàn sinh học tối khẩn: Lẫn vật sắc nhọn trong đồ vải
  if (stats.do_vai.so_su_co_sac_nhon > 0) {
    insights.push({
      muc: "NGUY_CO_CAO",
      phanHe: "DO_VAI",
      noiDung: `Ghi nhận ${stats.do_vai.so_su_co_sac_nhon} sự cố lẫn vật sắc nhọn trong đồ vải bẩn. Cần kiểm tra khoa phát sinh, rà soát khâu kiểm đếm săng mổ/buồng thủ thuật để ngăn ngừa phơi nhiễm nghề nghiệp.`,
    });
  }

  // 2. Cảnh báo tỷ lệ chất thải lây nhiễm tăng cao
  if (stats.chat_thai.ty_le_ctln_pct > 25) {
    insights.push({
      muc: "CANH_BAO",
      phanHe: "CHAT_THAI",
      noiDung: `Tỷ lệ chất thải lây nhiễm chiếm ${stats.chat_thai.ty_le_ctln_pct}% tổng CTYT (mức cảnh báo > 20-25%). Có dấu hiệu lẫn rác sinh hoạt vào thùng vàng, cần tăng cường giám sát QT.11.BM.01 tại các khoa phát sinh nhiều.`,
    });
  }

  // 3. Cảnh báo chênh lệch đồ vải bẩn đi và sạch về
  if (Math.abs(stats.do_vai.ty_le_chenh_lech_pct) > 15 && stats.do_vai.tong_ban_kg > 0) {
    insights.push({
      muc: "CANH_BAO",
      phanHe: "DO_VAI",
      noiDung: `Chênh lệch đồ vải bẩn đi và sạch về là ${stats.do_vai.ty_le_chenh_lech_pct}% (${stats.do_vai.chenh_lech_kg} kg). Cần đối chiếu sổ giao nhận hàng ngày giữa các khoa lâm sàng và ĐVGL.`,
    });
  }

  // 4. Nhắc nhở độ đầy đủ dữ liệu
  if (stats.ty_le_day_du_pct < 70 && stats.so_ngay_ky >= 7) {
    insights.push({
      muc: "THONG_TIN",
      phanHe: "CHAT_THAI",
      noiDung: `Độ đầy đủ dữ liệu ghi nhận đạt ${stats.ty_le_day_du_pct}% (${stats.so_ngay_co_du_lieu}/${stats.so_ngay_ky} ngày). Cần duy trì ghi sổ cân hàng ngày tại nhà rác và ĐVGL để số liệu có độ tin cậy cao.`,
    });
  }

  return insights;
}
