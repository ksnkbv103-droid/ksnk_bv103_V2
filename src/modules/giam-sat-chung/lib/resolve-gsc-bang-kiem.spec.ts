import { describe, expect, it } from "vitest";
import {
  findBangKiemForSessionLoai,
  gscViewBangKiemLookupKeys,
  pickBangKiemForGscView,
} from "./resolve-gsc-bang-kiem";

const live = [
  { id: "uuid-1", ma_bk: "BM.01" },
  { id: "uuid-2", ma_bk: "BM.02" },
];

describe("pickBangKiemForGscView", () => {
  it("prefers picker match over lookup", () => {
    const lookup = { id: "uuid-1", ma_bk: "BM.01" };
    expect(
      pickBangKiemForGscView({
        dbTemplates: live,
        loaiBangKiem: "BM.01",
        lookup,
      })?.id,
    ).toBe("uuid-1");
    expect(findBangKiemForSessionLoai(live, "uuid-2")?.ma_bk).toBe("BM.02");
  });

  it("falls back to lookup when template is missing from picker (tắt / mạng lưới)", () => {
    const lookup = { id: "uuid-off", ma_bk: "BM.OFF" };
    expect(
      pickBangKiemForGscView({
        dbTemplates: live,
        loaiBangKiem: "BM.OFF",
        frozenBangKiemId: "uuid-off",
        lookup,
      }),
    ).toEqual(lookup);
  });
});

describe("gscViewBangKiemLookupKeys", () => {
  it("dedupes session, snapshot, and loai keys", () => {
    expect(
      gscViewBangKiemLookupKeys({
        sessionBangKiemId: "uuid-1",
        frozenBangKiemId: "uuid-1",
        loaiBangKiem: "BM.01",
      }),
    ).toEqual(["uuid-1", "BM.01"]);
  });
});
