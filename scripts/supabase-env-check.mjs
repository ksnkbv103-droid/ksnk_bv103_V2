#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const placeholder = /YOUR_PROJECT|YOUR_ANON_JWT_HERE|YOUR_SERVICE_ROLE_JWT_HERE|changeme|placeholder/i;

function parse(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 0) continue;
    const key = text.slice(0, eq).trim();
    const value = text.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

if (!existsSync(envPath)) {
  console.error("[env:check] Khong tim thay .env.local");
  process.exit(1);
}

const env = parse(readFileSync(envPath, "utf8"));
let ok = true;

for (const key of required) {
  const value = (env[key] || "").trim();
  if (!value) {
    console.error(`[env:check] Thieu bien: ${key}`);
    ok = false;
    continue;
  }
  if (placeholder.test(value)) {
    console.error(`[env:check] ${key} dang la placeholder`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("[env:check] OK");
