"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { mdmSuggestNextGenericDmMa } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";

/** Gợi ý mã theo prefix chuẩn (NN_, HT_, …) — slug từ tên nếu có. */
export function useGenericDmMaSuggest(loaiKey: string) {
  const [suggestLoading, setSuggestLoading] = useState(false);

  const fillSuggestedMa = useCallback(async (ten?: string): Promise<string> => {
    setSuggestLoading(true);
    try {
      const res = await mdmSuggestNextGenericDmMa(loaiKey, ten?.trim() || undefined);
      if (res.success) return res.data;
      const err = "error" in res ? res.error : "Lỗi gợi ý mã";
      toast.error(String(err));
      return "";
    } finally {
      setSuggestLoading(false);
    }
  }, [loaiKey]);

  return { suggestLoading, fillSuggestedMa };
}
