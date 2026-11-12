import { describe, it, expect } from "vitest";
import { bloodPrimaryBlockedByPriorEvents } from "./nkbv-blood-primary-guard";

const uti = {
  id: "ev1",
  ngay_phat_hien: "2026-03-05",
  loai_ma: "UTI",
  loai_ten: "Nhiễm khuẩn tiết niệu",
  vi_tri_nhiem_khuan: "Tiết niệu",
  tac_nhan_vi_khuan: "Escherichia coli",
  index_vi_sinh_id: "u-1",
  attributed_vi_sinh_ids: ["u-1"],
};
const call = (bloodDate: string, organism: string, priorEvents = [uti]) =>
  bloodPrimaryBlockedByPriorEvents({ bloodId: "b-1", bloodDate, specimen: "Máu", organism, priorEvents });

describe("bloodPrimaryBlockedByPriorEvents", () => {
  it("chặn máu trong khung SBAP của sự kiện đủ TC và trùng tác nhân", () => {
    expect(call("2026-03-10", "Escherichia coli")).not.toBeNull();
  });
  it("cho phép khi khác tác nhân", () => {
    expect(call("2026-03-10", "Staphylococcus aureus")).toBeNull();
  });
  it("cho phép khi máu ngoài khung thời gian", () => {
    expect(call("2026-05-10", "Escherichia coli")).toBeNull();
  });
  it("cho phép khi chưa có sự kiện nào", () => {
    expect(call("2026-03-10", "Escherichia coli", [])).toBeNull();
  });
});
