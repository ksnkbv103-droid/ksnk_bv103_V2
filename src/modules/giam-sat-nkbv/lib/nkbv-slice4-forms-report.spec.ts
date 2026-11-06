import { describe, it, expect } from "vitest";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";

describe("Slice 4: Standardize KSNK.QT.33 & QĐ 3916/QĐ-BYT Forms", () => {
  it("generates correct print file title for BM.01 (Phiếu điều tra ca bệnh NKBV)", () => {
    const title = buildPrintFileTitle({
      loai: "NKBV_BM01",
      ma: "CA-2026-0001",
    });
    expect(title).toBe("NKBV_BM01_CA-2026-0001");
  });

  it("generates correct print file title for BM.04 (Sổ tổng hợp ca bệnh NKBV)", () => {
    const title = buildPrintFileTitle({
      loai: "NKBV_BM04",
      ma: "20261105",
    });
    expect(title).toBe("NKBV_BM04_20261105");
  });

  it("sanitizes special characters in print file titles", () => {
    const title = buildPrintFileTitle({
      loai: "NKBV_BM01",
      ma: "BA/103/KHTH:2026",
    });
    expect(title).toBe("NKBV_BM01_BA_103_KHTH_2026");
  });

  it("confirms NkbvCaseEditor is removed from GiamSatNkbvPage imports", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.resolve(process.cwd(), "src/modules/giam-sat-nkbv/views/GiamSatNkbvPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must not import NkbvCaseEditor
    expect(content.includes("NkbvCaseEditor")).toBe(false);
    // Must mount NkbvCaseSummaryBookPrintView
    expect(content.includes("NkbvCaseSummaryBookPrintView")).toBe(true);
    // Must have In Sổ tổng hợp button
    expect(content.includes("In Sổ tổng hợp NKBV (BM.04)")).toBe(true);
  });

  it("confirms NkbvCasePrintView contains BM.01/QT.33 and 5 Roman sections", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const printViewPath = path.resolve(
      process.cwd(),
      "src/modules/giam-sat-nkbv/components/NkbvCasePrintView.tsx",
    );
    const content = fs.readFileSync(printViewPath, "utf-8");

    expect(content.includes("BM.01/QT.33")).toBe(true);
    expect(content.includes("PHIẾU ĐIỀU TRA CA BỆNH NHIỄM KHUẨN BỆNH VIỆN")).toBe(true);
    expect(content.includes("I. THÔNG TIN HÀNH CHÍNH & VÀO VIỆN")).toBe(true);
    expect(content.includes("II. YẾU TỐ CAN THIỆP XÂM LẤN & THIẾT BỊ ĐIỀU TRỊ")).toBe(true);
    expect(content.includes("III. THÔNG TIN VI SINH & CẬN LÂM SÀNG (YẾU TỐ INDEX)")).toBe(true);
    expect(content.includes("IV. CỬA SỔ CHẨN ĐOÁN & TIÊU CHUẨN XÁC ĐỊNH CA (CDC/NHSN)")).toBe(true);
    expect(content.includes("V. KẾT LUẬN & XÁC NHẬN")).toBe(true);
  });

  it("confirms NkbvCaseSummaryBookPrintView contains BM.04/QT.33 and table headers", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const summaryViewPath = path.resolve(
      process.cwd(),
      "src/modules/giam-sat-nkbv/components/NkbvCaseSummaryBookPrintView.tsx",
    );
    const content = fs.readFileSync(summaryViewPath, "utf-8");

    expect(content.includes("BM.04/QT.33")).toBe(true);
    expect(content.includes("SỔ THEO DÕI, TỔNG HỢP CA BỆNH NHIỄM KHUẨN BỆNH VIỆN")).toBe(true);
    expect(content.includes("Mã ca")).toBe(true);
    expect(content.includes("Mã BA / PID")).toBe(true);
    expect(content.includes("Khoa điều trị (LOA)")).toBe(true);
    expect(content.includes("Ngày DOE")).toBe(true);
    expect(content.includes("Tác nhân vi sinh")).toBe(true);
    expect(content.includes("TRƯỞNG KHOA KIỂM SOÁT NHIỄM KHUẨN")).toBe(true);
  });
});
