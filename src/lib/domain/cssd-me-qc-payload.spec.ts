import { describe, expect, it } from "vitest";
import { validateMeTietKhuanPassPayload } from "./cssd-me-qc-payload";

const steamOk = {
  nguoiUnload: "KTV A",
  nhietDo: "134°C — 2,1 bar",
  thongSoMay: "[DAT]",
  chiThiTiepXuc: "DAT",
  chiThiDaThongSo: "DAT",
  testSinhHoc: "NA",
  testCI: "",
  testBD: "NA",
  anhMinhChungMay: "data:image/jpeg;base64,aaa",
  anhMinhChungTiepXuc: "data:image/jpeg;base64,bbb",
  anhMinhChungDaThongSo: "data:image/jpeg;base64,ccc",
};

const plasmaOk = {
  ...steamOk,
  chiThiDaThongSo: "",
  testCI: "DAT",
};

describe("validateMeTietKhuanPassPayload", () => {
  it("requires steam multi-parameter indicator", () => {
    const err = validateMeTietKhuanPassPayload({ ...steamOk, chiThiDaThongSo: "" }, "STEAM");
    expect(err).toMatch(/đa thông số/i);
  });

  it("does not require steam multi-parameter for plasma", () => {
    expect(validateMeTietKhuanPassPayload(plasmaOk, "PLASMA")).toBeNull();
  });

  it("does not require steam multi-parameter for EO", () => {
    expect(validateMeTietKhuanPassPayload(plasmaOk, "EO")).toBeNull();
  });

  it("requires chemical indicator for plasma", () => {
    const err = validateMeTietKhuanPassPayload({ ...plasmaOk, testCI: "" }, "PLASMA");
    expect(err).toMatch(/hóa học \(CI\)/i);
  });
});
