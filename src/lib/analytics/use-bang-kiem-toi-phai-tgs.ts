"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBangKiemToiPhaiTgsAction,
  type BangKiemToiPhaiTgsPayload,
} from "@/lib/analytics/bang-kiem-toi-phai-tgs.actions";

export function useBangKiemToiPhaiTgs(args: {
  tuNgay: string;
  denNgay: string;
  khoaId: string | null;
  enabled?: boolean;
}) {
  const [data, setData] = useState<BangKiemToiPhaiTgsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!args.enabled || !args.khoaId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getBangKiemToiPhaiTgsAction({
      tu_ngay: args.tuNgay,
      den_ngay: args.denNgay,
      khoa_id: args.khoaId,
    });
    setLoading(false);
    if (res.success) setData(res.data);
    else {
      setData(null);
      setError(res.error);
    }
  }, [args.tuNgay, args.denNgay, args.khoaId, args.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
