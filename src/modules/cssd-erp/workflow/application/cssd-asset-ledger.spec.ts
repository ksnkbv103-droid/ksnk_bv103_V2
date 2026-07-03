import { describe, expect, it, vi } from "vitest";
import { assertLedgerDuChoCapPhat } from "./cssd-asset-ledger";

function chain(resolved: { data: unknown; error: null }) {
  const tail = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    update: vi.fn().mockReturnThis(),
    then(onFulfilled?: (v: typeof resolved) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
  };
  return tail;
}

describe("assertLedgerDuChoCapPhat", () => {
  it("blocks empty quy_trinh_id", async () => {
    const r = await assertLedgerDuChoCapPhat({ from: vi.fn() } as never, "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/quy_trinh_id/i);
  });

  it("returns warning (Q2) when thiếu cấu phần theo view realtime", async () => {
    const qt = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "qt-1",
          bo_dung_cu_id: "bo-1",
          metadata: {},
          bom_kiem_dem_at: null,
        },
        error: null,
      }),
    };

    const realtime = chain({
      data: [
        {
          ten_loai_dung_cu: "Kéo",
          so_luong_tieu_chuan: 2,
          so_luong_thuc_te: 1,
          is_missing: true,
          missing_count: 1,
        },
      ],
      error: null,
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "cssd_fact_quy_trinh") return qt;
        if (table === "v_cssd_bo_dung_cu_chi_tiet_realtime") return realtime;
        return chain({ data: [], error: null });
      }),
    };

    const r = await assertLedgerDuChoCapPhat(client as never, "qt-1");
    expect(r.ok).toBe(true);
    if (r.ok && "warning" in r) expect(r.warning).toMatch(/Thiếu cấu phần/i);
  });

  it("passes when đủ cấu phần", async () => {
    const qt = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "qt-1", bo_dung_cu_id: "bo-1", metadata: {} },
        error: null,
      }),
    };

    const realtime = chain({
      data: [
        {
          ten_loai_dung_cu: "Kéo",
          so_luong_tieu_chuan: 2,
          so_luong_thuc_te: 2,
          is_missing: false,
          missing_count: 0,
        },
      ],
      error: null,
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "cssd_fact_quy_trinh") return qt;
        if (table === "v_cssd_bo_dung_cu_chi_tiet_realtime") return realtime;
        return chain({ data: [], error: null });
      }),
    };

    const r = await assertLedgerDuChoCapPhat(client as never, "qt-1");
    expect(r.ok).toBe(true);
    expect("warning" in r).toBe(false);
  });
});
