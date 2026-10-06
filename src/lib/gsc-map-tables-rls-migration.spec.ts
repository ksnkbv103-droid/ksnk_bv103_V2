import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION =
  "supabase/migrations/20261006092000_gsc_map_tables_rls.sql";

const TABLES = [
  "gstt_map_tieu_chi_orphan",
  "gstt_map_bang_kiem_short_long",
  "gstt_map_tieu_chi_merge",
] as const;

function readMigration(): string {
  return readFileSync(join(process.cwd(), MIGRATION), "utf8");
}

describe("gsc map tables RLS migration", () => {
  const sql = readMigration();

  it("enables RLS on all 3 map tables", () => {
    for (const t of TABLES) {
      expect(sql).toMatch(
        new RegExp(
          `ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY;`,
        ),
      );
    }
  });

  it("revokes all from anon on all 3 tables", () => {
    for (const t of TABLES) {
      expect(sql).toMatch(
        new RegExp(`REVOKE ALL ON TABLE public\\.${t} FROM anon;`),
      );
    }
  });

  it("revokes TRUNCATE/REFERENCES/TRIGGER from authenticated (keeps DML grants)", () => {
    for (const t of TABLES) {
      expect(sql).toMatch(
        new RegExp(
          `REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public\\.${t} FROM authenticated;`,
        ),
      );
    }
  });

  it("has 12 policies with correct names and commands", () => {
    for (const t of TABLES) {
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ${t}_select_authenticated\\s+ON public\\.${t}\\s+FOR SELECT TO authenticated\\s+USING \\(true\\);`,
        ),
      );
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ${t}_insert_admin\\s+ON public\\.${t}\\s+FOR INSERT TO authenticated\\s+WITH CHECK \\(public\\.fn_sys_is_admin\\(\\)\\);`,
        ),
      );
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ${t}_update_admin\\s+ON public\\.${t}\\s+FOR UPDATE TO authenticated\\s+USING \\(public\\.fn_sys_is_admin\\(\\)\\)\\s+WITH CHECK \\(public\\.fn_sys_is_admin\\(\\)\\);`,
        ),
      );
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ${t}_delete_admin\\s+ON public\\.${t}\\s+FOR DELETE TO authenticated\\s+USING \\(public\\.fn_sys_is_admin\\(\\)\\);`,
        ),
      );
    }
  });

  it("DROP POLICY IF EXISTS before each CREATE (idempotent)", () => {
    for (const t of TABLES) {
      for (const suffix of [
        "select_authenticated",
        "insert_admin",
        "update_admin",
        "delete_admin",
      ]) {
        expect(sql).toMatch(
          new RegExp(
            `DROP POLICY IF EXISTS ${t}_${suffix} ON public\\.${t};`,
          ),
        );
      }
    }
  });

  it("does not create policies for gstt_dm_bang_kiem or mdm_dm_khoa_phong", () => {
    expect(sql).not.toMatch(
      /CREATE POLICY[\s\S]*?ON public\.gstt_dm_bang_kiem/,
    );
    expect(sql).not.toMatch(
      /CREATE POLICY[\s\S]*?ON public\.mdm_dm_khoa_phong/,
    );
  });

  it("documents why SELECT is USING (true) for authenticated", () => {
    expect(sql).toMatch(/SELECT USING \(true\)/);
    expect(sql).toMatch(/security_invoker|SECURITY INVOKER/i);
    expect(sql).toMatch(/không gắn quyền giám sát|KHÔNG gắn quyền giám sát/i);
  });

  it("reloads PostgREST schema", () => {
    expect(sql).toMatch(/NOTIFY pgrst, 'reload schema'/);
  });

  it("revokes default privileges for anon on future tables created by postgres", () => {
    const matches = sql.match(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;/g,
    );
    expect(matches).toHaveLength(1);
  });

  it("does not GRANT anything to anon", () => {
    expect(sql).not.toMatch(/\bGRANT\b[\s\S]*?\bTO\s+anon\b/i);
  });

  it("only REVOKEs on the 3 map tables (no other table REVOKE)", () => {
    const revokeOnTable = [
      ...sql.matchAll(
        /REVOKE\s+[\w\s,]+\s+ON\s+TABLE\s+public\.(\w+)\s+FROM\s+/gi,
      ),
    ].map((m) => m[1]);
    expect(revokeOnTable.length).toBeGreaterThan(0);
    for (const table of revokeOnTable) {
      expect(TABLES).toContain(table as (typeof TABLES)[number]);
    }
  });
});
