import { describe, expect, it } from "vitest";
import { buildVstObservationPersistRow } from "./vst-observation-persist-fields";

describe("buildVstObservationPersistRow", () => {
  it("gán FK từ phiên và nghề, giữ vi_tri session", () => {
    const row = buildVstObservationPersistRow({
      sessionKhuVucId: "11111111-1111-4111-8111-111111111111",
      sessionViTri: "Cửa phòng 3",
      ngheNghiepId: "22222222-2222-4222-8222-222222222222",
    });
    expect(row.khu_vuc_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(row.nghe_nghiep_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(row.vi_tri).toBe("Cửa phòng 3");
  });
});
