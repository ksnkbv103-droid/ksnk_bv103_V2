import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NKBV-040 — listNkbvViSinhStore trả mã bệnh án, mã bệnh nhân, họ tên người bệnh và cho tìm theo họ tên,
 * nên phải chặn Hội đồng KSNK thuần TRƯỚC mọi truy vấn (M03 cột BGĐ «Xa»; HĐ ≈ BGĐ là giả định chờ PO).
 * Cổng cũ chỉ trả rỗng khi restriction khác «all» mà Hội đồng luôn là «all». Vai khác giữ nguyên hành vi cũ.
 * Cùng mẫu NKBV-034 (giam-sat-nkbv-read-identity.actions.spec.ts) và NKBV-039.
 */
const K1 = "11111111-1111-4111-8111-111111111111";
const TEN = "Nguyen Van A";
const MA_BA = "BA-777";
const MA_BN = "BN-888";

const mocks = vi.hoisted(() => ({
  restriction: { v: { kind: "all" } as { kind: string; khoaId?: string } },
  denied: { v: false },
  rows: { v: [] as Array<Record<string, unknown>> },
  from: vi.fn(),
  or: vi.fn(),
  userClient: vi.fn(),
  adminClient: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvIdentityScope: async () => ({ restriction: mocks.restriction.v, identityDenied: mocks.denied.v }),
  getNkbvKhoaRestriction: async () => mocks.restriction.v,
  NKBV_OUT_OF_SCOPE_ERROR: "OUT_OF_SCOPE",
}));
vi.mock("@/lib/supabase-server", () => {
  // Chuỗi truy vấn giả: mọi phương thức trả chính nó; await → mocks.rows (dòng có họ tên thật để lộ là thấy ngay).
  const makeChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (typeof prop === "symbol") return undefined;
          if (prop === "then") return (res: (v: unknown) => void) => res({ data: mocks.rows.v, error: null });
          if (prop === "or") {
            return (...a: unknown[]) => {
              mocks.or(...a);
              return chain;
            };
          }
          return () => chain;
        },
      },
    );
    return chain;
  };
  const client = {
    from: (table: string) => {
      mocks.from(table);
      return makeChain();
    },
  };
  return {
    createServerSupabaseUserClient: async () => {
      mocks.userClient();
      return client;
    },
    createAdminSupabaseClient: () => {
      mocks.adminClient();
      return client;
    },
  };
});

import { verifyPermission } from "@/lib/server-permission";
import { NKBV_HOI_DONG_IDENTITY_DENIED } from "../lib/nkbv-khoa-scope";
import { listNkbvViSinhStore } from "./giam-sat-nkbv-vi-sinh-store.actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.denied.v = false;
  mocks.restriction.v = { kind: "all" };
  mocks.rows.v = [
    {
      id: "vs-1",
      ma_xet_nghiem: "XN-001",
      ma_benh_an: MA_BA,
      ma_benh_nhan: MA_BN,
      ho_ten_benh_nhan: TEN,
      ngay_lay_mau: "2026-11-01",
      khoa_yeu_cau_id: K1,
      loai_benh_pham: "Mau",
      loai_benh_pham_chuan: null,
      tac_nhan: "E. coli",
      so_luong: null,
      ket_qua_phan_loai: null,
      is_mdro: false,
      mdro_phenotype: null,
      metadata: {},
    },
  ];
});

describe("NKBV-040 Hội đồng KSNK thuần: kho vi sinh có danh tính bị chặn trước mọi truy vấn", () => {
  beforeEach(() => {
    mocks.denied.v = true;
  });
  const chanTruocTruyVan = () => {
    expect(verifyPermission).toHaveBeenCalledWith("GIAM_SAT_NKBV", "view");
    expect(mocks.userClient).not.toHaveBeenCalled();
    expect(mocks.adminClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.or).not.toHaveBeenCalled();
  };

  it("không truy vấn và không trả mã bệnh án, mã bệnh nhân, họ tên", async () => {
    const res = await listNkbvViSinhStore();
    expect(res).toEqual({ success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED, data: [] });
    const dumped = JSON.stringify(res);
    expect(dumped).not.toContain(TEN);
    expect(dumped).not.toContain(MA_BA);
    expect(dumped).not.toContain(MA_BN);
    chanTruocTruyVan();
  });

  it("tìm theo họ tên không chạy (không dò được tên qua kết quả)", async () => {
    const res = await listNkbvViSinhStore({ q: TEN, limit: 80 });
    expect(res).toEqual({ success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED, data: [] });
    chanTruocTruyVan();
  });
});

describe("NKBV-040 vai khác không bị chặn (giữ hành vi cũ)", () => {
  it("kind=all (NV KSNK, CNK, Admin): truy vấn nkbv_fact_vi_sinh và trả mã bệnh án, mã bệnh nhân, họ tên", async () => {
    const res = await listNkbvViSinhStore();
    expect(res.success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("nkbv_fact_vi_sinh");
    expect(res.success && res.data).toEqual([
      expect.objectContaining({ ma_benh_an: MA_BA, ma_benh_nhan: MA_BN, ho_ten_benh_nhan: TEN }),
    ]);
  });

  it("kind=all: tìm theo họ tên vẫn lọc cả cột ho_ten_benh_nhan", async () => {
    await listNkbvViSinhStore({ q: "Nguyen" });
    expect(mocks.or).toHaveBeenCalledTimes(1);
    expect(String(mocks.or.mock.calls[0][0])).toContain("ho_ten_benh_nhan.ilike.%Nguyen%");
  });

  it("kind=khoa và kind=none: rỗng như cũ, không truy vấn", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    expect(await listNkbvViSinhStore()).toEqual({ success: true, data: [] });
    mocks.restriction.v = { kind: "none" };
    expect(await listNkbvViSinhStore({ q: TEN })).toEqual({ success: true, data: [] });
    expect(mocks.userClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
