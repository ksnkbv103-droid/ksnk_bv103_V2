#!/usr/bin/env node
/**
 * Bản dev thứ hai (cổng 3001) trỏ Supabase LOCAL (Docker) — để thử ghi dữ liệu mà không đụng DB thật
 * của `.env.local`. Biến môi trường của tiến trình này thắng file `.env*`; không sửa file nào.
 * Cần: Docker container supabase_db_ksnk_bv103 đang chạy. Tài khoản thử: xem supabase/seeds/*.sql.
 */
import { execFileSync, spawn } from "node:child_process";

let raw = "";
try {
  raw = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch {
  console.error("Chưa có Supabase local — chạy: npx supabase start");
  process.exit(1);
}
const kv = Object.fromEntries(
  raw.split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
for (const k of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
  if (!kv[k]) {
    console.error(`Thiếu ${k} từ 'supabase status'.`);
    process.exit(1);
  }
}
const child = spawn("npx", ["next", "dev", "--turbopack", "-p", "3001"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: kv.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: kv.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: kv.SERVICE_ROLE_KEY,
    NEXT_DIST_DIR: ".next-local",
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
