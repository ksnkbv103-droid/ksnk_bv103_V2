#!/usr/bin/env node
/**
 * Dọn dữ liệu thử có tiền tố «UAT-» (quy ước PO 2026-11-10: tiền tố mã/tiêu đề).
 * CHỈ DB local (Docker). Mặc định chỉ liệt kê (dry); thêm --apply mới xóa.
 *
 * Usage:
 *   node scripts/uat-cleanup.mjs            # liệt kê số dòng khớp
 *   node scripts/uat-cleanup.mjs --apply    # xóa thật
 *
 * Thêm bảng mới vào TARGETS khi module khác bắt đầu có dữ liệu thử; cột phải là cột chữ.
 * Không dùng cho staging/prod: script không có đường nối tới DB từ xa.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "UAT-";
const apply = process.argv.includes("--apply");

/** Thứ tự xóa: bảng con trước bảng cha. */
const TARGETS = [
  { table: "qlcv_fact_cong_viec", column: "tieu_de" },
  { table: "qlcv_fact_cong_viec_dinh_ky", column: "tieu_de" },
  // Kho hóa chất CSSD: giao dịch (FK RESTRICT) xóa trước danh mục; khớp theo mã mặt hàng UAT.
  {
    table: "cssd_fact_kho_hoa_chat_giao_dich",
    column: "ma_phieu",
    where: `dm_hoa_chat_id in (select id from public.cssd_dm_hoa_chat where ma_hoa_chat like '${PREFIX}%')`,
  },
  { table: "cssd_dm_hoa_chat", column: "ma_hoa_chat" },
];

function runSql(sql) {
  const r = spawnSync("npx", ["supabase", "db", "query", "--local", "--agent=no", sql], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID ?? "ksnk_bv103" },
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  return r.stdout;
}

for (const { table, column, where: customWhere } of TARGETS) {
  if (!/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) {
    console.error(`Tên bảng/cột không hợp lệ: ${table}.${column}`);
    process.exit(1);
  }
  const where = customWhere ?? `${column} like '${PREFIX}%'`;
  if (apply) {
    console.log(`Xóa ${table} where ${where}`);
    console.log(runSql(`delete from public.${table} where ${where} returning id`));
  } else {
    console.log(`[dry] ${table}`);
    console.log(runSql(`select id, ${column} from public.${table} where ${where} order by 2`));
  }
}
if (!apply) console.log("Chạy lại với --apply để xóa.");
