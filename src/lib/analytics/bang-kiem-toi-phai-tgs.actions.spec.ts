import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NEN-016 lát A: `getBangKiemToiPhaiTgsAction` dùng `z.string().uuid()` cho `khoa_id`; Zod 4 kiểm RFC (nibble phiên bản 1–8)
 * nên từ chối id khoa seed `aaaaaaaa-bbbb-cccc-dddd-000000000001`. Cột `mdm_dm_khoa_phong.id` là `uuid` Postgres (mọi dạng 8-4-4-4-12 hex).
 * Test dừng ở `verifyPermission` (mock ném lỗi) để chỉ kiểm bước parse input, không dựng DB — như tgs-coverage-ranking.actions.spec.ts.
 */

const mocks = vi.hoisted(() => ({ verifyPermission: vi.fn() }));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseUserClient: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: vi.fn() }));
vi.mock("@/lib/analytics/gsc-tgs-session-hits", () => ({ fetchGscTgsSessionHits: vi.fn() }));

import { getBangKiemToiPhaiTgsAction } from "./bang-kiem-toi-phai-tgs.actions";

const KY = { tu_ngay: "2026-09-01", den_ngay: "2026-11-19" };

describe("getBangKiemToiPhaiTgsAction — parse khoa_id (NEN-016)", () => {
  beforeEach(() => {
    mocks.verifyPermission.mockReset();
    mocks.verifyPermission.mockRejectedValue(new Error("DA_QUA_PARSE"));
  });

  it("nhận id khoa seed không chuẩn RFC (qua parse, tới bước kiểm quyền)", async () => {
    const res = await getBangKiemToiPhaiTgsAction({ ...KY, khoa_id: "aaaaaaaa-bbbb-cccc-dddd-000000000001" });
    expect(res).toEqual({ success: false, error: "DA_QUA_PARSE" });
  });

  it("nhận id UUID v4 chuẩn", async () => {
    const res = await getBangKiemToiPhaiTgsAction({ ...KY, khoa_id: "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34" });
    expect(res).toEqual({ success: false, error: "DA_QUA_PARSE" });
  });

  it("vẫn từ chối chuỗi không phải UUID (không tới bước kiểm quyền)", async () => {
    const res = await getBangKiemToiPhaiTgsAction({ ...KY, khoa_id: "khong-phai-uuid" });
    expect(res.success).toBe(false);
    expect(mocks.verifyPermission).not.toHaveBeenCalled();
  });
});
