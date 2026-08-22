import { describe, expect, it } from "vitest";
import { splitCoverage, type AssignedStaff } from "@/lib/dao-tao/coverage";

function staff(partial: Partial<AssignedStaff> & Pick<AssignedStaff, "id">): AssignedStaff {
  return {
    hoTen: partial.hoTen ?? partial.id,
    maNv: partial.maNv ?? null,
    khoaId: partial.khoaId ?? "k1",
    khoaTen: partial.khoaTen ?? "Nội",
    authUserId: partial.authUserId ?? null,
    id: partial.id,
  };
}

describe("splitCoverage", () => {
  it("tách chưa nộp và chưa gắn tài khoản", () => {
    const { chuaNop, chuaTaiKhoan } = splitCoverage(
      [
        staff({ id: "1", authUserId: "u1", hoTen: "A" }),
        staff({ id: "2", authUserId: "u2", hoTen: "B" }),
        staff({ id: "3", hoTen: "C" }),
      ],
      ["u1"],
    );
    expect(chuaNop.map((s) => s.id)).toEqual(["2"]);
    expect(chuaTaiKhoan.map((s) => s.id)).toEqual(["3"]);
  });
});
