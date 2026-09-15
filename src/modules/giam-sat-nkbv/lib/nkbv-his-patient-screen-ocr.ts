/**
 * OCR client-side ảnh màn HIS «Thông tin bệnh nhân» (tesseract.js).
 * Chỉ chạy trên browser — dynamic import.
 */
"use client";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

export function isHisPatientScreenImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

async function fileToOcrBlob(file: File): Promise<Blob> {
  const name = file.name.toLowerCase();
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");
  if (!isHeic) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error("HEIC trống sau chuyển đổi");
    return blob;
  } catch {
    throw new Error(
      "Ảnh HEIC chưa đọc được trên trình duyệt này. Trên iPhone: chọn «Tệp lớn nhất»/JPEG, hoặc xuất JPEG rồi tải lại.",
    );
  }
}

/** OCR → text thô (vie+eng). */
export async function ocrHisPatientScreenImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const blob = await fileToOcrBlob(file);
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(blob, "vie+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  return String(result.data?.text || "").trim();
}
