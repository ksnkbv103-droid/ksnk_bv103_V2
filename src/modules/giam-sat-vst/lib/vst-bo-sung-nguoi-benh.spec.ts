import { describe, expect, it } from "vitest";
import {
  buildVstBoSungNbMetadata,
  isVstSessionsMetadataColumnMissing,
  parseVstBoSungNbFromSessionRow,
} from "./vst-bo-sung-nguoi-benh";

describe("buildVstBoSungNbMetadata", () => {
  it("default off → is_bo_sung false + null fields (gan_nb=false)", () => {
    const meta = buildVstBoSungNbMetadata({ is_bo_sung_nguoi_benh: false });
    expect(meta.is_bo_sung_nguoi_benh).toBe(false);
    expect(meta.ma_benh_an).toBeNull();
    expect(meta.ma_nguoi_benh).toBeNull();
    expect(meta.ten_nguoi_benh).toBeNull();
    expect(meta.so_giuong_nguoi_benh).toBeNull();
  });

  it("GS-03: toggle on để trống → true + trường NB null", () => {
    const meta = buildVstBoSungNbMetadata({ is_bo_sung_nguoi_benh: true });
    expect(meta.is_bo_sung_nguoi_benh).toBe(true);
    expect(meta.ma_benh_an).toBeNull();
    expect(meta.ten_nguoi_benh).toBeNull();
  });

  it("toggle on + có tên → persist fields", () => {
    const meta = buildVstBoSungNbMetadata({
      is_bo_sung_nguoi_benh: true,
      ma_benh_an: "BA-1",
      ma_nguoi_benh: "NB-1",
      ten_nguoi_benh: "Nguyễn A",
      so_giuong_nguoi_benh: "G1",
      bn_tho_may: true,
    });
    expect(meta.is_bo_sung_nguoi_benh).toBe(true);
    expect(meta.ma_benh_an).toBe("BA-1");
    expect(meta.ma_nguoi_benh).toBe("NB-1");
    expect(meta.ten_nguoi_benh).toBe("Nguyễn A");
    expect(meta.so_giuong_nguoi_benh).toBe("G1");
    expect(meta.bn_tho_may).toBe(true);
  });
});

describe("isVstSessionsMetadataColumnMissing", () => {
  it("nhận PostgREST schema-cache / column missing", () => {
    expect(
      isVstSessionsMetadataColumnMissing({
        message: "Could not find the 'metadata' column of 'gstt_fact_vst_sessions' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isVstSessionsMetadataColumnMissing(
        new Error('column "metadata" of relation "gstt_fact_vst_sessions" does not exist'),
      ),
    ).toBe(true);
    expect(isVstSessionsMetadataColumnMissing({ message: "FK khoa_id violation" })).toBe(false);
    expect(
      isVstSessionsMetadataColumnMissing({
        message: "Could not find the 'is_bo_sung_nguoi_benh' column of 'v_gstt_giam_sat_vst_sessions_full' in the schema cache",
      }),
    ).toBe(true);
  });
});

describe("parseVstBoSungNbFromSessionRow", () => {
  it("đọc từ cột flatten view", () => {
    const parsed = parseVstBoSungNbFromSessionRow({
      is_bo_sung_nguoi_benh: true,
      ma_benh_an: "BA-2",
      ten_nguoi_benh: "Trần B",
      so_giuong_nguoi_benh: "G2",
    });
    expect(parsed.is_bo_sung_nguoi_benh).toBe(true);
    expect(parsed.ma_benh_an).toBe("BA-2");
    expect(parsed.ten_nguoi_benh).toBe("Trần B");
  });

  it("đọc từ metadata jsonb khi chưa flatten", () => {
    const parsed = parseVstBoSungNbFromSessionRow({
      metadata: {
        is_bo_sung_nguoi_benh: true,
        ma_nguoi_benh: "NB-9",
        ten_nguoi_benh: "Lê C",
      },
    });
    expect(parsed.is_bo_sung_nguoi_benh).toBe(true);
    expect(parsed.ma_nguoi_benh).toBe("NB-9");
    expect(parsed.ten_nguoi_benh).toBe("Lê C");
  });

  it("thiếu dữ liệu → default off", () => {
    const parsed = parseVstBoSungNbFromSessionRow({});
    expect(parsed.is_bo_sung_nguoi_benh).toBe(false);
    expect(parsed.ten_nguoi_benh).toBe("");
  });
});
