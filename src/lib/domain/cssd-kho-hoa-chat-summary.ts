/** Tổng hợp tồn theo mặt hàng cho tab «Tồn kho» (thuần, không I/O). */
import { isLotNearExpiry } from "./cssd-kho-hoa-chat-fefo";

export type DmLite = {
  id: string;
  ma_hoa_chat: string;
  ten_hoa_chat: string;
  don_vi_tinh: string | null;
  nguong_ton_toi_thieu: number | null;
  loai_hoa_chat: string | null;
};

export type LotLite = { dm_hoa_chat_id: string; han_su_dung: string | null; ton_so_luong: number };

export type DmStockSummary = DmLite & {
  tong_ton: number;
  han_gan_nhat: string | null;
  duoi_dinh_muc: boolean;
  qua_han: boolean;
  sap_het_han: boolean;
};

export function buildDmStockSummary(dms: DmLite[], lots: LotLite[], todayYmd: string): DmStockSummary[] {
  return dms.map((dm) => {
    let tong = 0;
    let han: string | null = null;
    for (const l of lots) {
      if (l.dm_hoa_chat_id !== dm.id || l.ton_so_luong <= 0) continue;
      tong += l.ton_so_luong;
      if (l.han_su_dung && (!han || l.han_su_dung < han)) han = l.han_su_dung;
    }
    const quaHan = Boolean(han && han < todayYmd);
    return {
      ...dm,
      tong_ton: tong,
      han_gan_nhat: han,
      duoi_dinh_muc: dm.nguong_ton_toi_thieu != null && tong <= dm.nguong_ton_toi_thieu,
      qua_han: quaHan,
      sap_het_han: !quaHan && isLotNearExpiry(han, todayYmd),
    };
  });
}
