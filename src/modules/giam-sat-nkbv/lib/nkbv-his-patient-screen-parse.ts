/**
 * Parse OCR / text copy từ màn «Thông tin bệnh nhân» HIS (BV103)
 * → 1 dòng NkbvBenhAnTemplateRow để nạp cổng import BA.
 *
 * Không lưu PHI; chỉ chuẩn hóa nhãn → field nội bộ.
 */
import {
  normalizeBenhAnDate,
  type NkbvBenhAnTemplateRow,
} from "./nkbv-benh-an-template";

export type ParseHisPatientScreenResult =
  | { ok: true; row: NkbvBenhAnTemplateRow; missing: string[]; warnings: string[] }
  | { ok: false; error: string; missing: string[]; partial?: Partial<NkbvBenhAnTemplateRow> };

function fold(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lấy giá trị sau nhãn (cùng dòng hoặc dòng kế). */
function extractAfterLabel(text: string, labelPatterns: RegExp[]): string {
  const lines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const folded = fold(line);
    for (const re of labelPatterns) {
      const m = line.match(re) || folded.match(re);
      if (!m) continue;
      let val = (m[1] || "").trim();
      if (!val && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        // Tránh lấy nhãn kế tiếp làm value
        if (!/^(ma |mã |ngay |ngày |gioi |giới |ten |tên |khoa |dia |địa )/i.test(fold(next))) {
          val = next;
        }
      }
      if (val) return val.replace(/^[:.\-\s]+/, "").trim();
    }
  }

  // Fallback: nhãn ... giá trị trên cùng chuỗi (OCR dồn 1 dòng)
  const flat = text.replace(/\s+/g, " ");
  for (const re of labelPatterns) {
    const m = flat.match(re);
    if (m?.[1]) return m[1].replace(/^[:.\-\s]+/, "").trim();
  }
  return "";
}

function firstKhoaSegment(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  // "Khoa Truyền Nhiễm > PĐT A05 > Buồng 3.10" → Khoa Truyền Nhiễm
  return t.split(/>|›|»|\|/)[0].trim();
}

function normalizeGioiTinh(raw: string): string | undefined {
  const f = fold(raw);
  if (!f) return undefined;
  if (/\bnu\b|\bnữ\b|female|f\b/.test(f)) return "Nữ";
  if (/\bnam\b|male|\bm\b/.test(f)) return "Nam";
  return raw.trim();
}

/**
 * Parse text OCR từ form HIS thông tin BN.
 * Ưu tiên: Mã HSBA = ma_benh_an; Mã BN = ma_benh_nhan.
 */
export function parseHisPatientScreenText(raw: string): ParseHisPatientScreenResult {
  const text = String(raw || "").trim();
  if (text.length < 20) {
    return { ok: false, error: "Text OCR quá ngắn — chụp lại rõ hơn hoặc dán text.", missing: [] };
  }

  const maHsba = extractAfterLabel(text, [
    /m[aã]\s*hsba\s*[:.\-]?\s*([A-Za-z0-9\/\-]+)/i,
    /ma\s*hsba\s*[:.\-]?\s*([A-Za-z0-9\/\-]+)/i,
    /s[oố]\s*h[oồ]\s*s[oơ]\s*b[eệ]nh\s*[aá]n\s*[:.\-]?\s*([A-Za-z0-9\/\-]+)/i,
  ]);

  const maBn = extractAfterLabel(text, [
    /m[aã]\s*bn\s*[:.\-]?\s*([0-9]{5,})/i,
    /ma\s*bn\s*[:.\-]?\s*([0-9]{5,})/i,
    /m[aã]\s*b[eệ]nh\s*nh[aâ]n\s*[:.\-]?\s*([0-9]{5,})/i,
  ]);

  const hoTen = extractAfterLabel(text, [
    /t[eê]n\s*b[eệ]nh\s*nh[aâ]n\s*[:.\-]?\s*([A-ZÀ-Ỵ][^\n|]{2,80})/i,
    /h[oọ]\s*(v[aà]\s*)?t[eê]n\s*[:.\-]?\s*([A-ZÀ-Ỵ][^\n|]{2,80})/i,
  ]);
  // second capture group for họ tên pattern
  let ho_ten_benh_nhan = hoTen;
  const ht2 = text.match(/h[oọ]\s*(?:v[aà]\s*)?t[eê]n\s*[:.\-]?\s*([A-ZÀ-Ỵ][^\n|]{2,80})/i);
  if ((!ho_ten_benh_nhan || ho_ten_benh_nhan.length < 3) && ht2?.[1]) {
    ho_ten_benh_nhan = ht2[1].trim();
  }
  // strip trailing age noise "PHẠM THANH BÌNH 49"
  ho_ten_benh_nhan = ho_ten_benh_nhan.replace(/\s+\d{1,3}\s*$/, "").trim();

  const ngayVaoRaw = extractAfterLabel(text, [
    /ng[aà]y\s*v[aà]o\s*[:.\-]?\s*([^\n]{6,40})/i,
    /ngay\s*vao\s*(vien)?\s*[:.\-]?\s*([^\n]{6,40})/i,
  ]);
  const ngaySinhRaw = extractAfterLabel(text, [
    /ng[aà]y\s*sinh\s*[:.\-]?\s*([^\n]{6,40})/i,
    /ngay\s*sinh\s*[:.\-]?\s*([^\n]{6,40})/i,
  ]);
  const ngayRaRaw = extractAfterLabel(text, [
    /ng[aà]y\s*ra(?:\s*vi[eệ]n)?\s*[:.\-]?\s*([^\n]{0,40})/i,
    /ngay\s*ra(?:\s*vien)?\s*[:.\-]?\s*([^\n]{0,40})/i,
  ]);
  const gioiRaw = extractAfterLabel(text, [
    /gi[oớ]i\s*t[ií]nh\s*[:.\-]?\s*([^\n]{1,20})/i,
    /gioi\s*tinh\s*[:.\-]?\s*([^\n]{1,20})/i,
  ]);
  const khoaRaw = extractAfterLabel(text, [
    /khoa\s*ph[oò]ng\s*[:.\-]?\s*([^\n]{3,120})/i,
    /khoa\s*di[eề]u\s*tr[iị]\s*[:.\-]?\s*([^\n]{3,120})/i,
    /khoa\s*[:.\-]?\s*((?:Khoa\s+)?[^\n>]{3,80})/i,
  ]);

  const ma_benh_an = (maHsba || "").trim().toUpperCase();
  const ma_benh_nhan = (maBn || "").trim();
  const ngay_vao_vien = normalizeBenhAnDate(ngayVaoRaw);
  const ngay_sinh = normalizeBenhAnDate(ngaySinhRaw) || undefined;
  const ngay_ra_vien = normalizeBenhAnDate(ngayRaRaw) || undefined;
  const gioi_tinh = normalizeGioiTinh(gioiRaw);
  const khoa_dieu_tri = firstKhoaSegment(khoaRaw) || undefined;

  const missing: string[] = [];
  if (!ma_benh_an) missing.push("ma_benh_an (Mã HSBA)");
  if (!ma_benh_nhan) missing.push("ma_benh_nhan (Mã BN)");
  if (!ho_ten_benh_nhan) missing.push("ho_ten_benh_nhan");
  if (!ngay_vao_vien) missing.push("ngay_vao_vien (Ngày vào)");

  const warnings: string[] = [];
  if (khoaRaw && khoaRaw.includes(">") && khoa_dieu_tri) {
    warnings.push(`Khoa lấy đoạn đầu: «${khoa_dieu_tri}»`);
  }

  const partial: Partial<NkbvBenhAnTemplateRow> = {
    ma_benh_an: ma_benh_an || undefined,
    ma_benh_nhan: ma_benh_nhan || undefined,
    ho_ten_benh_nhan: ho_ten_benh_nhan || undefined,
    ngay_vao_vien: ngay_vao_vien || undefined,
    khoa_dieu_tri,
    ngay_sinh,
    gioi_tinh,
    ngay_ra_vien,
  };

  if (missing.length) {
    return {
      ok: false,
      error: `Thiếu trường: ${missing.join(", ")}. Kiểm tra ảnh/OCR rồi sửa tay trên lưới xem trước.`,
      missing,
      partial,
    };
  }

  return {
    ok: true,
    row: {
      ma_benh_an,
      ma_benh_nhan,
      ho_ten_benh_nhan,
      ngay_vao_vien,
      khoa_dieu_tri,
      ngay_sinh,
      gioi_tinh,
      ngay_ra_vien,
    },
    missing: [],
    warnings,
  };
}
