/** Deep link QLCV từ analytics — consumer: QuanLyCongViecPage (?from=analytics). */

export type QlcvAnalyticsMeta = {
  chi_so?: string | null;
  khoa_id?: string | null;
  ky_do_lai?: string | null;
  /** Giá trị chỉ số lúc mở việc — dùng tính Δ sau ky_do_lai. */
  gia_tri_luc_tao?: number | null;
};

export function buildQlcvAnalyticsDeepLink(opts: {
  topic: string;
  gap: string;
  khoaLabel?: string;
  bkLabel?: string;
  /** Mở sẵn form tạo việc (mặc định true). */
  openCreate?: boolean;
  /** PDCA: chỉ số SSOT cần đo lại. */
  chiSo?: string | null;
  khoaId?: string | null;
  /** ISO date YYYY-MM-DD. */
  kyDoLai?: string | null;
  giaTriLucTao?: number | null;
}): string {
  const q = new URLSearchParams();
  q.set("from", "analytics");
  q.set("topic", opts.topic);
  q.set("gap", opts.gap);
  if (opts.khoaLabel?.trim()) q.set("khoa", opts.khoaLabel.trim());
  if (opts.bkLabel?.trim()) q.set("bk", opts.bkLabel.trim());
  if (opts.openCreate !== false) q.set("create", "1");
  if (opts.chiSo?.trim()) q.set("chi_so", opts.chiSo.trim());
  if (opts.khoaId?.trim()) q.set("khoa_id", opts.khoaId.trim());
  if (opts.kyDoLai?.trim()) q.set("ky_do_lai", opts.kyDoLai.trim());
  if (opts.giaTriLucTao != null && Number.isFinite(opts.giaTriLucTao)) {
    q.set("gia_tri_luc_tao", String(opts.giaTriLucTao));
  }
  return `/quan-ly-cong-viec?${q.toString()}`;
}

/** Tiêu đề / mô tả gợi ý khi tạo việc từ analytics. */
export function buildQlcvAnalyticsPrefill(opts: {
  topic?: string | null;
  gap?: string | null;
  khoa?: string | null;
  bk?: string | null;
  chiSo?: string | null;
  kyDoLai?: string | null;
  giaTriLucTao?: number | null;
}): { tieu_de: string; mo_ta: string; analytics_meta: QlcvAnalyticsMeta } {
  const topic = opts.topic?.trim() || "Theo dõi từ thống kê";
  const gap = opts.gap?.trim();
  const khoa = opts.khoa?.trim();
  const bk = opts.bk?.trim();
  const chiSo = opts.chiSo?.trim() || null;
  const kyDoLai = opts.kyDoLai?.trim() || null;
  const giaTri =
    opts.giaTriLucTao != null && Number.isFinite(opts.giaTriLucTao) ? Number(opts.giaTriLucTao) : null;
  const tieu_de = [topic, khoa ? `· ${khoa}` : "", gap ? `· ${gap}` : ""]
    .join("")
    .slice(0, 180);
  const mo_ta = [
    "Việc tạo từ thống kê / báo cáo KSNK.",
    gap ? `Trạng thái: ${gap}.` : "",
    khoa ? `Khoa: ${khoa}.` : "",
    bk ? `BK thiếu / liên quan: ${bk}.` : "",
    chiSo ? `Chỉ số theo dõi: ${chiSo}.` : "",
    kyDoLai ? `Kỳ đo lại dự kiến: ${kyDoLai}.` : "",
    giaTri != null ? `Giá trị lúc mở việc: ${giaTri}.` : "",
    "Đề nghị phân công theo dõi và cập nhật kết quả trên board QLCV.",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    tieu_de,
    mo_ta,
    analytics_meta: {
      chi_so: chiSo,
      ky_do_lai: kyDoLai,
      gia_tri_luc_tao: giaTri,
    },
  };
}
