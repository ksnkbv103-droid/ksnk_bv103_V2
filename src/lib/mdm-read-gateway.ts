/**
 * Neutral read API for supervision modules → MDM / bảng kiểm.
 * GSC/VST/NKBV import from here instead of `giam-sat-chung/bang-kiem/actions` directly.
 */
export {
  getBangKiemByMaOrIdForGscLookup,
  getBangKiemsForGiamSat,
  getTieuChisForGiamSatChung,
} from "@/modules/giam-sat-chung/bang-kiem/actions/bang-kiem-read.actions";
