import { describe, expect, it, vi } from "vitest";
import { assertThietBiSanSangChoMeTietKhuan } from "./assert-thiet-bi-cho-me-tiet-khuan";

describe("assertThietBiSanSangChoMeTietKhuan", () => {
  it("allows READY", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "x", ten_thiet_bi: "Lò 1", trang_thai: "READY" },
          error: null,
        }),
      }),
    };
    const r = await assertThietBiSanSangChoMeTietKhuan(client as never, "x");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ten_thiet_bi).toBe("Lò 1");
  });

  it("blocks REPAIRING", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "x", ten_thiet_bi: "Lò 1", trang_thai: "REPAIRING" },
          error: null,
        }),
      }),
    };
    const r = await assertThietBiSanSangChoMeTietKhuan(client as never, "x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/bảo trì/i);
  });

  it("blocks BROKEN", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "x", ten_thiet_bi: "Lò 2", trang_thai: "BROKEN" },
          error: null,
        }),
      }),
    };
    const r = await assertThietBiSanSangChoMeTietKhuan(client as never, "x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/hỏng|broken|sửa chữa/i);
  });
});
