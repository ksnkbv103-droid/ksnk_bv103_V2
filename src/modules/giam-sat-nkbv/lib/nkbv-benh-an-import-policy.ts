/**
 * Copy HIS: đã có mã bệnh án thì không đè hồ sơ.
 */

export function decideBenhAnImportRow(input: {
  existingPid: string | null;
  incomingPid: string;
}): "insert" | "skip_exists" | "skip_conflict" {
  const incoming = String(input.incomingPid || "").trim();
  if (!input.existingPid) return "insert";
  const prev = String(input.existingPid).trim();
  if (prev && incoming && prev.toUpperCase() !== incoming.toUpperCase()) {
    return "skip_conflict";
  }
  return "skip_exists";
}
