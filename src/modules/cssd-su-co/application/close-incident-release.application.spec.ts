import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeCloseIncidentRelease } from "./close-incident-release.application";

function fakeSupabase(attributes: Record<string, unknown>) {
  const update = vi.fn();
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: { id: "i1", attributes, is_active: true, quy_trinh_id: null }, error: null }),
    update: (...a: unknown[]) => {
      update(...a);
      return { eq: async () => ({ error: null }) };
    },
  };
  return { client: { from: () => builder } as unknown as SupabaseClient, update };
}

const base = {
  incidentId: "i1",
  lyDo: "Kiểm tra đạt",
  soBienBan: "BB-1",
  actorRoles: ["ADMIN"],
  actorNhanSuId: "n1",
  actorAuthUserId: "a1",
  actorHoTen: "Admin",
};

describe("executeCloseIncidentRelease — bộ chờ thu về", () => {
  it("chặn đóng khi còn bộ CHO_THU_VE và không ghi gì", async () => {
    const { client, update } = fakeSupabase({
      INCIDENT_STATUS: "DA_XAC_NHAN",
      RECALL_HOLD_PENDING: [
        { quyTrinhId: "q1", maBo: "B01", trangThai: "CHO_THU_VE" },
        { quyTrinhId: "q2", maBo: "B02", trangThai: "DA_THU_VE" },
      ],
    });
    const res = await executeCloseIncidentRelease(client, base);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toContain("Còn 1 bộ");
    expect(update).not.toHaveBeenCalled();
  });

  it("cho đóng khi mọi bộ đã thu về", async () => {
    const { client, update } = fakeSupabase({
      INCIDENT_STATUS: "DA_XAC_NHAN",
      RECALL_HOLD_PENDING: [{ quyTrinhId: "q1", maBo: "B01", trangThai: "DA_THU_VE" }],
    });
    const res = await executeCloseIncidentRelease(client, base);
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
