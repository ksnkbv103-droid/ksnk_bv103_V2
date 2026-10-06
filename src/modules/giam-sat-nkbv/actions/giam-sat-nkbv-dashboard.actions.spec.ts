import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(async () => ({ data: [{ ma_khoa: "K1", ten_khoa: "Khoa 1" }], error: null }));

function chainFrom() {
  const q: Record<string, unknown> = {};
  const self = {
    select: () => self,
    eq: () => self,
    gte: () => self,
    lte: () => self,
    order: () => self,
    range: async () => ({ data: [], error: null }),
  };
  Object.assign(q, self);
  return self;
}

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => chainFrom(),
    rpc,
  }),
  createServerSupabaseUserClient: vi.fn(),
}));

import { getGiamSatNkbvDashboardPayload } from "./giam-sat-nkbv-dashboard.actions";

describe("getGiamSatNkbvDashboardPayload include_rates", () => {
  beforeEach(() => {
    rpc.mockClear();
  });

  it("include_rates=false không gọi fn_nkbv_dich_te_hoc_rates", async () => {
    const res = await getGiamSatNkbvDashboardPayload({
      tu_ngay: "2026-09-01",
      den_ngay: "2026-09-30",
      include_rates: false,
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(rpc).not.toHaveBeenCalled();
    expect(res.data.epidemiologyRates).toEqual([]);
    expect(res.data.epidemiologyError).toBeNull();
  });

  it("mặc định vẫn gọi rates RPC", async () => {
    const res = await getGiamSatNkbvDashboardPayload({
      tu_ngay: "2026-09-01",
      den_ngay: "2026-09-30",
    });
    expect(res.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "fn_nkbv_dich_te_hoc_rates",
      expect.objectContaining({
        p_tu_ngay: "2026-09-01",
        p_den_ngay: "2026-09-30",
      }),
    );
  });
});
