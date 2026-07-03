/** Xóa cookie phiên Supabase của project khác (ví dụ sau khi đổi .env.local). */
export function clearStaleSupabaseAuthCookies(expectedUrl: string | undefined): void {
  if (typeof document === "undefined") return;

  const ref = expectedUrl?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1]?.toLowerCase();
  if (!ref) return;

  const purge = (name: string) => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  };

  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name?.startsWith("sb-")) continue;
    if (!name.toLowerCase().includes(ref)) purge(name);
  }
}
