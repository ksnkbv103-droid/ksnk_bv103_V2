import { describe, expect, it, vi } from "vitest";

const { userClient } = vi.hoisted(() => ({ userClient: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: userClient,
  createAdminSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn(async () => ({ kind: "all" })),
  NKBV_OUT_OF_SCOPE_ERROR: "out",
}));

import { updateNkbvViSinhStoreRecord } from "./giam-sat-nkbv-vi-sinh-store.actions";

describe("NKBV-007 updateNkbvViSinhStoreRecord kiểm patch trước khi ghi", () => {
  it("ngày lấy mẫu sai → trả lỗi, không ném RangeError, không chạm DB", async () => {
    const res = await updateNkbvViSinhStoreRecord("row-1", { ngay_lay_mau: "2026-13-45" });
    expect(res).toEqual({ success: false, error: "Dữ liệu không hợp lệ: ngay_lay_mau" });
    expect(userClient).not.toHaveBeenCalled();
  });

  it("kết quả / phenotype ngoài danh mục → trả lỗi nêu trường", async () => {
    const res = await updateNkbvViSinhStoreRecord("row-1", {
      ket_qua: "XYZ" as never,
      mdro_phenotype: "ABC" as never,
    });
    expect(res.success).toBe(false);
    expect("error" in res ? res.error : "").toContain("ket_qua");
    expect("error" in res ? res.error : "").toContain("mdro_phenotype");
    expect(userClient).not.toHaveBeenCalled();
  });
});
