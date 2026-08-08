"use server";

import { classifyEntityQr, type EntityQrResolved } from "./entity-qr-core";

/**
 * Resolve mã QR → deep-link mở lại bản ghi.
 * Thuần prefix/UUID (không cần DB); CSSD dùng URL trace hiện có.
 */
export async function resolveEntityQrAction(raw: string): Promise<{
  success: boolean;
  data?: EntityQrResolved;
  error?: string;
}> {
  const resolved = classifyEntityQr(raw);
  if (resolved.kind === "UNKNOWN" || !resolved.href) {
    return {
      success: false,
      data: resolved,
      error: resolved.label || "Không nhận diện mã QR",
    };
  }
  return { success: true, data: resolved };
}
