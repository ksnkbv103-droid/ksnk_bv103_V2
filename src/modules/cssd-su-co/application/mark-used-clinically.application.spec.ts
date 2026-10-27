import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { markCssdUsedClinically } from "./mark-used-clinically.application";

function fakeClient(row: Record<string, unknown>) {
  const rpcCalls: string[] = [];
  const from = () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({ data: row, error: null });
    return chain;
  };
  const rpc = async (name: string) => {
    rpcCalls.push(name);
    return { error: null };
  };
  return { client: { from, rpc } as unknown as SupabaseClient, rpcCalls };
}

describe("markCssdUsedClinically — cổng cấp phát", () => {
  it("chu trình chưa cấp phát → từ chối, không ghi", async () => {
    const w = fakeClient({ id: "q1", is_active: true, metadata: {}, thoi_gian_cap_phat: null });
    await expect(
      markCssdUsedClinically(w.client, { quyTrinhId: "q1", actor: "u1", source: "CLINICAL", maCaMoId: "CA1" }),
    ).rejects.toThrow(/chưa cấp phát/);
    expect(w.rpcCalls).toHaveLength(0);
  });

  it("đã cấp phát → ghi qua RPC merge", async () => {
    const w = fakeClient({ id: "q1", is_active: true, metadata: {}, thoi_gian_cap_phat: "2026-10-01T00:00:00Z" });
    await markCssdUsedClinically(w.client, { quyTrinhId: "q1", actor: "u1", source: "CLINICAL", maCaMoId: "CA1" });
    expect(w.rpcCalls).toEqual(["rpc_cssd_quy_trinh_metadata_merge"]);
  });
});
