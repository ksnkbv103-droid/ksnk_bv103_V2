import { dinhKyMatchDueOnDate, parseIsoDateOnlyUtc, type QlcvMaChuKyDinhKy } from "./qlcv-dinh-ky-schedule";
import { formatIsoDateOnlyUtc, type QlcvPeriodRange } from "./qlcv-period-range";

export type DinhKyMauForPeriod = {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  ma_chu_ky: QlcvMaChuKyDinhKy;
  ngay_bat_dau: string;
  is_active: boolean;
  muc_do_uu_tien?: string | null;
  vi_tri_thuc_hien?: string | null;
  gio_bat_dau?: string | null;
  gio_ket_thuc?: string | null;
  dia_diem_khoa_id?: string | null;
  nhiem_vu_id?: string | null;
  moc_id?: string | null;
};

/** Các ngày trong kỳ mà mẫu sẽ (hoặc đã) đến hạn sinh phiếu. */
export function spawnDatesInPeriod(
  mau: Pick<DinhKyMauForPeriod, "ma_chu_ky" | "ngay_bat_dau">,
  period: QlcvPeriodRange,
): string[] {
  const start = parseIsoDateOnlyUtc(period.startIso);
  const end = parseIsoDateOnlyUtc(period.endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const day = new Date(t);
    if (dinhKyMatchDueOnDate(mau.ma_chu_ky, mau.ngay_bat_dau, day)) {
      out.push(formatIsoDateOnlyUtc(day));
    }
  }
  return out;
}

function mauHasSpawnInPeriod(mau: DinhKyMauForPeriod, period: QlcvPeriodRange): boolean {
  if (!mau.is_active) return false;
  return spawnDatesInPeriod(mau, period).length > 0;
}

export function filterMauDueInPeriod(maus: DinhKyMauForPeriod[], period: QlcvPeriodRange): DinhKyMauForPeriod[] {
  return maus.filter((m) => mauHasSpawnInPeriod(m, period));
}
