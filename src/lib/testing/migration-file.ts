import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Helper cho spec đọc SQL migration: tìm theo tên sau timestamp, không theo version cứng.
 * Version file có thể đổi để khớp `schema_migrations` prod (vd MCP apply_migration ghi giờ apply),
 * nên spec gắn tên đầy đủ sẽ gãy (ENOENT) mỗi lần đổi tên.
 * Chỉ xét `supabase/migrations/` gốc (không archive_legacy/); bắt buộc đúng 1 file khớp.
 */
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `name` = phần sau `<14 chữ số>_`, có/không có `.sql` (vd `cssd_ledger_atomic`). */
export function findMigrationFile(name: string): string {
  const base = name.replace(/\.sql$/, "");
  const re = new RegExp(`^\\d{14}_${escapeRegExp(base)}\\.sql$`);
  const hits = readdirSync(MIGRATIONS_DIR).filter((f) => re.test(f));
  if (hits.length !== 1) {
    throw new Error(
      `Cần đúng 1 migration *_${base}.sql trong supabase/migrations, thấy ${hits.length}: ${hits.join(", ") || "(không có)"}`,
    );
  }
  return join(MIGRATIONS_DIR, hits[0]!);
}

export function readMigrationSql(name: string): string {
  return readFileSync(findMigrationFile(name), "utf8");
}
