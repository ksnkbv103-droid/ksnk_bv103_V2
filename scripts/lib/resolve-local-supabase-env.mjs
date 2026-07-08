/**
 * Resolve local Supabase API URL + service_role key without requiring Docker CLI.
 *
 * Cursor/macOS TCC often blocks `~/.docker/run/docker.sock` and `~/.supabase/telemetry.json`,
 * so `npx supabase status` fails even when Kong/Postgres are healthy on 54321/54322.
 *
 * Order:
 * 1. Env override: SUPABASE_LOCAL_URL + SUPABASE_LOCAL_SERVICE_ROLE_KEY
 * 2. `supabase status -o env` (HOME redirected to writable tmp to avoid telemetry EPERM)
 * 3. Port probe 127.0.0.1:54321 + default local demo JWT (supabase start defaults)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Default keys from `supabase start` when jwt.secret is unchanged. */
export const SUPABASE_LOCAL_DEMO_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const SUPABASE_LOCAL_DEFAULT_API_URL = "http://127.0.0.1:54321";

function parseStatusEnv(stdout) {
  let url = "";
  let serviceKey = "";
  for (const line of (stdout || "").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    const val = m[2].replace(/^"|"$/g, "");
    if (m[1] === "API_URL") url = val;
    if (m[1] === "SERVICE_ROLE_KEY") serviceKey = val;
  }
  return { url, serviceKey };
}

function trySupabaseStatus(cwd) {
  const home = mkdtempSync(join(tmpdir(), "ksnk-supabase-home-"));
  mkdirSync(join(home, ".supabase"), { recursive: true });
  const status = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      SUPABASE_INTERNAL_DISABLE_TELEMETRY: "1",
    },
  });
  if (status.status !== 0) return null;
  const parsed = parseStatusEnv(status.stdout);
  if (!parsed.url || !parsed.serviceKey) return null;
  return { ...parsed, source: "supabase-status" };
}

async function probeLocalApi(url, serviceKey) {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {{ cwd?: string }} [opts]
 * @returns {Promise<{ url: string, serviceKey: string, source: string }>}
 */
export async function resolveLocalSupabaseEnv(opts = {}) {
  const cwd = opts.cwd || process.cwd();

  const envUrl = process.env.SUPABASE_LOCAL_URL?.trim();
  const envKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY?.trim();
  if (envUrl && envKey) {
    return { url: envUrl, serviceKey: envKey, source: "env" };
  }

  const fromStatus = trySupabaseStatus(cwd);
  if (fromStatus) return fromStatus;

  const url = SUPABASE_LOCAL_DEFAULT_API_URL;
  const serviceKey = SUPABASE_LOCAL_DEMO_SERVICE_ROLE_KEY;
  const ok = await probeLocalApi(url, serviceKey);
  if (!ok) {
    throw new Error(
      "Supabase local không phản hồi tại http://127.0.0.1:54321. " +
        "Mở Docker Desktop → `npx supabase start` (chạy trong Terminal ngoài Cursor nếu Docker socket bị chặn).",
    );
  }
  return { url, serviceKey, source: "port-probe-demo-jwt" };
}
