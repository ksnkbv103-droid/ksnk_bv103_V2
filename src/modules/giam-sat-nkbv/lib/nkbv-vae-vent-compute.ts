/**
 * Tính VAC từ bảng PEEP/FiO2 tối thiểu theo ngày (CDC/NHSN VAE).
 * Ổn định ≥2 ngày → suy giảm ≥2 ngày (PEEP↑≥3 hoặc FiO2↑≥20).
 */

export type VaeVentDailyRow = {
  /** YYYY-MM-DD */
  date: string;
  peep_min: number | null;
  /** FiO2 % (21–100), không phải phân số 0–1 */
  fio2_min: number | null;
};

export type VaeVacComputeResult = {
  has_stable_baseline: boolean;
  peep_increase_ge_3: boolean;
  fio2_increase_ge_20: boolean;
  /** Ngày đầu tiên của giai đoạn suy giảm (= DOE gợi ý) */
  suggested_doe: string | null;
  reason: string;
};

function sortRows(rows: VaeVentDailyRow[]): VaeVentDailyRow[] {
  return [...rows]
    .filter((r) => r.date && (r.peep_min != null || r.fio2_min != null))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Hai ngày liên tiếp ổn định: PEEP hoặc FiO2 không tăng. */
function isStablePair(a: VaeVentDailyRow, b: VaeVentDailyRow): boolean {
  const peepOk =
    a.peep_min != null && b.peep_min != null && b.peep_min <= a.peep_min;
  const fioOk =
    a.fio2_min != null && b.fio2_min != null && b.fio2_min <= a.fio2_min;
  return peepOk || fioOk;
}

function isWorseningPeep(baseline: number, d1: number, d2: number): boolean {
  return d1 - baseline >= 3 && d2 - baseline >= 3;
}

function isWorseningFio2(baseline: number, d1: number, d2: number): boolean {
  return d1 - baseline >= 20 && d2 - baseline >= 20;
}

/**
 * Quét chuỗi ngày thở máy — tìm cặp ổn định rồi 2 ngày suy giảm ngay sau.
 */
export function computeVacFromDailyVent(rows: VaeVentDailyRow[]): VaeVacComputeResult {
  const sorted = sortRows(rows);
  if (sorted.length < 4) {
    return {
      has_stable_baseline: false,
      peep_increase_ge_3: false,
      fio2_increase_ge_20: false,
      suggested_doe: null,
      reason: "Cần ≥4 ngày có PEEP hoặc FiO2 tối thiểu để đánh giá VAC.",
    };
  }

  for (let i = 0; i <= sorted.length - 4; i++) {
    const s0 = sorted[i];
    const s1 = sorted[i + 1];
    const w0 = sorted[i + 2];
    const w1 = sorted[i + 3];
    if (!isStablePair(s0, s1)) continue;

    const baselinePeep = s1.peep_min;
    const baselineFio = s1.fio2_min;

    let peepHit = false;
    let fioHit = false;
    if (
      baselinePeep != null &&
      w0.peep_min != null &&
      w1.peep_min != null &&
      isWorseningPeep(baselinePeep, w0.peep_min, w1.peep_min)
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
        reason: `Gợi ý VAC: ổn định ${s0.date}–${s1.date}, suy giảm từ ${w0.date}${
          peepHit ? " (PEEP↑≥3)" : ""
        }${fioHit ? " (FiO2↑≥20%)" : ""}.`,
      };
    }
  }

  return {
    has_stable_baseline: false,
    peep_increase_ge_3: false,
    fio2_increase_ge_20: false,
    suggested_doe: null,
    reason: "Chưa thấy cặp ≥2 ngày ổn định rồi ≥2 ngày suy giảm PEEP/FiO2 theo CDC.",
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
