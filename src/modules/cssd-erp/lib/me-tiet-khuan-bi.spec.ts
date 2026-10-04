import { describe, expect, it } from "vitest";
import {
  MSG_BI_KHONG_HOP_LE,
  assertBiAmReleaseAllowed,
  assertBiBm02HopLe,
  canReleaseAfterBiAm,
  readBiBm02FromQcJson,
} from "./me-tiet-khuan-bi";

const base = {
  trangThaiBi: "AM",
  ongDoiChung: "DUONG",
  ongThu: "AM",
  gioBatDauU: "2026-10-05T01:00:00.000Z",
  gioDoc: "2026-10-05T09:00:00.000Z",
  soLoBi: "BI-LOT-01",
};

describe("assertBiBm02HopLe", () => {
  it("rejects đối chứng âm — không nhả", () => {
    const r = assertBiBm02HopLe({ ...base, ongDoiChung: "AM" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(MSG_BI_KHONG_HOP_LE);
    expect(canReleaseAfterBiAm({ ...base, ongDoiChung: "AM" })).toBe(false);
  });

  it("accepts đối chứng dương + ống thử âm + đủ sổ", () => {
    const r = assertBiBm02HopLe(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.ongDoiChung).toBe("DUONG");
      expect(r.record.soLoBi).toBe("BI-LOT-01");
    }
    expect(canReleaseAfterBiAm(base)).toBe(true);
  });

  it("requires so lô and times", () => {
    expect(assertBiBm02HopLe({ ...base, soLoBi: "" }).ok).toBe(false);
    expect(assertBiBm02HopLe({ ...base, gioBatDauU: "" }).ok).toBe(false);
    expect(assertBiBm02HopLe({ ...base, gioDoc: "2026-10-04T00:00:00.000Z" }).ok).toBe(false);
  });
});

describe("assertBiAmReleaseAllowed", () => {
  it("skips gate when BI not AM", () => {
    expect(assertBiAmReleaseAllowed({ trangThaiBi: "CHUA_CO" }).ok).toBe(true);
    expect(assertBiAmReleaseAllowed({ trangThaiBi: "DANG_U" }).ok).toBe(true);
  });

  it("blocks AM release without đối chứng dương", () => {
    const r = assertBiAmReleaseAllowed({ ...base, ongDoiChung: "AM" });
    expect(r.ok).toBe(false);
  });
});

describe("readBiBm02FromQcJson", () => {
  it("reads snake_case keys", () => {
    const r = readBiBm02FromQcJson({
      trang_thai_bi: "AM",
      ong_doi_chung: "DUONG",
      ong_thu: "AM",
      so_lo_bi: "L1",
    });
    expect(r.ongDoiChung).toBe("DUONG");
    expect(r.soLoBi).toBe("L1");
  });
});
