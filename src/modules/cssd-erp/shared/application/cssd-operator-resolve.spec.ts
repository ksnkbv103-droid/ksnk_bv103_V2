import { describe, expect, it } from "vitest";
import { resolveCssdOperatorNhanSuId } from "./cssd-operator-resolve";

describe("resolveCssdOperatorNhanSuId", () => {
  it("returns null when no match criteria", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
            ilike: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        }),
      }),
      auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
    } as never;

    await expect(resolveCssdOperatorNhanSuId(client, {})).resolves.toBeNull();
  });
});
