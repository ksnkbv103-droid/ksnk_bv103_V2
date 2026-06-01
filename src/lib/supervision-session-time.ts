/** Chỉ “giám sát lại qua camera” — mới cần block Ngày + Từ giờ + Đến giờ ở đầu phiên (GSC + VST). */
const REPLAY_CAMERA_CACH_THUC_GIAM_SAT = "Giám sát lại qua camera";

export function isReplayCameraSupervisionCachThuc(cachThuc: string | null | undefined): boolean {
  return String(cachThuc ?? "").trim() === REPLAY_CAMERA_CACH_THUC_GIAM_SAT;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Ghép YYYY-MM-DD + HH:mm (local) → ISO UTC. */
export function combineLocalNgayAndTime(ngayYmd: string, timeHm: string): string | undefined {
  const t = timeHm.trim();
  if (!ngayYmd || !/^\d{4}-\d{2}-\d{2}$/.test(ngayYmd) || !t) return undefined;
  const [y, mo, d] = ngayYmd.split("-").map((x) => parseInt(x, 10));
  const parts = t.split(":");
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const ss = parseInt(parts[2] || "0", 10);
  if ([y, mo, d, hh, mm, ss].some((n) => Number.isNaN(n))) return undefined;
  return new Date(y, mo - 1, d, hh, mm, ss, 0).toISOString();
}

/** Hiển thị input type=time từ chuỗi ISO (giờ local). */
export function timeLocalHmFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
