import { describe, expect, it } from "vitest";
import {
  buildCssdBatchTicket,
  buildCssdQcProofRows,
  formatQcTriWord,
  isCssdPrintImageUrl,
  parseBatchAnhMinhChung,
} from "./cssd-print-format";
import type { CssdBatchPrintData } from "../types/cssd-print.types";

const basePrintData: CssdBatchPrintData = {
  batchId: "b1",
  maLo: "LOT-TEST",
  trangThaiLabel: "Đạt",
  ketQuaDat: true,
  coTheIn: true,
  thietBi: "Máy A",
  phuongPhap: "Hơi nước",
  chuongTrinh: "134",
  nhietDo: "134 °C",
  apSuat: "2 áp suất",
  thoiGianChuKy: "4 phút",
  nguoiNap: "NV1",
  nguoiDo: "NV2",
  nguoiNha: "NV3",
  thoiGianKetThucChuTrinh: null,
  thoiGianNha: null,
  qcVatLy: "Đạt",
  qcCiNgoai: "Đạt",
  qcCiPcd: "Đạt",
  biLabel: "Chưa có",
  coImplantLabel: "Không",
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

  it("in phiếu từ cột có cấu trúc, chữ Đạt/Không đạt, và trạng thái chờ BI", () => {
    expect(formatQcTriWord("[DAT]")).toBe("Đạt");
    expect(formatQcTriWord("KHONG_DAT")).toBe("Không đạt");
    const ticket = buildCssdBatchTicket({
      id: "b1",
      maLo: "MAY-240926-1",
      tenMay: "Hấp 1",
      phuongPhap: "HOI_NUOC",
      chuongTrinh: "P1",
      nhietDo: 134,
      apSuat: 2.1,
      thoiGianChuKy: 4,
      nguoiNap: "An",
      nguoiDo: "Bình",
      nguoiNha: null,
      thoiGianBatDau: "2026-09-24T01:00:00.000Z",
      tkMoFormQcAt: "2026-09-24T02:00:00.000Z",
      thoiGianNha: null,
      trangThaiMe: "CHO_BI",
      trangThaiBi: "CHUA_CO",
      ketQuaTest: null,
      coImplant: true,
      qcVatLy: "DAT",
      qcCiNgoai: "KHONG_DAT",
      qcCiPcd: "DAT",
      members: [{ maBo: "B01", tenBo: "Bộ mổ" }],
    });
    expect(ticket.trangThaiLabel).toBe("Chờ BI");
    expect(ticket.coTheIn).toBe(true);
    expect(ticket.thoiGianKetThucChuTrinh).toBe("2026-09-24T02:00:00.000Z");
    expect(ticket.qcVatLy).toBe("Đạt");
    expect(ticket.qcCiNgoai).toBe("Không đạt");
    expect(ticket.biLabel).toBe("Chưa có");
    expect(ticket.coImplantLabel).toBe("Có");
    expect(ticket.phuongPhap).toBe("Hơi nước");
    expect(ticket.nguoiNha).toBe("—");
    expect(JSON.stringify(ticket)).not.toContain("[DAT]");
    expect(ticket.members[0]?.maQrBo).toBe("B01");
    const fail = buildCssdBatchTicket({
      id: "b2",
      maLo: "MAY-2",
      tenMay: "Hấp 1",
      trangThaiMe: "QC_KHONG_DAT",
      trangThaiBi: "DUONG",
      ketQuaTest: false,
      members: [],
    });
    expect(fail.trangThaiLabel).toBe("Không đạt");
    expect(fail.biLabel).toBe("Dương");
    expect(fail.coTheIn).toBe(true);
  });
});
