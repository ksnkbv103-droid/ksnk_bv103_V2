import { describe, expect, it, vi } from "vitest";
import { assertLedgerDuChoCapPhat } from "./cssd-asset-ledger";

function chain(resolved: { data: unknown; error: null }) {
  const tail = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
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

  it("blocks CAP_PHAT when chưa KIEM_DEM_BOM", async () => {
    const qt = chain({
      data: { id: "qt-1", bo_dung_cu_id: "bo-1" },
      error: null,
    });
    const events = chain({ data: [], error: null });
    let thanhPhanCalls = 0;

    const client = {
      from: vi.fn((table: string) => {
        if (table === "cssd_fact_quy_trinh") return qt;
        if (table === "cssd_fact_lifecycle_event") return events;
        if (table === "cssd_fact_quy_trinh_thanh_phan") {
          thanhPhanCalls += 1;
          if (thanhPhanCalls === 1) {
            return chain({ data: [{ id: "tp-1" }], error: null });
          }
          return chain({
            data: [
              {
                quy_trinh_id: "qt-1",
                dm_bo_dung_cu_chi_tiet_id: "c1",
                ten_dung_cu_le: "Kéo",
                so_luong_ke_hoach: 1,
                so_luong_thuc_te: 1,
              },
            ],
            error: null,
          });
        }
        return chain({ data: [], error: null });
      }),
    };

    const r = await assertLedgerDuChoCapPhat(client as never, "qt-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/KIỂM ĐẾM/i);
  });

  it("returns warning (Q2) when thiếu cấu phần but đã KIEM_DEM_BOM", async () => {
    const qt = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "qt-1", bo_dung_cu_id: "bo-1" },
        error: null,
      }),
    };
    const events = chain({ data: [{ id: "ev-1" }], error: null });
    const thanhPhanFull = chain({
      data: [
        {
          quy_trinh_id: "qt-1",
          dm_bo_dung_cu_chi_tiet_id: "c1",
          ten_dung_cu_le: "Kéo",
          so_luong_ke_hoach: 2,
          so_luong_thuc_te: 1,
        },
      ],
      error: null,
    });
    const thanhPhanExisting = chain({ data: [{ id: "tp-1" }], error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "cssd_fact_quy_trinh") return qt;
        if (table === "cssd_fact_lifecycle_event") return events;
        if (table === "cssd_fact_quy_trinh_thanh_phan") {
          return {
            select: vi.fn((cols: string) => {
              if (String(cols).includes("so_luong_ke_hoach")) return thanhPhanFull;
              return thanhPhanExisting;
            }),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: "tp-1" }], error: null }),
            then(onFulfilled?: (v: { data: unknown; error: null }) => unknown) {
              return Promise.resolve({ data: [{ id: "tp-1" }], error: null }).then(onFulfilled);
            },
          };
        }
        return chain({ data: [], error: null });
      }),
    };

    const r = await assertLedgerDuChoCapPhat(client as never, "qt-1");
    expect(r.ok).toBe(true);
    if (r.ok && "warning" in r) expect(r.warning).toMatch(/Thiếu cấu phần/i);
  });
});
