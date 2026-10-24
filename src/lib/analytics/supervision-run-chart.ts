/**
 * Run chart (Provost & Murray): đường trung vị + hai quy tắc tín hiệu không ngẫu nhiên.
 * - Chuỗi lệch (shift): ≥ 6 điểm liên tiếp cùng một phía trung vị (điểm đúng trung vị bị bỏ qua, không cắt chuỗi).
 * - Xu hướng (trend): ≥ 5 điểm liên tiếp cùng tăng hoặc cùng giảm (điểm bằng nhau bị bỏ qua).
 * Cần ≥ RUN_CHART_MIN_POINTS điểm mới đọc tín hiệu. Chỉ để đọc nhanh, không đổi công thức tỷ lệ.
 */

export const RUN_CHART_MIN_POINTS = 8;
export const RUN_CHART_SHIFT_LEN = 6;
export const RUN_CHART_TREND_LEN = 5;

export type RunChartSignal = {
  kind: "shift" | "trend";
  direction: "up" | "down";
  /** Chỉ số điểm đầu/cuối (0-based, trên mảng đầu vào) của chuỗi tín hiệu. */
  from: number;
  to: number;
};

export type RunChartResult = {
  median: number;
  signals: RunChartSignal[];
};

export function medianOf(values: readonly number[]): number | null {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** `values` đã bỏ kỳ không có mẫu; null nếu chưa đủ điểm. Chuỗi dài hơn ngưỡng trả về MỘT tín hiệu bao trọn chuỗi. */
export function analyzeRunChart(values: readonly number[]): RunChartResult | null {
  if (values.length < RUN_CHART_MIN_POINTS) return null;
  const median = medianOf(values);
  if (median == null) return null;
  const signals: RunChartSignal[] = [];

  // Chuỗi lệch: bỏ qua điểm đúng trung vị, giữ chỉ số gốc để đánh dấu.
  let side = 0;
  let start = -1;
  let last = -1;
  let count = 0;
  const flushShift = () => {
    if (count >= RUN_CHART_SHIFT_LEN) {
      signals.push({ kind: "shift", direction: side > 0 ? "up" : "down", from: start, to: last });
    }
  };
  values.forEach((x, i) => {
    const s = Math.sign(x - median);
    if (s === 0) return;
    if (s === side) {
      count += 1;
      last = i;
    } else {
      flushShift();
      side = s;
      start = i;
      last = i;
      count = 1;
    }
  });
  flushShift();

  // Xu hướng: chuỗi các bước cùng dấu; bước = 0 bị bỏ qua.
  let dir = 0;
  let tStart = 0;
  let tLast = 0;
  let steps = 1; // số điểm trong chuỗi
  let prevIdx = 0;
  const flushTrend = () => {
    if (steps >= RUN_CHART_TREND_LEN) {
      signals.push({ kind: "trend", direction: dir > 0 ? "up" : "down", from: tStart, to: tLast });
    }
  };
  for (let i = 1; i < values.length; i += 1) {
    const d = Math.sign(values[i] - values[prevIdx]);
    if (d === 0) continue;
    if (d === dir) {
      steps += 1;
      tLast = i;
    } else {
      flushTrend();
      dir = d;
      tStart = prevIdx;
      tLast = i;
      steps = 2;
    }
    prevIdx = i;
  }
  flushTrend();

  return { median, signals };
}

/** Câu đọc nhanh bằng tiếng Việt cho từng tín hiệu; `unit` = «tuần», «tháng»… */
export function describeRunSignal(s: RunChartSignal, unit: string): string {
  const n = s.to - s.from + 1;
  if (s.kind === "shift") {
    return `${n} ${unit} liên tiếp ${s.direction === "up" ? "trên" : "dưới"} đường trung vị — thay đổi có hệ thống, không phải dao động ngẫu nhiên.`;
  }
  return `${n} ${unit} liên tiếp ${s.direction === "up" ? "tăng" : "giảm"} — có xu hướng, không phải dao động ngẫu nhiên.`;
}
