/** Deep link QLCV từ analytics — consumer: QuanLyCongViecPage (?from=analytics). */

export function buildQlcvAnalyticsDeepLink(opts: {
  topic: string;
  gap: string;
  khoaLabel?: string;
  bkLabel?: string;
}): string {
  const q = new URLSearchParams();
  q.set("from", "analytics");
  q.set("topic", opts.topic);
  q.set("gap", opts.gap);
  if (opts.khoaLabel?.trim()) q.set("khoa", opts.khoaLabel.trim());
  if (opts.bkLabel?.trim()) q.set("bk", opts.bkLabel.trim());
  return `/quan-ly-cong-viec?${q.toString()}`;
}
