import { describe, expect, it } from "vitest";
import { buildSuCoStaffOptions } from "./cssd-incident-staff-options";
import { groupTypeDefaults } from "./cssd-incident-taxonomy";

describe("cssd-incident-staff-options", () => {
  it("puts cycle performers first for related options", () => {
    const { relatedOptions, detectorOptions } = buildSuCoStaffOptions({
      preferCycleForRelated: true,
      cyclePerformers: [
        {
          station: "DONG_GOI",
          stationLabel: "Đóng gói",
          operatorId: "ns-1",
          operatorName: "Nguyễn A",
          stationTime: null,
        },
      ],
      nhanSu: [
        { id: "ns-1", ho_ten: "Nguyễn A", ma_nv: "NV01" },
        { id: "ns-2", ho_ten: "Trần B", ma_nv: "NV02" },
      ],
    });
    expect(relatedOptions[0]?.id).toBe("ns-1");
    expect(relatedOptions[0]?.groupLabel).toBe("Trên chu kỳ này");
    expect(relatedOptions.some((o) => o.id === "ns-2")).toBe(true);
    expect(detectorOptions.every((o) => o.groupLabel === "Danh mục nhân sự")).toBe(true);
  });
});

describe("groupTypeDefaults CHEMICAL", () => {
  it("defaults CHEMICAL to first type preset", () => {
    const d = groupTypeDefaults("CHEMICAL");
    expect(d.typeId).toBe("CHEMICAL_STOCK_OUT");
    expect(d.typeTen.toLowerCase()).toContain("hóa chất");
  });
});
