import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { buildMeGhiTestList, ghiCacTestMe } from "./me-tiet-khuan-ghi-test";

const fake = (reply: (a: Record<string, unknown>) => unknown) => {
  const calls: Record<string, unknown>[] = [];
  const client = {
    rpc: async (_n: string, a: Record<string, unknown>) => {
      calls.push(a);
      return { data: reply(a), error: null };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
};
const tests = { thongSoVatLy: "DAT", ciNgoaiGoi: "DAT", ciPcd: "", trangThaiBi: "CHUA_CO" };

describe("ghi test mẻ", () => {
  it("chỉ liệt kê test đã nhập (bỏ trống, CHUA_CO, DANG_U)", () => {
    expect(buildMeGhiTestList(tests).map((t) => t.loai)).toEqual(["THONG_SO_VAT_LY", "CI_NGOAI_GOI"]);
    expect(buildMeGhiTestList({ ...tests, trangThaiBi: "AM" }).at(-1)).toEqual({ loai: "BI", ketQua: "AM" });
  });
  it("mỗi test một lần gọi, đạt hết → loHong=false", async () => {
    const f = fake(() => ({ success: true, dat: true }));
    expect(await ghiCacTestMe(f.client, { meId: "m", actorUserId: "u", tests })).toEqual({ ok: true, loHong: false });
    expect(f.calls).toHaveLength(2);
    expect(f.calls[0]).toMatchObject({ p_me_id: "m", p_loai: "THONG_SO_VAT_LY", p_actor_user_id: "u" });
  });
  it("test không đạt → loHong=true", async () => {
    const f = fake((a) => ({ success: true, dat: a.p_loai !== "CI_NGOAI_GOI" }));
    expect(await ghiCacTestMe(f.client, { meId: "m", actorUserId: "u", tests })).toEqual({ ok: true, loHong: true });
  });
  it("RPC trả success:false → báo lỗi, dừng", async () => {
    const f = fake(() => ({ success: false, message: "Chưa gắn nhân sự" }));
    expect(await ghiCacTestMe(f.client, { meId: "m", actorUserId: "u", tests })).toEqual({ ok: false, message: "Chưa gắn nhân sự" });
    expect(f.calls).toHaveLength(1);
  });
});
