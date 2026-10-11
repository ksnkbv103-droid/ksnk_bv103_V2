import { describe, expect, it } from "vitest";
import { extractQlcvCloseResultText, extractQlcvLastApproverName } from "./qlcv-close-info";

describe("extractQlcvCloseResultText", () => {
  it("bỏ tiền tố «Kết quả:» để nhãn ô không bị lặp", () => {
    const r = extractQlcvCloseResultText({
      hoat_dong: [{ loai_hoat_dong: "HOAN_THANH", noi_dung: "Kết quả: Đã rà soát xong" }],
    });
    expect(r).toBe("Đã rà soát xong");
  });

  it("lấy mục đóng việc gần nhất, bỏ qua mục báo tiến độ", () => {
    const r = extractQlcvCloseResultText({
      hoat_dong: [
        { loai_hoat_dong: "HOAN_THANH", noi_dung: "Kết quả: Lần cũ" },
        { loai_hoat_dong: "BAO_CAO_TIEN_DO", noi_dung: "Báo cáo tiến độ 100%" },
        { loai_hoat_dong: "HOAN_THANH", noi_dung: "Kết quả: Lần mới" },
      ],
    });
    expect(r).toBe("Lần mới");
  });

  it("không có mục đóng việc thì trả null", () => {
    expect(extractQlcvCloseResultText({ hoat_dong: [{ loai_hoat_dong: "PHAN_CONG", noi_dung: "Tạo công việc mới" }] })).toBeNull();
  });
});

describe("extractQlcvLastApproverName", () => {
  it("lấy người thực hiện ở mục đóng việc cuối", () => {
    expect(
      extractQlcvLastApproverName({
        hoat_dong: [
          { loai_hoat_dong: "CAP_NHAT", nguoi: { ho_ten: "Người làm" } },
          { loai_hoat_dong: "HOAN_THANH", nguoi: { ho_ten: "  Người duyệt  " } },
        ],
      }),
    ).toBe("Người duyệt");
  });

  it("chưa đóng hoặc thiếu tên thì null", () => {
    expect(extractQlcvLastApproverName({ hoat_dong: [{ loai_hoat_dong: "CAP_NHAT", nguoi: { ho_ten: "A" } }] })).toBeNull();
    expect(extractQlcvLastApproverName({ hoat_dong: [{ loai_hoat_dong: "HOAN_THANH", nguoi: null }] })).toBeNull();
    expect(extractQlcvLastApproverName({ hoat_dong: null })).toBeNull();
  });
});
