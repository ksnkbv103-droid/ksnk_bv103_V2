import { describe, it, expect } from "vitest";
import {
  aggregateTheoNguoi,
  aggregateTheoTrangThai,
  listQuaHanMo,
  listDongHanTrongKy,
  rowTouchesPeriod,
  rowsToCsv,
  type QlcvBaoCaoRow,
} from "./qlcv-bao-cao-ky";
import { resolveQlcvPeriodRange } from "./qlcv-period-range";

const period = resolveQlcvPeriodRange("MONTH", new Date(Date.UTC(2026, 8, 15))); // Sep 2026

function row(partial: Partial<QlcvBaoCaoRow> & { id: string; tieu_de: string }): QlcvBaoCaoRow {
  return {
    trang_thai: "DANG_LAM",
    is_active: true,
    han_hoan_thanh: null,
    hoan_thanh_luc: null,
    phan_tram_hoan_thanh: 0,
    nguoi_phu_trach_id: "ns-a",
    nguoi_phu_trach_ten: "An",
    nguoi_giao_viec_id: "ns-g",
    nguoi_giao_ten: "Giao",
    created_at: "2026-09-10T00:00:00Z",
    ...partial,
  };
}

describe("rowTouchesPeriod", () => {
  it("matches han in range", () => {
    expect(
      rowTouchesPeriod(row({ id: "1", tieu_de: "x", han_hoan_thanh: "2026-09-20" }), period),
    ).toBe(true);
  });
  it("rejects outside range", () => {
    expect(
      rowTouchesPeriod(
        row({
          id: "1",
          tieu_de: "x",
          han_hoan_thanh: "2026-08-01",
          created_at: "2026-08-01T00:00:00Z",
          hoan_thanh_luc: null,
        }),
        period,
      ),
    ).toBe(false);
  });
});

describe("aggregateTheoNguoi", () => {
  it("counts mo / qua_han / hoan_thanh / dung_han", () => {
    const rows: QlcvBaoCaoRow[] = [
      row({ id: "1", tieu_de: "open", han_hoan_thanh: "2026-09-25" }),
      row({
        id: "2",
        tieu_de: "late open",
        han_hoan_thanh: "2026-09-01",
        trang_thai: "QUA_HAN",
      }),
      row({
        id: "3",
        tieu_de: "done on time",
        trang_thai: "HOAN_THANH",
        han_hoan_thanh: "2026-09-20",
        hoan_thanh_luc: "2026-09-18T10:00:00Z",
      }),
      row({
        id: "4",
        tieu_de: "done late",
        trang_thai: "HOAN_THANH",
        han_hoan_thanh: "2026-09-10",
        hoan_thanh_luc: "2026-09-15T10:00:00Z",
      }),
    ];
    const out = aggregateTheoNguoi(rows, period);
    expect(out).toHaveLength(1);
    expect(out[0]!.phu_trach).toBe("An");
    expect(out[0]!.mo).toBe(2);
    expect(out[0]!.qua_han).toBeGreaterThanOrEqual(1);
    expect(out[0]!.hoan_thanh).toBe(2);
    expect(out[0]!.dung_han).toBe(1);
  });
});

describe("aggregateTheoTrangThai", () => {
  it("separates de xuat from 7 canonical", () => {
    const rows = [
      row({ id: "1", tieu_de: "a", trang_thai: "MOI", is_active: false }),
      row({ id: "2", tieu_de: "b", trang_thai: "DANG_LAM" }),
      row({ id: "3", tieu_de: "c", trang_thai: "HOAN_THANH" }),
    ];
    const out = aggregateTheoTrangThai(rows);
    const deXuat = out.find((x) => x.ma === "DE_XUAT");
    const dangLam = out.find((x) => x.ma === "DANG_LAM");
    expect(deXuat?.so_luong).toBe(1);
    expect(dangLam?.so_luong).toBe(1);
  });
});

describe("listQuaHanMo / listDongHanTrongKy", () => {
  it("lists overdue open", () => {
    const rows = [
      row({ id: "1", tieu_de: "late", han_hoan_thanh: "2020-01-01", trang_thai: "DANG_LAM" }),
      row({ id: "2", tieu_de: "ok", han_hoan_thanh: "2099-01-01", trang_thai: "DANG_LAM" }),
    ];
    const q = listQuaHanMo(rows);
    expect(q.map((x) => x.id)).toEqual(["1"]);
  });

  it("classifies dung han vs tre", () => {
    const rows = [
      row({
        id: "1",
        tieu_de: "on",
        trang_thai: "HOAN_THANH",
        han_hoan_thanh: "2026-09-20",
        hoan_thanh_luc: "2026-09-18T00:00:00Z",
      }),
      row({
        id: "2",
        tieu_de: "late",
        trang_thai: "HOAN_THANH",
        han_hoan_thanh: "2026-09-10",
        hoan_thanh_luc: "2026-09-15T00:00:00Z",
      }),
    ];
    const d = listDongHanTrongKy(rows, period);
    expect(d.find((x) => x.id === "1")?.ket_qua).toBe("DUNG_HAN");
    expect(d.find((x) => x.id === "2")?.ket_qua).toBe("TRE");
  });
});

describe("rowsToCsv", () => {
  it("emits BOM + header", () => {
    const csv = rowsToCsv([{ a: 1, b: "x,y" }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("a,b");
    expect(csv).toContain('"x,y"');
  });
});
