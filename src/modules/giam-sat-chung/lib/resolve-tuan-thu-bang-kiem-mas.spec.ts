import { describe, expect, it, vi } from "vitest";
import { resolveTuanThuBangKiemMas } from "./resolve-tuan-thu-bang-kiem-mas";

describe("resolveTuanThuBangKiemMas", () => {
  it("trả mas từ gstt_dm_bang_kiem TUAN_THU", async () => {
    const or = vi.fn(async () => ({
      data: [{ ma_bk: " BK.01 " }, { ma_bk: "" }, { ma_bk: "BK.02" }],
      error: null,
    }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ or })),
      })),
    };
    const res = await resolveTuanThuBangKiemMas(supabase);
    expect(res).toEqual({ success: true, mas: ["BK.01", "BK.02"] });
    expect(supabase.from).toHaveBeenCalledWith("gstt_dm_bang_kiem");
    expect(or).toHaveBeenCalledWith("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
  });
});
