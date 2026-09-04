import { describe, expect, it } from "vitest";
import { buildChiTietIssueNoteText } from "./instrument-issue-core";

describe("buildChiTietIssueNoteText", () => {
  const now = "2026-06-02 10:00:00";

  it("keeps BOM attachment note when partial quantity (no detach)", () => {
    const text = buildChiTietIssueNoteText({
      issueType: "HONG",
      note: "gãy đầu",
      oldNote: "Ghi cũ",
      oldBoId: "bo-1",
      quantity: 1,
      soLuongChiTiet: 3,
      now,
    });
    expect(text).toContain("(SL 1/3)");
    expect(text).not.toContain("Tách khỏi bộ");
    expect(text.startsWith("Ghi cũ\n")).toBe(true);
  });

  it("never appends detach / never implies BOM unlink when full quantity", () => {
    const text = buildChiTietIssueNoteText({
      issueType: "HONG",
      note: "gãy đầu",
      oldNote: "Ghi cũ",
      oldBoId: "bo-1",
      quantity: 3,
      soLuongChiTiet: 3,
      now,
    });
    expect(text).toContain("[HONG] 2026-06-02 10:00:00 - gãy đầu");
    expect(text).not.toContain("Tách khỏi bộ");
    expect(text).not.toContain("[AUTO]");
    expect(text.startsWith("Ghi cũ\n")).toBe(true);
  });

  it("writes issue line when chi tiết chưa gán bộ", () => {
    const text = buildChiTietIssueNoteText({
      issueType: "MAT",
      oldNote: "",
      oldBoId: "",
      now,
    });
    expect(text).toBe("[MAT] 2026-06-02 10:00:00");
  });
});

describe("reportChiTietInstrumentIssueAction contract", () => {
  it("exports orchestrator and legacy alias", async () => {
    const mod = await import("./append-chi-tiet-issue-note.action");
    expect(typeof mod.reportChiTietInstrumentIssueAction).toBe("function");
    expect(typeof mod.appendChiTietIssueNoteAction).toBe("function");
  });
});

describe("insertInstrumentIssueLedgerCore harden (RPC-parity tồn)", () => {
  it("rejects when quantity > thucTe (chuan + delta)", async () => {
    const { insertInstrumentIssueLedgerCore } = await import("./instrument-issue-core");
    const inserts: unknown[] = [];
    const client = {
      from(table: string) {
        if (table === "cssd_dm_bo_dung_cu_chi_tiet") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { so_luong: 2 }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cssd_fact_kho_giao_dich") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ data: [{ so_luong_thay_doi: -1 }], error: null }),
                }),
              }),
            }),
            insert: async (row: unknown) => {
              inserts.push(row);
              return { error: null };
            },
          };
        }
        throw new Error("unexpected table " + table);
      },
    };
    const r = await insertInstrumentIssueLedgerCore(client as never, {
      loaiDungCuId: "loai-1",
      issueType: "HONG",
      quantity: 2, // thucTe = 2 + (-1) = 1
      boDungCuId: "bo-1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/vượt quá số thực tế \(1\)/);
    expect(inserts).toHaveLength(0);
  });
});
