/** Heuristic: máy tiệt khuẩn hơi nước (Bowie–Dick có thể áp dụng). */
export function isSteamSterilizerProfile(machine: {
  loai_ten_hien_thi?: string | null;
  loai_thiet_bi?: string | null;
} | null): boolean {
  const m = machine && Array.isArray(machine) ? (machine as unknown[])[0] : machine;
  const s = `${(m as { loai_ten_hien_thi?: string | null })?.loai_ten_hien_thi || ""} ${(m as { loai_thiet_bi?: string | null })?.loai_thiet_bi || ""}`.toLowerCase();
  return /hơi|hoi|steam|nước|nuoc|134|121/.test(s);
}
