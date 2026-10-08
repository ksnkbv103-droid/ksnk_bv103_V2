import { describe, expect, it } from "vitest";
import {
  hydrateVstPersonsFromObservations,
  splitMomentsNoTrim,
  whoTechniqueRateFromAssessed,
} from "./vst-edit-hydrate";
import { MOMENTS } from "./vst-constants";

describe("edit-load — người đủ; thời điểm cắt theo domain §2.1", () => {
  it("bỏ sót: parse đủ token nhưng hydrate chỉ giữ 1", () => {
    const raw = MOMENTS.join(", ");
    const moments = splitMomentsNoTrim(raw);
    expect(moments).toHaveLength(5);
    const { persons } = hydrateVstPersonsFromObservations([
      {
        id: "o1",
        nhan_vien_id: "11111111-1111-4111-8111-111111111111",
        nghe_nghiep_id: "22222222-2222-4222-8222-222222222222",
        hanh_dong: "Bỏ sót",
        thoi_diem: raw,
        co_deo_gang: true,
      },
    ]);
    expect(persons[0]!.opportunities[0]!.thoi_diems).toHaveLength(1);
    expect(persons[0]!.opportunities[0]!.thoi_diems[0]).toBe(MOMENTS[0]);
    expect(persons[0]!.opportunities[0]!.hanh_dong).toBe("Bỏ sót");
  });

  it("tuân thủ: hydrate cắt còn tối đa 2", () => {
    const raw = MOMENTS.slice(0, 4).join(", ");
    const { persons } = hydrateVstPersonsFromObservations([
      {
        id: "o1",
        nhan_vien_id: "11111111-1111-4111-8111-111111111111",
        nghe_nghiep_id: "22222222-2222-4222-8222-222222222222",
        hanh_dong: "Chà tay bằng cồn",
        thoi_diem: raw,
        dung_ky_thuat: true,
      },
    ]);
    expect(persons[0]!.opportunities[0]!.thoi_diems).toHaveLength(2);
  });

  it("nạp đủ 8 người + cảnh báo legacy", () => {
    const obs = Array.from({ length: 8 }, (_, i) => ({
      id: `o${i}`,
      nhan_vien_id: `11111111-1111-4111-8111-11111111111${i}`,
      nghe_nghiep_id: "22222222-2222-4222-8222-222222222222",
      hanh_dong: "Chà tay bằng cồn" as const,
      thoi_diem: MOMENTS[0],
      dung_ky_thuat: true,
      du_thoi_gian: true,
    }));
    const { persons, legacyPersonCount } = hydrateVstPersonsFromObservations(obs);
    expect(persons).toHaveLength(8);
    expect(legacyPersonCount).toBe(8);
    expect(persons.every((p) => p.nhan_vien_id)).toBe(true);
  });
});

describe("VST-03 mẫu số phiếu WHO", () => {
  it("NULL không tính đúng — 1 đúng / 2 đã đánh giá = 50%", () => {
    expect(whoTechniqueRateFromAssessed(1, 2)).toBe(50);
    expect(whoTechniqueRateFromAssessed(2, 3)).toBe(66.7);
    expect(whoTechniqueRateFromAssessed(0, 0)).toBeNull();
  });
});
