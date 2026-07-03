/** Truy vết hóa chất từ attributes sự cố CHEMICAL. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMaHoaChatFromMachineLabel(label: string | null | undefined): string | null {
  const t = String(label || "").trim();
  if (!t) return null;
  const idx = t.indexOf(" - ");
  return (idx > 0 ? t.slice(0, idx) : t).trim() || null;
}

export function resolveDmHoaChatIdFromIncidentAttrs(attrs: Record<string, unknown> | null | undefined): string | null {
  const raw = String(attrs?.MACHINE_ID ?? attrs?.machine_id ?? "").trim();
  if (!raw) return null;
  if (UUID_RE.test(raw)) return raw;
  return null;
}

export function resolveMaLoFromIncidentAttrs(attrs: Record<string, unknown> | null | undefined): string | null {
  const raw = String(attrs?.ERROR_QR ?? attrs?.error_qr ?? "").trim();
  return raw || null;
}
