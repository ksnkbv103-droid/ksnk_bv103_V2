import { describe, expect, it } from "vitest";
import {
  buildCssdQcProofRows,
  isCssdPrintImageUrl,
  parseBatchAnhMinhChung,
} from "./cssd-print-format";
import type { CssdBatchPrintData } from "../types/cssd-print.types";

const basePrintData: CssdBatchPrintData = {
  batchId: "b1",
  maLo: "LOT-TEST",
  ketQuaDat: true,
  thietBi: "Máy A",
  nguoiLoad: "NV1",
  nguoiUnload: "NV2",
  nhietDoApSuat: "134°C",
  thongSoMay: "Chu kỳ 4",
  chiThiTiepXuc: "DAT",
  chiThiDaThongSo: "DAT",
  testSinhHoc: "NA",
  testCI: "DAT",
  testBowieDick: "NA",
  thoiGianBatDau: null,
  thoiGianKetThuc: null,
  ghiChuQc: "",
  anhMinhChung: {
    may: "https://example.com/may.jpg",
    tiepXuc: "",
    daThongSo: "https://example.com/ci.jpg",
    sinhHoc: "",
    bowieDick: "",
  },
  members: [],
};

describe("cssd-print-format", () => {
  it("parseBatchAnhMinhChung đọc tk_qc_json.anhMinhChung", () => {
    const parsed = parseBatchAnhMinhChung({
      anhMinhChung: { may: " https://x/a.png ", tiepXuc: "bad" },
    });
    expect(parsed.may).toBe("https://x/a.png");
    expect(parsed.tiepXuc).toBe("bad");
  });

  it("isCssdPrintImageUrl chấp nhận http và data URL", () => {
    expect(isCssdPrintImageUrl("https://a/b.png")).toBe(true);
    expect(isCssdPrintImageUrl("data:image/png;base64,abc")).toBe(true);
    expect(isCssdPrintImageUrl("not-a-url")).toBe(false);
  });

  it("buildCssdQcProofRows gom test + kết quả + ảnh cùng hàng", () => {
    const rows = buildCssdQcProofRows(basePrintData);
    expect(rows).toHaveLength(7);
    const may = rows.find((r) => r.label === "Thông số máy");
    expect(may?.ketQua).toBe("Chu kỳ 4");
    expect(may?.anhUrl).toBe("https://example.com/may.jpg");
    const ci = rows.find((r) => r.label === "Chỉ thị hóa học (CI)");
    expect(ci?.ketQua).toBe("Đạt");
    expect(ci?.anhUrl).toBe("https://example.com/ci.jpg");
  });
});
