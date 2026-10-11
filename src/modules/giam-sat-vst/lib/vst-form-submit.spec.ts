import { describe, expect, it } from "vitest";
import { buildVstObservations, validateOpportunityInput } from "./vst-form-submit";
import { createNewOpp, type VSTFormPerson } from "./vst-form-model";
import { MOMENTS } from "./vst-constants";

const opp = (over: Record<string, unknown> = {}) => ({ ...createNewOpp(), ...over }) as ReturnType<typeof createNewOpp>;

describe("validateOpportunityInput", () => {
  it("thiếu thời điểm / hành động -> báo lỗi", () => {
    expect(validateOpportunityInput(opp())).toMatch(/thời điểm/);
    expect(validateOpportunityInput(opp({ thoi_diems: [MOMENTS[0]] }))).toMatch(/Hành động/);
  });
  it("rửa/chà: 2 thời điểm hợp lệ, 3 bị từ chối", () => {
    expect(validateOpportunityInput(opp({ thoi_diems: [MOMENTS[0], MOMENTS[1]], hanh_dong: "Rửa tay bằng nước" }))).toBeNull();
    expect(
      validateOpportunityInput(opp({ thoi_diems: [MOMENTS[0], MOMENTS[1], MOMENTS[2]], hanh_dong: "Chà tay bằng cồn" })),
    ).toMatch(/tối đa 2/);
  });
  it("bỏ sót: 1 thời điểm hợp lệ, 2 bị từ chối", () => {
    expect(validateOpportunityInput(opp({ thoi_diems: [MOMENTS[0]], hanh_dong: "Bỏ sót" }))).toBeNull();
    expect(validateOpportunityInput(opp({ thoi_diems: [MOMENTS[0], MOMENTS[1]], hanh_dong: "Bỏ sót" }))).toMatch(/Bỏ sót/);
  });
});

describe("buildVstObservations", () => {
  const person = (over: Partial<VSTFormPerson>): VSTFormPerson => ({
    id_col: "col1",
    nghe_nghiep_id: "nn1",
    nhan_vien_id: "",
    is_manual: false,
    ten_manual: "",
    opportunities: [],
    ...over,
  });
  const session = {
    khoa_id: "k1",
    khu_vuc_id: "kv1",
    vi_tri: "Giường 1",
    hinh_thuc_giam_sat: "Tự giám sát",
    cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    ngay_giam_sat: "2026-03-10",
    nguoi_giam_sat_id: "gs1",
  } as never;
  const nghes = [{ id: "nn1", ten_danh_muc: "Điều dưỡng" }] as never;

  it("bỏ người trống; giữ NV có id hoặc nhập tay; lọc cơ hội chưa đủ", () => {
    const out = buildVstObservations({
      persons: [
        person({ id_col: "a" }),
        person({
          id_col: "b",
          nhan_vien_id: "nv1",
          opportunities: [opp({ thoi_diems: [MOMENTS[0]], hanh_dong: "Bỏ sót", thoi_gian_ghi_nhan: "2026-03-10T01:00:00.000Z" }), opp()],
        }),
        person({ id_col: "c", is_manual: true, ten_manual: "Ngoài" }),
      ],
      session,
      ngheNghieps: nghes,
      sessionTenKhuVuc: "Khu A",
    });
    expect(out).toHaveLength(2);
    expect(out[0].nhan_vien_id).toBe("nv1");
    expect(out[0].nghe_nghiep).toBe("Điều dưỡng");
    expect(out[0].khu_vuc).toBe("Khu A");
    expect(out[0].opportunities).toHaveLength(1);
    expect(out[1].nhan_vien_id).toBeNull();
    expect(out[1].ten_nhan_vien_ngoai).toBe("Ngoài");
  });

  it("giám sát lại qua camera: bỏ thoi_gian_ghi_nhan", () => {
    const out = buildVstObservations({
      persons: [person({ nhan_vien_id: "nv1", opportunities: [opp({ thoi_diems: [MOMENTS[0]], hanh_dong: "Bỏ sót", thoi_gian_ghi_nhan: "08:00" })] })],
      session: { ...(session as object), cach_thuc_giam_sat: "Giám sát lại qua camera" } as never,
      ngheNghieps: nghes,
    });
    expect(out[0].opportunities[0].thoi_gian_ghi_nhan).toBeUndefined();
  });
});
