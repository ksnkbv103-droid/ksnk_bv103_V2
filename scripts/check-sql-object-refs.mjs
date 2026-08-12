#!/usr/bin/env node
/**
 * CI guard: định nghĩa function/view còn hiệu lực không được đọc quan hệ
 * `public.*` đã bị xoá hoặc chưa bao giờ tạo.
 *
 * Lý do: `fn_nkbv_dich_te_hoc_rates` từng đọc `public.fact_giam_sat_nkbv_ca`
 * sau khi bảng đổi tên → RPC lỗi runtime nhưng migration vẫn apply thành công
 * (Postgres không kiểm tra quan hệ trong thân plpgsql khi CREATE FUNCTION).
 *
 * Chỉ xét **trạng thái cuối** của chuỗi migration: với mỗi function/view chỉ
 * lấy định nghĩa cuối cùng. Câu lệnh DML lịch sử được bỏ qua vì chúng đã chạy
 * xong trên schema tại thời điểm đó.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");

/** Quan hệ do Supabase/extension cung cấp, không khai báo trong migration. */
const EXTERNAL_RELATIONS = new Set(["schema_migrations", "supabase_migrations"]);

/**
 * `20260602180000_module_ssot_drop_legacy_compat_views.sql` viết lại thân
 * function tại runtime (EXECUTE) để đổi tên compat sang tên module. Tên nằm
 * trong bảng ánh xạ đó đã được sửa trên DB dù file migration cũ vẫn giữ tên cũ
 * — phân tích tĩnh không thấy được, nên coi là hợp lệ.
 */
const REWRITER_MIGRATION = "20260602180000_module_ssot_drop_legacy_compat_views.sql";
const REWRITE_MAP_RE = /replace\(\s*newdef\s*,\s*'public\.([a-z0-9_]+)'/gi;

const files = readdirSync(migrationsDir)
  .filter((n) => n.endsWith(".sql"))
  .sort();

const CREATE_REL_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNLOGGED\s+|MATERIALIZED\s+|FOREIGN\s+)?(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const DROP_REL_RE =
  /DROP\s+(?:MATERIALIZED\s+)?(?:TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const RENAME_REL_RE =
  /ALTER\s+(?:TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?"?public"?\.\s*"?[a-z0-9_]+"?\s+RENAME\s+TO\s+"?([a-z0-9_]+)"?/gi;
const DROP_FN_RE =
  /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const CREATE_FN_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const CREATE_VIEW_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
/** FROM/JOIN/INTO/UPDATE/DELETE FROM public.<rel>; `public.fn_x(` là lời gọi hàm. */
const REF_RE =
  /(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(?:ONLY\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?(\s*\()?/gi;

/** Trích thân dollar-quoted bắt đầu từ vị trí `start`. */
function readDollarBody(text, start) {
  const open = /\$([a-z_]*)\$/i.exec(text.slice(start, start + 4000));
  if (!open) return null;
  const tag = open[0];
  const bodyStart = start + open.index + tag.length;
  const bodyEnd = text.indexOf(tag, bodyStart);
  if (bodyEnd < 0) return null;
  return { body: text.slice(bodyStart, bodyEnd), end: bodyEnd + tag.length };
}

/** Trích thân view: từ ` AS ` tới dấu `;` đầu tiên ở ngoài chuỗi. */
function readViewBody(text, start) {
  const end = text.indexOf(";", start);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

const rewrittenNames = new Set(
  [...readFileSync(join(migrationsDir, REWRITER_MIGRATION), "utf8").matchAll(REWRITE_MAP_RE)].map(
    (m) => m[1].toLowerCase(),
  ),
);

const relations = new Set();
/** @type {Map<string, { body: string; file: string; kind: string }>} */
const finalDefinitions = new Map();

for (const name of files) {
  const text = readFileSync(join(migrationsDir, name), "utf8");

  for (const m of text.matchAll(CREATE_REL_RE)) relations.add(m[1].toLowerCase());
  for (const m of text.matchAll(RENAME_REL_RE)) relations.add(m[1].toLowerCase());
  for (const m of text.matchAll(DROP_REL_RE)) {
    const rel = m[1].toLowerCase();
    // DROP ... rồi CREATE lại trong cùng file là pattern thay thế, không phải xoá hẳn.
    const recreated = new RegExp(
      `CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:MATERIALIZED\\s+)?(?:TABLE|VIEW)[^;]*?public"?\\.\\s*"?${rel}"?\\b`,
      "i",
    ).test(text);
    if (!recreated) {
      relations.delete(rel);
      finalDefinitions.delete(`view:${rel}`);
    }
  }

  for (const m of text.matchAll(DROP_FN_RE)) {
    finalDefinitions.delete(`fn:${m[1].toLowerCase()}`);
  }

  for (const m of text.matchAll(CREATE_FN_RE)) {
    const parsed = readDollarBody(text, m.index + m[0].length);
    if (parsed) {
      finalDefinitions.set(`fn:${m[1].toLowerCase()}`, {
        body: parsed.body,
        file: name,
        kind: "function",
      });
    }
  }

  for (const m of text.matchAll(CREATE_VIEW_RE)) {
    finalDefinitions.set(`view:${m[1].toLowerCase()}`, {
      body: readViewBody(text, m.index + m[0].length),
      file: name,
      kind: "view",
    });
  }
}

/** @type {{ object: string; rel: string; file: string; kind: string }[]} */
const broken = [];
for (const [key, def] of finalDefinitions) {
  const objectName = key.slice(key.indexOf(":") + 1);
  const seen = new Set();
  for (const m of def.body.matchAll(REF_RE)) {
    if (m[2]) continue;
    const rel = m[1].toLowerCase();
    if (rel === objectName || seen.has(rel)) continue;
    seen.add(rel);
    if (EXTERNAL_RELATIONS.has(rel) || relations.has(rel) || rewrittenNames.has(rel)) continue;
    broken.push({ object: objectName, rel, file: def.file, kind: def.kind });
  }
}

if (broken.length) {
  console.error(
    "[sql:object-refs] Định nghĩa còn hiệu lực đọc quan hệ public.* không tồn tại:\n",
  );
  for (const h of broken) {
    console.error(`  - ${h.kind} public.${h.object} → public.${h.rel}  (${h.file})`);
  }
  console.error(
    "\nThêm migration CREATE OR REPLACE trỏ đúng tên quan hệ; nếu không, RPC/view sẽ lỗi runtime âm thầm.",
  );
  process.exit(1);
}

console.log(
  `[sql:object-refs] OK — ${finalDefinitions.size} function/view còn hiệu lực đều trỏ đúng quan hệ.`,
);
