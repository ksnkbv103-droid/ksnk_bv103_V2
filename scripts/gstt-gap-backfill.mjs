#!/usr/bin/env node
/**
 * Idempotent GSTT VST/GSC gap backfill: ksnk_bv103 (legacy) → ksnk-bv103-prod.
 *
 * Audit ref d90bdbc9 — gaps from Jun 2026 slice (2026-06-05..2026-06-11) after FK
 * failures on khu_vuc_id (old physical UUID ≠ prod sys_lookup_value).
 *
 * Remaps lookup FKs by ten/code (not raw old khu_vuc UUID). GSC EAV → results_jsonb.
 * Does NOT disable MDM triggers — inserts use valid prod lookup IDs only.
 *
 * Usage:
 *   DRY_RUN=1 node --env-file=.env.local scripts/gstt-gap-backfill.mjs
 *   node --env-file=.env.local scripts/gstt-gap-backfill.mjs
 *   node --env-file=.env.local scripts/gstt-gap-backfill.mjs --from=2026-06-05 --to=2026-06-11
 *   node --env-file=.env.local scripts/gstt-gap-backfill.mjs --all-missing
 *   node --env-file=.env.local scripts/gstt-gap-backfill.mjs --all-missing --gsc-only
 *   node --env-file=.env.local scripts/gstt-gap-backfill.mjs --all-missing --vst-only
 *
 * Verify:
 *   node scripts/run-supabase-sql.mjs --linked --file scripts/sql/gstt-migration-audit-counts.sql
 *   node scripts/run-supabase-sql.mjs --linked --file scripts/sql/gstt-gap-id-parity-check.sql
 *   node scripts/run-supabase-sql.mjs --linked --file scripts/sql/gstt-archive-parity-check.sql
 *
 * Env (prod): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Env (old, optional): GSTT_OLD_SUPABASE_URL, GSTT_OLD_SERVICE_ROLE_KEY
 *   Fallback old ref buhcnqkwwcklskztzgiu + CLI api-keys when SUPABASE_ACCESS_TOKEN set.
 */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const OLD_REF = "buhcnqkwwcklskztzgiu";
const DEFAULT_FROM = "2026-06-05";
const DEFAULT_TO = "2026-06-11";

/** Old dm_khu_vuc.ten_khu_vuc → prod sys_lookup_value.name (canonical rename). */
const KHU_VUC_TEN_BRIDGE = {
  "phong mo": "Phòng mổ",
  "phong hoi suc": "ICU chung (hồi sức thường)",
  "phong cap cuu": "Khu cấp cứu",
  "phong dieu tri thuong": "Buồng bệnh nội trú thông thường",
  "phong can thiep": "Phòng can thiệp mạch",
  "phong thu thuat": "Phòng thủ thuật vô khuẩn",
  "phong xet nghiem": "Khu xét nghiệm lâm sàng",
  "phong lay mau benh pham": "Khu xét nghiệm lâm sàng",
};

function normTen(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv) {
  const out = {
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    allMissing: false,
    gscOnly: false,
    vstOnly: false,
    dryRun: process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true",
  };
  for (const a of argv) {
    if (a === "--all-missing") out.allMissing = true;
    else if (a === "--gsc-only") out.gscOnly = true;
    else if (a === "--vst-only") out.vstOnly = true;
    else if (a.startsWith("--from=")) out.from = a.slice(7);
    else if (a.startsWith("--to=")) out.to = a.slice(5);
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function fetchOldServiceKey(ref) {
  const fromEnv = process.env.GSTT_OLD_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;
  const r = spawnSync(
    "npx",
    ["supabase", "--experimental", "projects", "api-keys", "--project-ref", ref, "-o", "json"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(
      `Cannot fetch old service_role (set GSTT_OLD_SERVICE_ROLE_KEY): ${r.stderr || r.stdout}`,
    );
  }
  const keys = JSON.parse(r.stdout);
  const svc = keys.find((k) => k.name === "service_role");
  if (!svc?.api_key) throw new Error("Old project service_role key not found");
  return svc.api_key;
}

function createOldClient() {
  const url =
    process.env.GSTT_OLD_SUPABASE_URL?.trim() ||
    `https://${OLD_REF}.supabase.co`;
  const key = fetchOldServiceKey(OLD_REF);
  return createClient(url, key, { auth: { persistSession: false } });
}

function createProdClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

async function fetchAllIds(client, table, filters = {}) {
  const ids = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    let q = client.from(table).select("id", { count: "exact" }).range(from, from + pageSize - 1);
    for (const [k, v] of Object.entries(filters)) {
      if (k.endsWith("_gte")) q = q.gte(k.slice(0, -4), v);
      else if (k.endsWith("_lte")) q = q.lte(k.slice(0, -4), v);
      else q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw new Error(`${table} id fetch: ${error.message}`);
    for (const row of data ?? []) ids.add(row.id);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function loadLookupMaps(oldDb, prodDb) {
  const [{ data: oldKv }, { data: prodLookups }] = await Promise.all([
    oldDb.from("dm_khu_vuc_giam_sat").select("id, ma_khu_vuc, ten_khu_vuc"),
    prodDb
      .from("sys_lookup_value")
      .select("id, category_type, code, name")
      .eq("is_active", true)
      .in("category_type", [
        "KHU_VUC_GIAM_SAT",
        "HINH_THUC_GIAM_SAT",
        "CACH_THUC_GIAM_SAT",
        "NGHE_NGHIEP",
      ]),
  ]);
  if (!oldKv?.length) throw new Error("Old dm_khu_vuc_giam_sat empty/unreadable");
  if (!prodLookups?.length) throw new Error("Prod sys_lookup_value empty/unreadable");

  const byCat = {};
  for (const lv of prodLookups) {
    (byCat[lv.category_type] ??= []).push(lv);
  }

  const prodByNormName = (cat) => {
    const m = new Map();
    for (const lv of byCat[cat] ?? []) m.set(normTen(lv.name), lv.id);
    return m;
  };

  const khuByName = prodByNormName("KHU_VUC_GIAM_SAT");
  const khuRemap = new Map();
  for (const row of oldKv) {
    const bridged = KHU_VUC_TEN_BRIDGE[normTen(row.ten_khu_vuc)];
    const targetName = bridged ?? row.ten_khu_vuc;
    let prodId = khuByName.get(normTen(targetName));
    if (!prodId) prodId = khuByName.get(normTen(row.ten_khu_vuc));
    if (prodId) khuRemap.set(row.id, prodId);
    else
      console.warn(
        `[warn] khu_vuc unmapped old=${row.id} ten="${row.ten_khu_vuc}" ma=${row.ma_khu_vuc}`,
      );
  }

  const passthrough = (cat) => {
    const m = new Map();
    for (const lv of byCat[cat] ?? []) m.set(lv.id, lv.id);
    return m;
  };

  const hinhRemap = passthrough("HINH_THUC_GIAM_SAT");
  const cachRemap = passthrough("CACH_THUC_GIAM_SAT");
  const ngheRemap = passthrough("NGHE_NGHIEP");

  return {
    khuRemap,
    hinhRemap,
    cachRemap,
    ngheRemap,
    remapLookup(id, kind) {
      if (id == null) return null;
      const maps = { khu: khuRemap, hinh: hinhRemap, cach: cachRemap, nghe: ngheRemap };
      const mapped = maps[kind]?.get(id);
      if (!mapped) {
        throw new Error(`Lookup remap failed kind=${kind} oldId=${id}`);
      }
      return mapped;
    },
  };
}

function extractBmCode(maBk, tenBangKiem) {
  const fromTen = String(tenBangKiem ?? "").match(/BM\.(?:QĐ\.)?\d+\.\d+/i)?.[0];
  if (fromTen) return fromTen.toUpperCase().replace(/^BM\.QĐ\./i, "BM.QĐ.");
  const slug = String(maBk ?? "");
  const qd = slug.match(/BMQĐ(\d{2})(\d{2})/i);
  if (qd) return `BM.QĐ.${qd[1]}.${qd[2]}`;
  const std = slug.match(/BM(\d{2})(\d{2})/i);
  if (std) return `BM.${std[1]}.${std[2]}`;
  return null;
}

async function loadBangKiemMap(oldDb, prodDb) {
  const [{ data: oldBk }, { data: prodBk }] = await Promise.all([
    oldDb.from("dm_bang_kiem").select("id, ma_bk, ten_bang_kiem"),
    prodDb.from("gstt_dm_bang_kiem").select("id, ma_bk"),
  ]);
  const prodByMa = new Map((prodBk ?? []).map((r) => [r.ma_bk.toUpperCase(), r.id]));
  const remap = new Map();
  for (const row of oldBk ?? []) {
    const code = extractBmCode(row.ma_bk, row.ten_bang_kiem);
    const prodId = code ? prodByMa.get(code.toUpperCase()) : null;
    if (prodId) remap.set(row.id, prodId);
    else
      console.warn(
        `[warn] bang_kiem unmapped old=${row.id} ma_bk=${row.ma_bk} ten="${row.ten_bang_kiem}" code=${code}`,
      );
  }
  return {
    remapBangKiem(id) {
      if (id == null) return null;
      const mapped = remap.get(id);
      if (!mapped) throw new Error(`bang_kiem remap failed oldId=${id}`);
      return mapped;
    },
  };
}

function inDateRange(ngay, from, to) {
  if (!ngay) return false;
  return ngay >= from && ngay <= to;
}

function buildResultsJsonb(rows) {
  return (rows ?? []).map((r) => ({
    criterion_id: r.criterion_id,
    value: r.value,
    note: r.note ?? null,
    weight_type: null,
    is_red_flag: false,
    image_url: null,
    thoi_diem_ghi: null,
    gia_tri_so: null,
    gia_tri_lua_chon: null,
  }));
}

function mapVstSession(row, maps) {
  return {
    id: row.id,
    khoa_id: row.khoa_id,
    khu_vuc_id: row.khu_vuc_id ? maps.remapLookup(row.khu_vuc_id, "khu") : null,
    vi_tri_cu_the: row.vi_tri_cu_the,
    nguoi_giam_sat_id: row.nguoi_giam_sat_id,
    thoi_gian_bat_dau: row.thoi_gian_bat_dau,
    thoi_gian_ket_thuc: row.thoi_gian_ket_thuc,
    ngay_giam_sat: row.ngay_giam_sat,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_active: row.is_active,
    is_seen: row.is_seen,
    hinh_thuc_id: row.hinh_thuc_id ? maps.remapLookup(row.hinh_thuc_id, "hinh") : null,
    cach_thuc_id: row.cach_thuc_id ? maps.remapLookup(row.cach_thuc_id, "cach") : null,
  };
}

function mapVstObs(row, maps) {
  const metadata = {};
  if (row.ten_nhan_vien_ngoai) metadata.ten_nhan_vien_ngoai = row.ten_nhan_vien_ngoai;
  if (row.legacy_csv_row_id) metadata.legacy_csv_row_id = row.legacy_csv_row_id;
  return {
    id: row.id,
    session_id: row.session_id,
    nhan_vien_id: row.nhan_vien_id,
    khoa_id: row.khoa_id,
    vi_tri: row.vi_tri,
    ngay_giam_sat: row.ngay_giam_sat,
    thoi_diem: row.thoi_diem,
    hanh_dong: row.hanh_dong,
    dung_ky_thuat: row.dung_ky_thuat,
    du_thoi_gian: row.du_thoi_gian,
    co_deo_gang: row.co_deo_gang,
    thoi_gian_ghi_nhan: row.thoi_gian_ghi_nhan,
    created_at: row.created_at,
    ghi_chu: row.ghi_chu,
    khu_vuc_id: row.khu_vuc_id ? maps.remapLookup(row.khu_vuc_id, "khu") : null,
    nghe_nghiep_id: row.nghe_nghiep_id ? maps.remapLookup(row.nghe_nghiep_id, "nghe") : null,
    metadata,
  };
}

function mapGscSession(row, resultsJsonb, maps, bkMaps) {
  return {
    id: row.id,
    khoa_id: row.khoa_id,
    khu_vuc_id: row.khu_vuc_id ? maps.remapLookup(row.khu_vuc_id, "khu") : null,
    vi_tri: row.vi_tri,
    nguoi_giam_sat_id: row.nguoi_giam_sat_id,
    is_giam_sat_ca_nhan: row.is_giam_sat_ca_nhan,
    nhan_vien_id: row.nhan_vien_id,
    nghe_nghiep_id: row.nghe_nghiep_id ? maps.remapLookup(row.nghe_nghiep_id, "nghe") : null,
    ngay_giam_sat: row.ngay_giam_sat,
    thoi_gian_ghi_nhan: row.thoi_gian_ghi_nhan,
    tong_diem: row.tong_diem,
    ghi_chu_chung: row.ghi_chu_chung,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_seen: row.is_seen,
    thoi_gian_bat_dau: row.thoi_gian_bat_dau,
    thoi_gian_ket_thuc: row.thoi_gian_ket_thuc,
    hinh_thuc_id: row.hinh_thuc_id ? maps.remapLookup(row.hinh_thuc_id, "hinh") : null,
    cach_thuc_id: row.cach_thuc_id ? maps.remapLookup(row.cach_thuc_id, "cach") : null,
    bang_kiem_id: row.bang_kiem_id ? bkMaps.remapBangKiem(row.bang_kiem_id) : null,
    results_jsonb: resultsJsonb,
    metadata: {
      is_manual_nhan_vien: row.is_manual_nhan_vien ?? false,
      ten_manual_nhan_vien: row.ten_manual_nhan_vien ?? null,
      is_bo_sung_nguoi_benh: row.is_bo_sung_nguoi_benh ?? false,
      ma_nguoi_benh: row.ma_nguoi_benh ?? null,
      ten_nguoi_benh: row.ten_nguoi_benh ?? null,
      so_giuong_nguoi_benh: row.so_giuong_nguoi_benh ?? null,
    },
  };
}

async function upsertBatch(prodDb, table, rows, dryRun, onConflict = "id") {
  if (!rows.length) return { inserted: 0, skipped: 0 };
  if (dryRun) return { inserted: rows.length, skipped: 0, dry: true };
  const { error } = await prodDb.from(table).upsert(rows, {
    onConflict,
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`${table} upsert: ${error.message}`);
  return { inserted: rows.length, skipped: 0 };
}

async function countTable(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const oldDb = createOldClient();
  const prodDb = createProdClient();
  const maps = await loadLookupMaps(oldDb, prodDb);
  const bkMaps = await loadBangKiemMap(oldDb, prodDb);

  const before = {
    old: {
      vstSessions: await countTable(oldDb, "fact_giam_sat_vst_sessions"),
      vstObs: await countTable(oldDb, "fact_giam_sat_vst"),
      gscSessions: await countTable(oldDb, "fact_giam_sat_chung_sessions"),
    },
    prod: {
      vstSessions: await countTable(prodDb, "gstt_fact_vst_sessions"),
      vstObs: await countTable(prodDb, "gstt_fact_vst"),
      gscSessions: await countTable(prodDb, "gstt_fact_chung_sessions"),
    },
  };

  const [oldVstIds, prodVstIds, oldGscIds, prodGscIds] = await Promise.all([
    fetchAllIds(oldDb, "fact_giam_sat_vst_sessions"),
    fetchAllIds(prodDb, "gstt_fact_vst_sessions"),
    fetchAllIds(oldDb, "fact_giam_sat_chung_sessions"),
    fetchAllIds(prodDb, "gstt_fact_chung_sessions"),
  ]);

  let missingVstIds = [...oldVstIds].filter((id) => !prodVstIds.has(id));
  let missingGscIds = [...oldGscIds].filter((id) => !prodGscIds.has(id));

  if (!args.allMissing) {
    const { data: vstMeta } = await oldDb
      .from("fact_giam_sat_vst_sessions")
      .select("id, ngay_giam_sat, is_active")
      .in("id", missingVstIds.length ? missingVstIds : ["00000000-0000-0000-0000-000000000000"]);
    missingVstIds = (vstMeta ?? [])
      .filter(
        (r) =>
          r.is_active !== false && inDateRange(r.ngay_giam_sat, args.from, args.to),
      )
      .map((r) => r.id);

    const { data: gscMeta } = await oldDb
      .from("fact_giam_sat_chung_sessions")
      .select("id, ngay_giam_sat, is_active")
      .in("id", missingGscIds.length ? missingGscIds : ["00000000-0000-0000-0000-000000000000"]);
    missingGscIds = (gscMeta ?? [])
      .filter(
        (r) =>
          r.is_active !== false && inDateRange(r.ngay_giam_sat, args.from, args.to),
      )
      .map((r) => r.id);
  }

  console.log(
    JSON.stringify(
      {
        mode: args.allMissing ? "all-missing-ids" : "date-slice",
        dateRange: args.allMissing ? null : { from: args.from, to: args.to },
        dryRun: args.dryRun,
        targets: {
          vstSessions: missingVstIds.length,
          gscSessions: missingGscIds.length,
        },
        before,
      },
      null,
      2,
    ),
  );

  const stats = {
    vstSessions: 0,
    vstObs: 0,
    gscSessions: 0,
    failures: [],
  };

  // VST sessions
  if (!args.gscOnly && missingVstIds.length) {
    const { data: sessions, error } = await oldDb
      .from("fact_giam_sat_vst_sessions")
      .select("*")
      .in("id", missingVstIds);
    if (error) throw new Error(`old vst sessions: ${error.message}`);

    const mapped = [];
    for (const row of sessions ?? []) {
      try {
        mapped.push(mapVstSession(row, maps));
      } catch (e) {
        stats.failures.push({ entity: "vst_session", id: row.id, error: e.message });
      }
    }
    const r = await upsertBatch(
      prodDb,
      "gstt_fact_vst_sessions",
      mapped,
      args.dryRun,
    );
    stats.vstSessions = r.inserted;
  }

  // VST observations for missing sessions (or obs whose session was just targeted)
  if (!args.gscOnly) {
  const sessionScope = new Set(missingVstIds);
  if (sessionScope.size) {
    const { data: obs, error } = await oldDb
      .from("fact_giam_sat_vst")
      .select("*")
      .in("session_id", [...sessionScope]);
    if (error) throw new Error(`old vst obs: ${error.message}`);

    const prodObsIds = await fetchAllIds(prodDb, "gstt_fact_vst");
    const toInsert = [];
    for (const row of obs ?? []) {
      if (prodObsIds.has(row.id)) continue;
      try {
        toInsert.push(mapVstObs(row, maps));
      } catch (e) {
        stats.failures.push({ entity: "vst_obs", id: row.id, error: e.message });
      }
    }

    const chunk = 200;
    for (let i = 0; i < toInsert.length; i += chunk) {
      const batch = toInsert.slice(i, i + chunk);
      const r = await upsertBatch(prodDb, "gstt_fact_vst", batch, args.dryRun);
      stats.vstObs += r.inserted;
    }
  }
  }

  // GSC sessions + EAV results
  if (!args.vstOnly && missingGscIds.length) {
    const { data: gscRows, error: gscErr } = await oldDb
      .from("fact_giam_sat_chung_sessions")
      .select("*")
      .in("id", missingGscIds);
    if (gscErr) throw new Error(`old gsc sessions: ${gscErr.message}`);

    const { data: eav, error: eavErr } = await oldDb
      .from("fact_giam_sat_chung_results")
      .select("session_id, criterion_id, value, note, created_at")
      .in("session_id", missingGscIds);
    if (eavErr) throw new Error(`old gsc eav: ${eavErr.message}`);

    const eavBySession = new Map();
    for (const r of eav ?? []) {
      if (!eavBySession.has(r.session_id)) eavBySession.set(r.session_id, []);
      eavBySession.get(r.session_id).push(r);
    }

    const mappedGsc = [];
    for (const row of gscRows ?? []) {
      try {
        const results = buildResultsJsonb(eavBySession.get(row.id) ?? []);
        mappedGsc.push(mapGscSession(row, results, maps, bkMaps));
      } catch (e) {
        stats.failures.push({ entity: "gsc_session", id: row.id, error: e.message });
      }
    }
    const r = await upsertBatch(
      prodDb,
      "gstt_fact_chung_sessions",
      mappedGsc,
      args.dryRun,
    );
    stats.gscSessions = r.inserted;
  }

  const after = args.dryRun
    ? before.prod
    : {
        vstSessions: await countTable(prodDb, "gstt_fact_vst_sessions"),
        vstObs: await countTable(prodDb, "gstt_fact_vst"),
        gscSessions: await countTable(prodDb, "gstt_fact_chung_sessions"),
      };

  console.log(
    JSON.stringify(
      {
        migrated: stats,
        after,
        parity: {
          vstSessions: before.old.vstSessions - after.vstSessions,
          vstObs: before.old.vstObs - after.vstObs,
          gscSessions: before.old.gscSessions - after.gscSessions,
        },
      },
      null,
      2,
    ),
  );

  if (stats.failures.length) process.exit(2);
}

main().catch((e) => {
  console.error("[gstt-gap-backfill]", e.message);
  process.exit(1);
});
