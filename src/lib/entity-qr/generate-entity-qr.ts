import QRCode from "qrcode";

/** Sinh PNG data URL cho mã QR (client hoặc server Node). */
export async function generateEntityQrDataUrl(
  code: string,
  opts?: { width?: number; margin?: number },
): Promise<string> {
  const value = String(code || "").trim();
  if (!value) throw new Error("Thiếu mã QR");
  return QRCode.toDataURL(value, {
    margin: opts?.margin ?? 1,
    width: opts?.width ?? 280,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
