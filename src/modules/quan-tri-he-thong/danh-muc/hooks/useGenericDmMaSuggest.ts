"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { mdmSuggestNextGenericDmMa } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";

/** Gợi ý mã DM-xxxx khi thêm dòng danh mục chuyên biệt (server: buildNextDmBusinessCode). */
export function useGenericDmMaSuggest(loaiKey: string) {
  const [suggestLoading, setSuggestLoading] = useState(false);

  const fillSuggestedMa = useCallback(async (): Promise<string> => {
    setSuggestLoading(true);
    try {
      const res = await mdmSuggestNextGenericDmMa(loaiKey);
      if (res.success) return res.data;
      const err = "error" in res ? res.error : "Lỗi gợi ý mã";
      toast.error(String(err));
      if (/schema|could not find|does not exist/i.test(String(err))) {
        toast.info(
          "Chạy migration tạo bảng dm_* trên Supabase (repo: 20260516001_dm_cong_viec_catalog_tables.sql), sau đó migration reload schema hoặc bấm Reload schema trên Dashboard.",
        );
      }
      return "";
    } finally {
      setSuggestLoading(false);
    }
  }, [loaiKey]);

  return { suggestLoading, fillSuggestedMa };
}
