import { describe, expect, it } from "vitest";
import {
  buildMinimalThermalLabelHtml,
  buildCycleThermalLabelHtml,
  escapeHtml,
} from "./usePrint";

describe("usePrint label HTML generation", () => {
  describe("escapeHtml", () => {
    it("escapes &, <, >, \" correctly", () => {
      expect(escapeHtml('Test & <script>"alert"</script>')).toBe(
        "Test &amp; &lt;script&gt;&quot;alert&quot;&lt;/script&gt;",
      );
    });
  });

  describe("buildMinimalThermalLabelHtml (Permanent Set Label)", () => {
    it("renders hospital header and required clinical fields", () => {
      const html = buildMinimalThermalLabelHtml({
        qrDataUrl: "data:image/png;base64,mockQr",
        qrCode: "B01.SET.01",
        displayCode: "B01.SET.01",
        tenBo: "Bộ đại phẫu tiêu hóa",
        tenKhoa: "Ngoại Bụng (B1)",
        tongSoLuong: 36,
        soKhoan: 8,
        phanLoaiBo: "Phẫu thuật",
        fileTitle: "TEMBO_B01_SET_01",
      });

      expect(html).toContain("BỆNH VIỆN QUÂN Y 103");
      expect(html).toContain("KHOA KIỂM SOÁT NHIỄM KHUẨN");
      expect(html).toContain("BỘ DỤNG CỤ · TEM VĨNH VIỄN");
      expect(html).toContain("B01.SET.01");
      expect(html).toContain("data:image/png;base64,mockQr");
      expect(html).toContain("Bộ đại phẫu tiêu hóa");
      expect(html).toContain("Khoa sử dụng:");
      expect(html).toContain("Ngoại Bụng (B1)");
      expect(html).toContain("36 DC (8 khoản)");
      expect(html).toContain("Phân loại:");
      expect(html).toContain("Phẫu thuật");
      expect(html).toContain("Quét mã QR để nhận diện &amp; đối soát cấu phần bộ");
    });

    it("handles missing optional fields gracefully", () => {
      const html = buildMinimalThermalLabelHtml({
        qrDataUrl: "data:image/png;base64,mockQr",
        qrCode: "B02.SET.01",
        displayCode: "B02.SET.01",
        tenBo: "Bộ tiểu phẫu",
        fileTitle: "TEMBO_B02_SET_01",
      });

      expect(html).toContain("B02.SET.01");
      expect(html).toContain("Bộ tiểu phẫu");
      expect(html).toContain("Chưa phân bổ");
      expect(html).toContain("—");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("null");
    });

    it("sanitizes potentially malicious HTML inputs", () => {
      const html = buildMinimalThermalLabelHtml({
        qrDataUrl: "data:image/png;base64,mockQr",
        qrCode: "<bad>tag</bad>",
        displayCode: "<bad>tag</bad>",
        tenBo: "Set <script>alert(1)</script>",
        tenKhoa: "Khoa <b>A</b>",
        fileTitle: "test",
      });

      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).toContain("Khoa &lt;b&gt;A&lt;/b&gt;");
    });
  });

  describe("buildCycleThermalLabelHtml (Sterilization Cycle Pouched Label)", () => {
    it("renders cycle QR, packaging details, and chemical indicator block", () => {
      const html = buildCycleThermalLabelHtml({
        qrDataUrl: "data:image/png;base64,cycleQr",
        qrCode: "BV103-CYC-20261104-001",
        displayCode: "BV103-CYC-20261104-001",
        tenBo: "Bộ đại phẫu tiêu hóa",
        maBo: "B01.SET.01",
        tenKhoa: "Ngoại Bụng (B1)",
        ngayDongGoi: "04/11/2026",
        hanDung: "04/12/2026",
        nguoiDongGoi: "KTV Nguyễn Văn A",
        phuongPhap: "Hấp ướt 134°C",
        loaiBaoGoi: "Túi ép nhiệt Tyvek",
        fileTitle: "TEMCYC_BV103-CYC-20261104-001",
      });

      expect(html).toContain("BỆNH VIỆN QUÂN Y 103");
      expect(html).toContain("KHOA KIỂM SOÁT NHIỄM KHUẨN");
      expect(html).toContain("NIÊM PHONG · TEM CHU TRÌNH");
      expect(html).toContain("BV103-CYC-20261104-001");
      expect(html).toContain("Bộ đại phẫu tiêu hóa");
      expect(html).toContain("Mã bộ: <strong>B01.SET.01</strong>");
      expect(html).toContain("Ngoại Bụng (B1)");
      expect(html).toContain("04/11/2026");
      expect(html).toContain("04/12/2026");
      expect(html).toContain("KTV Nguyễn Văn A");
      expect(html).toContain("Hấp ướt 134°C");
      expect(html).toContain("Túi ép nhiệt Tyvek");
      expect(html).toContain("Chỉ thị hóa học:");
      expect(html).toContain("[ &nbsp; ] ĐẠT");
      expect(html).toContain("[ &nbsp; ] K.ĐẠT");
      expect(html).toContain("Kiểm tra niêm phong &amp; chỉ thị trước khi sử dụng");
    });

    it("falls back to sensible defaults when cycle metadata is missing", () => {
      const html = buildCycleThermalLabelHtml({
        qrDataUrl: "data:image/png;base64,cycleQr",
        qrCode: "BV103-CYC-002",
        displayCode: "BV103-CYC-002",
        tenBo: "Bộ khám phụ khoa",
        fileTitle: "TEMCYC_002",
      });

      expect(html).toContain("BV103-CYC-002");
      expect(html).toContain("Bộ khám phụ khoa");
      expect(html).toContain("CSSD / Toàn viện");
      expect(html).toContain("Theo quy định KSNK");
      expect(html).toContain("CSSD");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("null");
    });
  });
});
