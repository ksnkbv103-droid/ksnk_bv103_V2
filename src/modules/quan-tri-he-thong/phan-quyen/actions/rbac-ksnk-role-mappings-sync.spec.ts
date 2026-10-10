import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncKsnkRolePermissionMappings } from "./rbac-ksnk-role-mappings";

type Row = Record<string, unknown>;

/** Fake Supabase tối thiểu: đủ cho upsert / select / delete + eq / in mà hàm sync dùng. */
function fakeDb(seed: Record<string, Row[]>, failOn?: { table: string; op: string }) {
  const db = seed;
  const ops: string[] = [];
  const from = (table: string) => {
    let op = "select";
    let payload: Row[] = [];
    const filters: ((r: Row) => boolean)[] = [];
    const run = () => {
      ops.push(`${op}:${table}`);
      if (failOn && failOn.table === table && failOn.op === op) {
        return { data: null, error: new Error(`fail ${op} ${table}`) };
      }
      const rows = db[table] || (db[table] = []);
      if (op === "upsert") {
        for (const p of payload) {
          const dup = rows.find((r) =>
            table === "sys_roles"
              ? r.name === p.name
              : r.role_id === p.role_id && r.permission_id === p.permission_id,
          );
          if (!dup) rows.push({ id: `${table}-${rows.length}`, ...p });
        }
        return { data: null, error: null };
      }
      if (op === "delete") {
        db[table] = rows.filter((r) => !filters.every((f) => f(r)));
        return { data: null, error: null };
      }
      return { data: rows.filter((r) => filters.every((f) => f(r))), error: null };
    };
    const q = {
      select: () => q,
      upsert: (p: Row[]) => ((op = "upsert"), (payload = p), q),
      delete: () => ((op = "delete"), q),
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, ko),
    };
    return q;
  };
  return { client: { from } as unknown as SupabaseClient, db, ops };
}

const perms = [
  { id: "p-view", module_name: "THONG_KE_VST", action: "view" },
  { id: "p-junk", module_name: "KHONG_TON_TAI", action: "edit" },
];

describe("syncKsnkRolePermissionMappings — diff, không xóa-hết-rồi-chèn", () => {
  it("bỏ quyền thừa, giữ quyền đúng preset, không trùng dòng", async () => {
    const { client, db } = fakeDb({
      sys_roles: [{ id: "r-khach", name: "KHACH_THONG_KE_GSTT", is_active: true }],
      sys_permissions: perms,
      sys_role_permissions: [
        { role_id: "r-khach", permission_id: "p-junk" },
        { role_id: "r-khach", permission_id: "p-view" },
      ],
    });
    await syncKsnkRolePermissionMappings(client);
    const mine = db.sys_role_permissions.filter((r) => r.role_id === "r-khach").map((r) => r.permission_id);
    expect(mine).not.toContain("p-junk");
    expect(new Set(mine).size).toBe(mine.length);
  });

  it("thêm trước, bớt sau: lỗi ở bước bớt không làm vai trò trắng quyền", async () => {
    const { client, db, ops } = fakeDb(
      {
        sys_roles: [{ id: "r-khach", name: "KHACH_THONG_KE_GSTT", is_active: true }],
        sys_permissions: perms,
        sys_role_permissions: [{ role_id: "r-khach", permission_id: "p-junk" }],
      },
      { table: "sys_role_permissions", op: "delete" },
    );
    await expect(syncKsnkRolePermissionMappings(client)).rejects.toThrow();
    const rpOps = ops.filter((o) => o.endsWith(":sys_role_permissions"));
    expect(rpOps.indexOf("upsert:sys_role_permissions")).toBeLessThan(rpOps.indexOf("delete:sys_role_permissions"));
    expect(db.sys_role_permissions.some((r) => r.role_id === "r-khach")).toBe(true);
  });
});
