import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Lát 1c (e2e smoke GSC): panel «Bao phủ tự giám sát theo khoa» hiện banner «Invalid UUID» khi bộ lọc khoa gửi id seed
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001`. Zod 4 `z.string().uuid()` kiểm RFC (nibble phiên bản 1–8) nên từ chối id này;
 * cột `mdm_dm_khoa_phong.id` là `uuid` Postgres, chấp nhận mọi dạng 8-4-4-4-12 hex. Test dừng ở `verifyPermission`
 * (mock ném lỗi) để chỉ kiểm bước parse input, không dựng DB.
 */

const mocks = vi.hoisted(() => ({ verifyPermission: vi.fn() }));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseUserClient: vi.fn() }));
vi.mock("@/lib/analytics/gsc-tgs-session-hits", () => ({ fetchGscTgsSessionHits: vi.fn() }));

import { getTgsCoverageRankingAction } from "./tgs-coverage-ranking.actions";

const KY = { tu_ngay: "2026-09-01", den_ngay: "2026-11-19" };

describe("getTgsCoverageRankingAction — parse khoa_ids", () => {
  beforeEach(() => {
    mocks.verifyPermission.mockReset();
    mocks.verifyPermission.mockRejectedValue(new Error("DA_QUA_PARSE"));
  });

  it("nhận id khoa seed không chuẩn RFC (qua parse, tới bước kiểm quyền)", async () => {
    const res = await getTgsCoverageRankingAction({ ...KY, khoa_ids: ["aaaaaaaa-bbbb-cccc-dddd-000000000001"] });
    expect(res).toEqual({ success: false, error: "DA_QUA_PARSE" });
  });

  it("nhận id UUID v4 chuẩn", async () => {
    const res = await getTgsCoverageRankingAction({ ...KY, khoa_ids: ["3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34"] });
    expect(res).toEqual({ success: false, error: "DA_QUA_PARSE" });
  });

  it("vẫn từ chối chuỗi không phải UUID (không tới bước kiểm quyền)", async () => {
    const res = await getTgsCoverageRankingAction({ ...KY, khoa_ids: ["khong-phai-uuid"] });
    expect(res.success).toBe(false);
    expect(mocks.verifyPermission).not.toHaveBeenCalled();
  });
});
