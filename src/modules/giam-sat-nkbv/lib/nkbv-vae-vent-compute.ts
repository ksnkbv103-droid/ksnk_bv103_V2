/**
 * Tính VAC từ bảng PEEP/FiO2 tối thiểu theo ngày (CDC/NHSN VAE Ch.10).
 * Ổn định ≥2 ngày → suy giảm ≥2 ngày (PEEP↑≥3 hoặc FiO2↑≥20).
 *
 * Soft Soft 20f / NKBV-L06 (cdc-ch10.txt):
 * - ECMO / HFV / ECLS trọn ngày lịch → loại khỏi baseline/worsening stretch
 * - APRV (và related): chỉ FiO₂ — không PEEP-equivalent
 * Cite: cdc-ch10.txt:126-131 · 1460-1472
 */

export type VaeVentDailyRow = {
  /** YYYY-MM-DD */
  date: string;
  peep_min: number | null;
  /** FiO2 % (21–100), không phải phân số 0–1 */
  fio2_min: number | null;
  /** Full calendar day on ECMO / ECLS — excluded from VAE VAC stretch (Ch.10). */
  on_ecmo?: boolean;
  /** Full calendar day on high-frequency ventilation — excluded (Ch.10). */
  on_hfv?: boolean;
  /** APRV / related mode — FiO₂-only for stability/worsening (Ch.10). */
  on_aprv?: boolean;
};

export type VaeVacComputeResult = {
  has_stable_baseline: boolean;
  peep_increase_ge_3: boolean;
  fio2_increase_ge_20: boolean;
  /** Ngày đầu tiên của giai đoạn suy giảm (= DOE gợi ý) */
  suggested_doe: string | null;
  reason: string;
  /** Days dropped from stretch (ECMO/HFV full-day). */
  excluded_dates?: string[];
};

/** Episode-level defaults applied when a daily row omits the flag (20f). */
export type VaeVentEpisodeModeFlags = {
  on_ecmo?: boolean;
  on_hfv?: boolean;
  on_aprv?: boolean;
  /**
   * Legacy combined checkbox. Soft Soft maps → on_aprv (FiO₂-only), NOT exclude.
   * HFV must use on_hfv. Flag PO G.1#2.
   */
  on_aprv_or_hfv?: boolean;
};

function sortRows(rows: VaeVentDailyRow[]): VaeVentDailyRow[] {
  return [...rows]
    .filter((r) => r.date && (r.peep_min != null || r.fio2_min != null || r.on_ecmo || r.on_hfv || r.on_aprv))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function addOneCalendarDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isCalendarAdjacent(a: string, b: string): boolean {
  return addOneCalendarDay(a) === b;
}

function isExcludedFullDay(row: VaeVentDailyRow): boolean {
  return !!(row.on_ecmo || row.on_hfv);
}

/** Effective PEEP for VAC math — null on APRV days (FiO₂-only per Ch.10). */
function effectivePeep(row: VaeVentDailyRow): number | null {
  if (row.on_aprv) return null;
  return row.peep_min;
}

/** Hai ngày liên tiếp ổn định: PEEP hoặc FiO2 không tăng (APRV → FiO₂ only). */
function isStablePair(a: VaeVentDailyRow, b: VaeVentDailyRow): boolean {
  const peepA = effectivePeep(a);
  const peepB = effectivePeep(b);
  const peepOk = peepA != null && peepB != null && peepB <= peepA;
  const fioOk =
    a.fio2_min != null && b.fio2_min != null && b.fio2_min <= a.fio2_min;
  // APRV on either day → FiO₂ path only (Ch.10 FAQ1)
  if (a.on_aprv || b.on_aprv) return fioOk;
  return peepOk || fioOk;
}

function isWorseningPeep(baseline: number, d1: number, d2: number): boolean {
  return d1 - baseline >= 3 && d2 - baseline >= 3;
}

function isWorseningFio2(baseline: number, d1: number, d2: number): boolean {
  return d1 - baseline >= 20 && d2 - baseline >= 20;
}

/**
 * Apply episode-level mode flags onto daily rows (row flag wins when set).
 * Legacy `on_aprv_or_hfv` → APRV FiO₂-only (not HFV exclude) — PO G.1#2.
 */
export function applyEpisodeModeFlagsToDaily(
  rows: VaeVentDailyRow[],
  episode?: VaeVentEpisodeModeFlags | null,
): VaeVentDailyRow[] {
  if (!episode) return rows;
  const legacyAprv = !!(episode.on_aprv_or_hfv && !episode.on_hfv);
  return rows.map((r) => ({
    ...r,
    on_ecmo: r.on_ecmo ?? !!episode.on_ecmo,
    on_hfv: r.on_hfv ?? !!episode.on_hfv,
    on_aprv: r.on_aprv ?? !!(episode.on_aprv || legacyAprv),
  }));
}

/**
 * Quét chuỗi ngày thở máy — tìm cặp ổn định rồi 2 ngày suy giảm ngay sau.
 * ECMO/HFV full-day rows are removed from the stretch; remaining window must
 * be calendar-adjacent (DoD 20f: mid-stretch ECMO day out).
 */
export function computeVacFromDailyVent(
  rows: VaeVentDailyRow[],
  episode?: VaeVentEpisodeModeFlags | null,
): VaeVacComputeResult {
  const withFlags = applyEpisodeModeFlagsToDaily(rows, episode);
  const sortedAll = sortRows(withFlags);
  const excluded_dates = sortedAll.filter(isExcludedFullDay).map((r) => r.date);
  const sorted = sortedAll.filter((r) => !isExcludedFullDay(r));

  if (sorted.length < 4) {
    return {
      has_stable_baseline: false,
      peep_increase_ge_3: false,
      fio2_increase_ge_20: false,
      suggested_doe: null,
      excluded_dates,
      reason:
        excluded_dates.length > 0
          ? `Sau loại ECMO/HFV trọn ngày (${excluded_dates.join(", ")}): cần ≥4 ngày lịch liền kề đủ PEEP/FiO₂ để đánh giá VAC.`
          : "Cần ≥4 ngày có PEEP hoặc FiO2 tối thiểu để đánh giá VAC.",
    };
  }

  for (let i = 0; i <= sorted.length - 4; i++) {
    const s0 = sorted[i];
    const s1 = sorted[i + 1];
    const w0 = sorted[i + 2];
    const w1 = sorted[i + 3];
    // Stretch must be four consecutive calendar days (gap from ECMO/HFV break).
    if (
      !isCalendarAdjacent(s0.date, s1.date) ||
      !isCalendarAdjacent(s1.date, w0.date) ||
      !isCalendarAdjacent(w0.date, w1.date)
    ) {
      continue;
    }
    if (!isStablePair(s0, s1)) continue;

    const aprvWindow = !!(s0.on_aprv || s1.on_aprv || w0.on_aprv || w1.on_aprv);
    const baselinePeep = effectivePeep(s1);
    const baselineFio = s1.fio2_min;
    const w0Peep = effectivePeep(w0);
    const w1Peep = effectivePeep(w1);

    let peepHit = false;
    let fioHit = false;
    // PEEP path only when none of baseline/worsening days are APRV (effectivePeep null).
    if (
      baselinePeep != null &&
      w0Peep != null &&
      w1Peep != null &&
      isWorseningPeep(baselinePeep, w0Peep, w1Peep)
    ) {
      peepHit = true;
    }
    if (
      baselineFio != null &&
      w0.fio2_min != null &&
      w1.fio2_min != null &&
      isWorseningFio2(baselineFio, w0.fio2_min, w1.fio2_min)
    ) {
      fioHit = true;
    }

    if (peepHit || fioHit) {
      return {
        has_stable_baseline: true,
        peep_increase_ge_3: peepHit,
        fio2_increase_ge_20: fioHit,
        suggested_doe: w0.date,
        excluded_dates,
        reason: `Gợi ý VAC: ổn định ${s0.date}–${s1.date}, suy giảm từ ${w0.date}${
          peepHit ? " (PEEP↑≥3)" : ""
        }${fioHit ? " (FiO2↑≥20%)" : ""}${
          aprvWindow ? " [APRV: FiO₂-only]" : ""
        }${
          excluded_dates.length
            ? ` · đã loại ECMO/HFV: ${excluded_dates.join(", ")}`
            : ""
        }.`,
      };
    }
  }

  return {
    has_stable_baseline: false,
    peep_increase_ge_3: false,
    fio2_increase_ge_20: false,
    suggested_doe: null,
    excluded_dates,
    reason: excluded_dates.length
      ? `Chưa thấy cặp ≥2 ngày ổn định rồi ≥2 ngày suy giảm sau khi loại ECMO/HFV (${excluded_dates.join(", ")}).`
      : "Chưa thấy cặp ≥2 ngày ổn định rồi ≥2 ngày suy giảm PEEP/FiO2 theo CDC.",
  };
}

/** Sinh N dòng trống từ ngày bắt đầu thở máy. */
export function buildEmptyVentDays(startDate: string, count: number): VaeVentDailyRow[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || count < 1) return [];
  const out: VaeVentDailyRow[] = [];
  const d = new Date(`${startDate}T12:00:00`);
  for (let i = 0; i < count; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    out.push({
      date: cur.toISOString().slice(0, 10),
      peep_min: null,
      fio2_min: null,
    });
  }
  return out;
}
