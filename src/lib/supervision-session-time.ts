/** Xem lại băng hình — nhập ngày + Từ/Đến giờ một lần cho cả phiên (GSC + VST). */
export const REPLAY_CAMERA_CACH_THUC_GIAM_SAT = "Giám sát lại qua camera";

/** Trực tiếp qua camera thời thực — không bắt buộc khung giờ đầu phiên; ghi nhận thời điểm theo từng cơ hội như tại chỗ. */
export const LIVE_CAMERA_CACH_THUC_GIAM_SAT = "Giám sát trực tiếp qua camera";

export const CAMERA_CACH_THUC_GIAM_SAT = new Set([
  LIVE_CAMERA_CACH_THUC_GIAM_SAT,
  REPLAY_CAMERA_CACH_THUC_GIAM_SAT,
]);

/** Trực tiếp hoặc xem lại qua camera (cả hai đều là “camera”). */
export function isCameraSupervisionCachThuc(cachThuc: string | null | undefined): boolean {
  const c = String(cachThuc ?? "").trim();
  return CAMERA_CACH_THUC_GIAM_SAT.has(c);
}

/** Chỉ “giám sát lại” — mới cần block Ngày + Từ giờ + Đến giờ ở đầu phiên. */
export function isReplayCameraSupervisionCachThuc(cachThuc: string | null | undefined): boolean {
  return String(cachThuc ?? "").trim() === REPLAY_CAMERA_CACH_THUC_GIAM_SAT;
}

/** Trực tiếp qua camera (không phải xem lại băng). */
export function isLiveCameraSupervisionCachThuc(cachThuc: string | null | undefined): boolean {
  return String(cachThuc ?? "").trim() === LIVE_CAMERA_CACH_THUC_GIAM_SAT;
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
