#!/usr/bin/env node
/**
 * CSSD-032 probe — rpc_cssd_kho_hoa_chat_ghi_giao_dich chặn phiếu XUẤT thứ hai cùng su_co_id.
 * Chỉ DB local (container supabase_db_ksnk_bv103). Mọi ghi nằm trong BEGIN … ROLLBACK.
 *
 * Ca: a) 2 lần cùng su_co_id → lần 2 P0001 · b) phiếu 1 TU_CHOI → lần 2 OK
 *     c) phiếu 1 is_active=false → lần 2 OK · d) su_co_id NULL hai lần → OK
 *     e) đua: phiên A giữ phiếu chưa commit, phiên B cùng sự cố (hóa chất khác) phải chờ khóa sự cố (lock_timeout → 55P03)
 *
 * Usage: node scripts/cssd-hc-su-co-trung-smoke.mjs
 */
import { spawn, spawnSync } from "node:child_process";

const CONTAINER = "supabase_db_ksnk_bv103";
const PSQL = ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-X", "-q"];

function psql(sql) {
  return spawnSync("docker", PSQL, { input: sql, encoding: "utf8" });
}

// Dữ liệu nền chung: actor, 2 hóa chất tạm (tạo trong giao dịch, DB local có thể chưa có danh mục), 2 sự cố chưa có phiếu hiệu lực.
const SETUP = (idxs = [1, 2]) => `
CREATE TEMP TABLE _dm ON COMMIT DROP AS
WITH ins AS (
  INSERT INTO public.cssd_dm_hoa_chat (ma_hoa_chat, ten_hoa_chat)
  SELECT 'PROBE032-' || substr(md5(random()::text), 1, 10), 'probe CSSD-032 ' || g FROM generate_series(1, 2) g
  RETURNING id, ten_hoa_chat)
SELECT id, ten_hoa_chat FROM ins;
CREATE TEMP TABLE _p ON COMMIT DROP AS
SELECT
  (SELECT auth_user_id FROM public.mdm_nhan_su WHERE is_active AND auth_user_id IS NOT NULL ORDER BY id LIMIT 1) AS actor,
  (SELECT array_agg(id ORDER BY ten_hoa_chat) FROM _dm) AS dms,
  (SELECT array_agg(id ORDER BY id) FROM (
     SELECT s.id FROM public.cssd_fact_su_co s
      WHERE NOT EXISTS (SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
                         WHERE g.su_co_id = s.id AND g.is_active AND g.trang_thai <> 'TU_CHOI')
      ORDER BY s.id LIMIT 2) y) AS scs,
  'PROBE032-' || substr(md5(random()::text), 1, 8) AS lo,
  (current_date + 365) AS han;
DO $$
DECLARE r record; i int; v uuid; -- chỉ nhập cho hóa chất cần, tránh giữ khóa hóa chất của phiên kia
BEGIN
  SELECT * INTO r FROM _p;
  IF r.actor IS NULL OR coalesce(array_length(r.dms,1),0) < 2 OR coalesce(array_length(r.scs,1),0) < 2 THEN
    RAISE EXCEPTION 'PROBE SETUP FAIL: thiếu actor/hóa chất/sự cố trên DB local';
  END IF;
  FOREACH i IN ARRAY ARRAY[${idxs.join(",")}] LOOP  -- nhập + duyệt tay để có tồn cho XUẤT
    v := public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('NHAP', r.dms[i], 100, r.lo, r.han, 'probe', NULL, r.actor, NULL, NULL);
    UPDATE public.cssd_fact_kho_hoa_chat_giao_dich SET trang_thai = 'DA_DUYET' WHERE id = v;
  END LOOP;
END $$;
`;

const XUAT = (dmIdx, sc) =>
  `public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', r.dms[${dmIdx}], 1, r.lo, r.han, 'probe', ${sc}, r.actor, NULL, 'CAP_SU_DUNG')`;

const MAIN = `
BEGIN;
${SETUP()}
DO $$
DECLARE r record; v1 uuid; v2 uuid; st text; msg text;
  want text := 'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.';
BEGIN
  SELECT * INTO r FROM _p;

  -- a) hai lần cùng su_co_id
  v1 := ${XUAT(1, "r.scs[1]")};
  BEGIN
    v2 := ${XUAT(1, "r.scs[1]")};
    RAISE EXCEPTION 'CA a FAIL: lần 2 lọt (id %)', v2;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF msg LIKE 'CA a FAIL%' OR msg <> want THEN RAISE EXCEPTION 'CA a FAIL: % %', st, msg; END IF;
  END;
  RAISE NOTICE 'CA a PASS: lần 2 → % «%»', st, msg;

  -- b) phiếu 1 TU_CHOI → lần 2 OK
  UPDATE public.cssd_fact_kho_hoa_chat_giao_dich SET trang_thai = 'TU_CHOI', ly_do_tu_choi = 'probe' WHERE id = v1;
  v2 := ${XUAT(1, "r.scs[1]")};
  RAISE NOTICE 'CA b PASS: sau TU_CHOI lập được phiếu %', v2;

  -- c) phiếu 1 is_active=false → lần 2 OK (sự cố thứ hai)
  v1 := ${XUAT(1, "r.scs[2]")};
  UPDATE public.cssd_fact_kho_hoa_chat_giao_dich SET is_active = false WHERE id = v1;
  v2 := ${XUAT(1, "r.scs[2]")};
  RAISE NOTICE 'CA c PASS: sau is_active=false lập được phiếu %', v2;

  -- d) su_co_id NULL hai lần
  v1 := ${XUAT(1, "NULL")};
  v2 := ${XUAT(1, "NULL")};
  RAISE NOTICE 'CA d PASS: su_co_id NULL hai phiếu % / %', v1, v2;
END $$;
ROLLBACK;
`;

// e) đua: A giữ phiếu (chưa commit) 4 s; B (hóa chất khác, cùng sự cố) phải kẹt ở khóa sự cố.
const RACE_A = `
BEGIN;
${SETUP([1])}
DO $$ DECLARE r record; v uuid; BEGIN SELECT * INTO r FROM _p; v := ${XUAT(1, "r.scs[1]")}; END $$;
SELECT pg_sleep(4);
ROLLBACK;
`;
const RACE_B = `
BEGIN;
${SETUP([2])}
SET LOCAL lock_timeout = '1500ms';
DO $$
DECLARE r record; v uuid; st text; msg text;
BEGIN
  SELECT * INTO r FROM _p;
  BEGIN
    v := ${XUAT(2, "r.scs[1]")};
    RAISE EXCEPTION 'CA e FAIL: phiên B không bị chặn bởi khóa sự cố (id %)', v;
  EXCEPTION WHEN lock_not_available THEN
    GET STACKED DIAGNOSTICS st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    RAISE NOTICE 'CA e PASS: phiên B chờ khóa sự cố → % «%»', st, msg;
  END;
END $$;
ROLLBACK;
`;

let failed = false;
const m = psql(MAIN);
process.stdout.write(m.stdout);
process.stderr.write(m.stderr);
if (m.status !== 0) failed = true;

const a = spawn("docker", PSQL, { stdio: ["pipe", "pipe", "pipe"] });
const aDone = new Promise((res) => a.on("close", res));
let aErr = "";
a.stderr.on("data", (d) => (aErr += d));
a.stdout.on("data", (d) => process.stdout.write(d));
a.stdin.end(RACE_A);
await new Promise((res) => setTimeout(res, 1500));
const b = psql(RACE_B);
process.stdout.write(b.stdout);
process.stderr.write(b.stderr);
if (b.status !== 0) failed = true;
const aCode = await aDone;
if (aCode !== 0) {
  failed = true;
  process.stderr.write(`phiên A lỗi: ${aErr}`);
}

const left = psql(
  "SELECT (SELECT count(*) FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE ma_lo LIKE 'PROBE032-%')" +
    " + (SELECT count(*) FROM public.cssd_dm_hoa_chat WHERE ma_hoa_chat LIKE 'PROBE032-%');",
);
const n = (left.stdout.match(/\d+/) || ["?"])[0];
if (n !== "0") {
  failed = true;
  console.error(`dữ liệu dư: ${n} dòng PROBE032`);
}
console.log(failed ? "\n[smoke:cssd-hc-su-co-trung] FAILED" : "\n[smoke:cssd-hc-su-co-trung] PASSED (dữ liệu dư: 0)");
process.exit(failed ? 1 : 0);
