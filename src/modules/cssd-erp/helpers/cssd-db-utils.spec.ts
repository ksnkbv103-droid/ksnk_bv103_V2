import { describe, expect, it } from "vitest";
import { clearTableHasColumnCache, tableHasColumn } from "../shared/cssd-db-utils";

function mockClient(errorMessage: string | null) {
  return {
    from: () => ({
      select: () => ({
        limit: async () => ({
          data: errorMessage ? null : [{ id: "1" }],
          error: errorMessage ? { message: errorMessage } : null,
        }),
      }),
    }),
  } as never;
}

describe("tableHasColumn", () => {
  it("returns true only when probe succeeds", async () => {
    clearTableHasColumnCache();
    await expect(tableHasColumn(mockClient(null), "cssd_fact_quy_trinh", "is_red_alert")).resolves.toBe(true);
  });

  it("returns false on Postgres missing-column error (no false-positive)", async () => {
    clearTableHasColumnCache();
    await expect(
      tableHasColumn(
        mockClient("column v_cssd_quy_trinh_full.is_red_alert does not exist"),
        "v_cssd_quy_trinh_full",
        "is_red_alert",
      ),
    ).resolves.toBe(false);
  });

  it("returns false on PostgREST schema-cache missing column", async () => {
    clearTableHasColumnCache();
    await expect(
      tableHasColumn(
        mockClient("Could not find the 'is_red_alert' column of 'v_cssd_quy_trinh_full' in the schema cache"),
        "v_cssd_quy_trinh_full",
        "is_red_alert",
      ),
    ).resolves.toBe(false);
  });
});
