import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = resolve(__dirname, "../../scripts/guard-adr.mjs");
const GOOD_ADR = "## Phương án\nA: thêm cột. B: bảng mới.\n## Phản biện\nPhương án 3: view.\n## Chọn\nA.\n";

function repo(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "guard-adr-"));
  mkdirSync(join(root, "supabase/migrations"), { recursive: true });
  mkdirSync(join(root, "docs/adr"), { recursive: true });
  writeFileSync(join(root, "supabase/PROD_HEAD"), "20260101000000\n");
  for (const [p, c] of Object.entries(files)) writeFileSync(join(root, p), c);
  return root;
}
const run = (root: string, args: string[], input?: string) =>
  spawnSync("node", [SCRIPT, ...args], { env: { ...process.env, GUARD_ADR_ROOT: root }, input, encoding: "utf8" });
const hookInput = (root: string, name: string, content: string) =>
  JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(root, "supabase/migrations", name), content } });

describe("guard-adr", () => {
  it("lint: migration > head không có dòng ADR → exit 1", () => {
    const r = repo({ "supabase/migrations/20260201000000_a.sql": "select 1;" });
    expect(run(r, []).status).toBe(1);
  });
  it("lint: ADR trỏ file không tồn tại → exit 1", () => {
    const r = repo({ "supabase/migrations/20260201000000_a.sql": "-- ADR: docs/adr/ADR-001.md\nselect 1;" });
    expect(run(r, []).status).toBe(1);
  });
  it("lint: ADR thiếu mục Phản biện → exit 1", () => {
    const r = repo({
      "supabase/migrations/20260201000000_a.sql": "-- ADR: docs/adr/ADR-001.md\nselect 1;",
      "docs/adr/ADR-001.md": "## Phương án\nA\n## Chọn\nA\n",
    });
    const out = run(r, []);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("Phản biện");
  });
  it("lint: ADR đủ mục → exit 0; migration ≤ head không xét", () => {
    const r = repo({
      "supabase/migrations/20250101000000_old.sql": "select 1;",
      "supabase/migrations/20260201000000_a.sql": "-- ADR: docs/adr/ADR-001.md\nselect 1;",
      "docs/adr/ADR-001.md": GOOD_ADR,
    });
    expect(run(r, []).status).toBe(0);
  });
  it("hook: Write migration > head thiếu ADR → exit 2; có ADR hợp lệ → exit 0; ≤ head → exit 0", () => {
    const r = repo({ "docs/adr/ADR-001.md": GOOD_ADR });
    expect(run(r, ["--hook"], hookInput(r, "20260201000000_a.sql", "select 1;")).status).toBe(2);
    expect(run(r, ["--hook"], hookInput(r, "20260201000000_a.sql", "-- ADR: docs/adr/ADR-001.md\nselect 1;")).status).toBe(0);
    expect(run(r, ["--hook"], hookInput(r, "20250101000000_old.sql", "select 1;")).status).toBe(0);
  });
});
