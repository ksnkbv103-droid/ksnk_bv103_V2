import { describe, expect, it } from "vitest";
import type { Catalog } from "../types/catalog.types";
import { boIdsForLoai } from "./cssd-catalog-page-helpers";

const empty: Catalog = { bo: [], chi_tiet: [], loai: [], hoa_chat: [] };

describe("boIdsForLoai", () => {
  it("prefers bo_dung_cu_chua on the type over truncated chi_tiet", () => {
    const catalog: Catalog = {
      ...empty,
      loai: [
        {
          id: "loai-1",
          ma_loai_dung_cu: "1009S8",
          ten_loai_dung_cu: "Ống kính",
          is_active: true,
          bo_dung_cu_chua: [{ id: "bo-view", ma_bo: "B01", ten_bo: "Bộ nội soi" }],
        },
      ],
      chi_tiet: [],
    };
    expect(boIdsForLoai(catalog, "loai-1")).toEqual(["bo-view"]);
  });

  it("falls back to chi_tiet when the type has no chua list", () => {
    const catalog: Catalog = {
      ...empty,
      loai: [{ id: "loai-1", ma_loai_dung_cu: "X", ten_loai_dung_cu: "X", is_active: true, bo_dung_cu_chua: [] }],
      chi_tiet: [
        {
          id: "ct-1",
          ma_chi_tiet: "DC-1",
          ten_chi_tiet: "Kẹp",
          so_luong: 1,
          bo_dung_cu_id: "bo-ct",
          ten_bo: "Bộ A",
          loai_dung_cu_id: "loai-1",
          ten_loai: "X",
          is_active: true,
        },
      ],
    };
    expect(boIdsForLoai(catalog, "loai-1")).toEqual(["bo-ct"]);
  });
});
