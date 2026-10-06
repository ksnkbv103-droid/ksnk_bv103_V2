import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PKG = join(ROOT, "package.json");
const ROOT_MIGRATION =
  "supabase/migrations/20260904140000_cssd_fact_quy_trinh_lo_write_rls.sql";
const ARCHIVED_MIGRATION =
  "supabase/migrations/archive_legacy/drafts/20260904140000_cssd_fact_quy_trinh_lo_write_rls.sql";

describe("mdm:migrate guard (chặn db push nhầm prod)", () => {
  const scripts = JSON.parse(readFileSync(PKG, "utf8")).scripts as Record<
    string,
    string
  >;

  it("mdm:migrate không gọi supabase db push và exit 1", () => {
    const cmd = scripts["mdm:migrate"] ?? "";
    // Cảnh báo được phép nhắc "db push"; cấm lệnh thực thi.
    expect(cmd).not.toMatch(/npx\s+supabase\s+db\s+push/);
    expect(cmd).toMatch(/process\.exit\(1\)/);
  });

  it("mdm:migrate:local vẫn là npx supabase db push --local", () => {
    expect(scripts["mdm:migrate:local"]).toBe(
      "npx supabase db push --local",
    );
  });

  it("pilot:ship không chứa mdm:migrate", () => {
    const steps = (scripts["pilot:ship"] ?? "")
      .split("&&")
      .map((s) => s.trim());
    expect(steps).not.toContain("npm run mdm:migrate");
  });

  it("20260904140000 không còn ở migrations gốc; có trong archive_legacy/drafts", () => {
    expect(existsSync(join(ROOT, ROOT_MIGRATION))).toBe(false);
    expect(existsSync(join(ROOT, ARCHIVED_MIGRATION))).toBe(true);
  });
});
