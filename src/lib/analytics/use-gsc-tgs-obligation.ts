"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getGscTgsObligationContext,
  type GscTgsObligationContext,
} from "@/lib/analytics/gsc-tgs-obligation.actions";

export function useGscTgsObligation(args: {
  enabled: boolean;
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
}) {
  const [data, setData] = useState<GscTgsObligationContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!args.enabled || !args.tuNgay || !args.denNgay) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getGscTgsObligationContext({
        tu_ngay: args.tuNgay,
        den_ngay: args.denNgay,
        khoi_ids: args.selectedKhoiIds.length > 0 ? args.selectedKhoiIds : undefined,
        khoa_ids: args.selectedKhoaIds.length > 0 ? args.selectedKhoaIds : undefined,
      });
      if (res.success) setData(res.data);
      else {
        setData(null);
        setError(res.error);
      }
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Không tải được bao phủ TGS");
    } finally {
      setLoading(false);
    }
  }, [args.enabled, args.tuNgay, args.denNgay, args.selectedKhoiIds, args.selectedKhoaIds]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
