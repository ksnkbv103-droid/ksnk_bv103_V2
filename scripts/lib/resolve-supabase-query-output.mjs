import { execSync } from "node:child_process";

/**
 * Tham số output cho `supabase db query` — tương thích CLI 2.101 (-o table) và 2.104+ (--output-format text).
 * @param {string} [cwd]
 */
export function resolveSupabaseQueryOutputArgs(cwd = process.cwd()) {
  const help = execSync("npx supabase db query --help", {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (/--output-format\b/.test(help) && /\btext\b/.test(help)) {
    return { extra: ["--output-format", "text"], label: "--output-format text" };
  }
  const flagsOnly = help.split("GLOBAL FLAGS")[0] ?? help;
  const m = flagsOnly.match(
    /--output, -o choice\s+Output format:.*?\(choices: ([^\)]+)\)/s,
  );
  const choices = m?.[1] ?? "";
  if (/\btable\b/.test(choices)) {
    return { extra: ["-o", "table"], label: "-o table" };
  }
  if (/\bcsv\b/.test(choices)) {
    return { extra: ["-o", "csv"], label: "-o csv" };
  }
  return { extra: ["-o", "json"], label: "-o json" };
}
