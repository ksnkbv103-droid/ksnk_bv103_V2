import { describe, expect, it } from "vitest";
import { resolveBangKiemPersistFields } from "./resolve-loai-bang-kiem-persist";

function fakeClient(data: unknown, error: unknown = null) {
  const calls: Array<[string, string]> = [];
  const builder = {
    select: () => builder,
    eq: (col: string, v: string) => {
      calls.push([col, v]);
      return builder;
    },
    maybeSingle: async () => ({ data, error }),
  };
  return { client: { from: () => builder } as never, calls };
}

describe("resolveBangKiemPersistFields", () => {
  it("rỗng -> ném lỗi", async () => {
    await expect(resolveBangKiemPersistFields(fakeClient(null).client, "  ")).rejects.toThrow(/Thiếu/);
  });
  it("UUID tra theo id; mã tra theo ma_bk", async () => {
    const row = { id: "i1", loai_giam_sat: null, is_active: null, doi_tuong_giam_sat: " NV " };
    const a = fakeClient(row);
    const r = await resolveBangKiemPersistFields(a.client, "123e4567-e89b-42d3-a456-426614174000");
    expect(a.calls[0][0]).toBe("id");
    expect(r).toMatchObject({ bang_kiem_id: "i1", loai_giam_sat: "TUAN_THU", is_active: true, doi_tuong_giam_sat: "NV" });
    const b = fakeClient(row);
    await resolveBangKiemPersistFields(b.client, "BK01");
    expect(b.calls[0]).toEqual(["ma_bk", "BK01"]);
  });
  it("không thấy -> ném lỗi; is_active=false giữ nguyên", async () => {
    await expect(resolveBangKiemPersistFields(fakeClient(null).client, "BK9")).rejects.toThrow(/BK9/);
    const r = await resolveBangKiemPersistFields(fakeClient({ id: "i", is_active: false }).client, "BK1");
    expect(r.is_active).toBe(false);
  });
});
