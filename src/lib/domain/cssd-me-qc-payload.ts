import type { CssdSterilizerKind } from "./cssd-sterilizer-kind";

export type MeTietKhuanPassFields = {
  nguoiUnload?: string;
  nhietDo?: string;
  thongSoMay?: string;
  chiThiTiepXuc?: string;
  chiThiDaThongSo?: string;
  testSinhHoc?: string;
  testBI?: string;
  testCI?: string;
  testBD?: string;
  anhMinhChungMay?: string;
  anhMinhChungTiepXuc?: string;
  anhMinhChungDaThongSo?: string;
  anhMinhChungSinhHoc?: string;
  anhMinhChungBowieDick?: string;
};

function normTri(v: string | undefined): string {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function hasPhoto(v: string | undefined): boolean {
  return Boolean(String(v || "").trim());
}

/**
 * Khớp form QC mẻ: Steam bắt buộc đa thông số; Plasma/EO bắt buộc CI, không bắt đa thông số.
 */
export function validateMeTietKhuanPassPayload(
  p: MeTietKhuanPassFields,
  kind: CssdSterilizerKind,
): string | null {
  if (!String(p.nguoiUnload || "").trim()) return "Thiếu người dỡ mẻ.";
  if (!String(p.nhietDo || "").trim()) return "Thiếu ghi nhận nhiệt độ / áp suất.";
  if (!String(p.thongSoMay || "").trim()) return "Thiếu thông số máy.";
  if (normTri(p.thongSoMay) === "[KHONG_DAT]") return "Thông số máy không đạt — không thể kết luận mẻ đạt.";
  if (!hasPhoto(p.anhMinhChungMay)) return "Thiếu ảnh minh chứng thông số máy.";

  if (normTri(p.chiThiTiepXuc) !== "DAT") return "Chỉ thị tiếp xúc phải ĐẠT để kết luận mẻ đạt.";
  if (!hasPhoto(p.anhMinhChungTiepXuc)) return "Thiếu ảnh chỉ thị tiếp xúc.";

  const bio = normTri(p.testSinhHoc) || normTri(p.testBI) || "NA";
  if (bio === "KHONG_DAT") return "Test sinh học không đạt — không thể kết luận mẻ đạt.";
  if (bio === "DAT" && !hasPhoto(p.anhMinhChungSinhHoc)) return "Thiếu ảnh minh chứng test sinh học.";

  if (kind === "STEAM") {
    if (normTri(p.chiThiDaThongSo) !== "DAT") {
      return "Chỉ thị đa thông số phải ĐẠT để kết luận mẻ đạt (máy hơi nước).";
    }
    if (!hasPhoto(p.anhMinhChungDaThongSo)) return "Thiếu ảnh chỉ thị đa thông số.";
    const bd = normTri(p.testBD) || "NA";
    if (bd === "KHONG_DAT") return "Bowie–Dick không đạt — không thể kết luận mẻ đạt.";
    if (bd === "DAT" && !hasPhoto(p.anhMinhChungBowieDick)) return "Thiếu ảnh minh chứng Bowie–Dick.";
    return null;
  }

  if (normTri(p.testCI) !== "DAT") {
    return "Chỉ thị hóa học (CI) phải ĐẠT để kết luận mẻ đạt (máy EO/Plasma).";
  }
  if (!hasPhoto(p.anhMinhChungDaThongSo)) return "Thiếu ảnh chỉ thị hóa học (CI).";
  return null;
}
