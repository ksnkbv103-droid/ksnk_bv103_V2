#!/usr/bin/env node
/**
 * Smoke local/prod: chứng minh query bản đồ 6 trạm.
 * - CŨ (select is_red_alert trên view) → phải FAIL nếu chưa migrate
 * - MỚI (không select is_red_alert) → phải OK
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node scripts/smoke-cssd-station-map-query.mjs
 * hoặc đọc từ .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_")) {
  console.error("[smoke] Thiếu NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (điền .env.local).");
  process.exit(2);
}

async function probe(select) {
  const res = await fetch(
    `${url}/rest/v1/v_cssd_quy_trinh_full?select=${encodeURIComponent(select)}&is_active=eq.true&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const body = await res.text();
  return { status: res.status, body: body.slice(0, 240) };
}

const oldSel = "ma_trang_thai_hien_tai,is_red_alert,is_dong_bang";
const newSel = "id,ma_qr_quy_trinh,ma_trang_thai_hien_tai,is_dong_bang";

const oldR = await probe(oldSel);
const newR = await probe(newSel);

console.log("[smoke] OLD select (có is_red_alert):", oldR.status, oldR.body);
console.log("[smoke] NEW select (không is_red_alert):", newR.status, newR.body);

if (newR.status !== 200) {
  console.error("[smoke] FAIL — query mới vẫn lỗi. Kiểm tra view/DB.");
  process.exit(1);
}

if (oldR.status === 200) {
  console.log("[smoke] OK — DB đã có cột is_red_alert trên view (migrate xong). Query mới cũng OK.");
} else if (/is_red_alert/i.test(oldR.body)) {
  console.log("[smoke] OK — DB chưa migrate nhưng query MỚI (code trên main) vẫn chạy được → hết lỗi đỏ trên app nếu đã pull main + restart.");
} else {
  console.error("[smoke] FAIL — OLD fail khác is_red_alert:", oldR.body);
  process.exit(1);
}
