// src/hooks/useGenerateMa.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCategoriesByType } from "@/modules/quan-tri-he-thong/danh-muc/actions/danh-muc.actions";

type MaRow = Record<string, unknown>;

function pickMaToken(row: MaRow): string {
  const v =
    row.ma_danh_muc ??
    row.ma_nv ??
    row.ma_cong_viec ??
    row.ma_cv ??
    row.ma_ma_danh_muc ??
    row.ma_ca ??
    row.ma;
  return typeof v === "string" ? v : "";
}

/**
 * Hook tự động sinh mã theo format Prefix + Số thứ tự (VD: BK001, NV002)
 * @param prefix Tiền tố mã (BK, NV, CV...)
 * @param loaiDanhMuc Loại danh mục trong registry dm_* (optional)
 * @param customAction Action tùy chỉnh để lấy dữ liệu
 */
export function useGenerateMa(
  prefix: string,
  loaiDanhMuc?: string,
  customAction?: () => Promise<{ success: boolean; data?: MaRow[] }>,
) {
  const [maTuDong, setMaTuDong] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateMa = useCallback(async () => {
    setLoading(true);
    try {
      let data: MaRow[] = [];
      if (customAction) {
        const res = await customAction();
        if (res.success) data = res.data || [];
      } else if (loaiDanhMuc) {
        const res = await getCategoriesByType(loaiDanhMuc);
        if (res.success) data = (res.data as MaRow[]) || [];
      }

      if (data.length > 0) {
        const codes = data
          .map((t) => pickMaToken(t))
          .filter((code) => code && code.startsWith(prefix))
          .map((code) => parseInt(code.replace(prefix, ""), 10))
          .filter((num) => !Number.isNaN(num));

        const maxNum = codes.length > 0 ? Math.max(...codes) : 0;
        const newCode = `${prefix}${(maxNum + 1).toString().padStart(3, "0")}`;
        setMaTuDong(newCode);
        return newCode;
      }
      const newCode = `${prefix}001`;
      setMaTuDong(newCode);
      return newCode;
    } catch (error) {
      console.error("Lỗi khi sinh mã tự động:", error);
    } finally {
      setLoading(false);
    }
    return "";
  }, [prefix, loaiDanhMuc, customAction]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinh mã khi đổi prefix / loại danh mục
    void generateMa();
  }, [generateMa]);

  return { maTuDong, generateMa, loading };
}
