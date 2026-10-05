import { describe, expect, it } from "vitest";
import { hasSelfRolePermissionEdits, samePermissionIdSet } from "./rbac-matrix-self-edit";

describe("samePermissionIdSet", () => {
  it("ignores order", () => {
    expect(samePermissionIdSet(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("detects length or member diffs", () => {
    expect(samePermissionIdSet(["a"], ["a", "b"])).toBe(false);
    expect(samePermissionIdSet(["a"], ["b"])).toBe(false);
  });
});

describe("hasSelfRolePermissionEdits", () => {
  const admin = "role-admin";
  const staff = "role-staff";

  it("does not treat ADMIN presence in full matrix as self-edit", () => {
    expect(
      hasSelfRolePermissionEdits({
        matrix: { [admin]: ["p1"], [staff]: ["p2"] },
        ownRoleIds: [admin],
        adminRoleId: admin,
        existingByRole: { [admin]: ["p9"] },
      }),
    ).toBe(false);
  });

  it("allows unchanged non-ADMIN own role in full matrix", () => {
    expect(
      hasSelfRolePermissionEdits({
        matrix: { [admin]: ["p1"], [staff]: ["p2", "p3"] },
        ownRoleIds: [admin, staff],
        adminRoleId: admin,
        existingByRole: { [staff]: ["p3", "p2"] },
      }),
    ).toBe(false);
  });

  it("blocks real permission changes on non-ADMIN own role", () => {
    expect(
      hasSelfRolePermissionEdits({
        matrix: { [admin]: ["p1"], [staff]: ["p2"] },
        ownRoleIds: [admin, staff],
        adminRoleId: admin,
        existingByRole: { [staff]: ["p2", "p3"] },
      }),
    ).toBe(true);
  });

  it("ignores own roles absent from matrix payload", () => {
    expect(
      hasSelfRolePermissionEdits({
        matrix: { [admin]: ["p1"] },
        ownRoleIds: [staff],
        adminRoleId: admin,
        existingByRole: { [staff]: ["p2"] },
      }),
    ).toBe(false);
  });
});
