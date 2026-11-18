import { describe, expect, it } from "vitest";
import { resolveSupervisorIdForSave, SUPERVISOR_NO_PROFILE_ERROR_VI } from "./supervision-supervisor-id";

describe("resolveSupervisorIdForSave (VST-005)", () => {
  it("không admin, chưa gắn nhân sự: từ chối", () => {
    expect(() =>
      resolveSupervisorIdForSave({ adminBypass: false, actorNhanSuId: null, clientNguoiGiamSatId: "ns-khac" }),
    ).toThrow(SUPERVISOR_NO_PROFILE_ERROR_VI);
  });
  it("không admin, có nhân sự: ép actor, bỏ giá trị client", () => {
    expect(
      resolveSupervisorIdForSave({ adminBypass: false, actorNhanSuId: "ns-1", clientNguoiGiamSatId: "ns-khac" }),
    ).toBe("ns-1");
  });
  it("admin: giữ giá trị client, thiếu thì dùng actor", () => {
    expect(resolveSupervisorIdForSave({ adminBypass: true, actorNhanSuId: "ns-1", clientNguoiGiamSatId: "ns-2" })).toBe("ns-2");
    expect(resolveSupervisorIdForSave({ adminBypass: true, actorNhanSuId: "ns-1", clientNguoiGiamSatId: "" })).toBe("ns-1");
  });
  // VST-027: CB_KSNK sửa phiên người khác thì giữ chủ phiên gốc (hình thức giám sát tính theo chủ gốc).
  it("không admin, CB_KSNK sửa phiên của người khác: giữ chủ phiên gốc", () => {
    expect(
      resolveSupervisorIdForSave({
        adminBypass: false,
        actorNhanSuId: "ns-gui",
        clientNguoiGiamSatId: "ns-gui",
        chuPhienGoc: "ns-goc",
        laCanBoKsnk: true,
      }),
    ).toBe("ns-goc");
  });
  it("không admin, không phải CB_KSNK: vẫn ép actor dù có chủ phiên gốc", () => {
    expect(
      resolveSupervisorIdForSave({
        adminBypass: false,
        actorNhanSuId: "ns-gui",
        clientNguoiGiamSatId: "ns-goc",
        chuPhienGoc: "ns-goc",
        laCanBoKsnk: false,
      }),
    ).toBe("ns-gui");
  });
});
