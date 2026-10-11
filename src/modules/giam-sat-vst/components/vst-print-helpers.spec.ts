import { describe, expect, it } from "vitest";
import { tenNghe, tenNhanVien } from "./vst-print-helpers";

describe("tenNhanVien", () => {
  const ns = [{ id: "1", ho_ten: " Nguyễn A " }, { id: "2", ho_ten: "" }];
  it("nhập tay ưu tiên", () => expect(tenNhanVien({ is_manual: true, ten_manual: " B " }, ns)).toBe("B"));
  it("tra theo id", () => expect(tenNhanVien({ nhan_vien_id: "1" }, ns)).toBe("Nguyễn A"));
  it("tên rỗng -> trả id; không có gì -> —", () => {
    expect(tenNhanVien({ nhan_vien_id: "2" }, ns)).toBe("2");
    expect(tenNhanVien({}, ns)).toBe("—");
  });
});

describe("tenNghe", () => {
  const dm = [{ id: "n1", ten_danh_muc: "Bác sĩ" }];
  it("ưu tiên text; rồi tra id; rồi —", () => {
    expect(tenNghe({ nghe_nghiep: "ĐD" }, dm)).toBe("ĐD");
    expect(tenNghe({ nghe_nghiep_id: "n1" }, dm)).toBe("Bác sĩ");
    expect(tenNghe({ nghe_nghiep_id: "zz" }, dm)).toBe("—");
    expect(tenNghe({}, dm)).toBe("—");
  });
});
