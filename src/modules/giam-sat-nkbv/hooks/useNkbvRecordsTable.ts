"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { listNkbvMedicalRecords } from "../actions/giam-sat-nkbv.actions";
import { createDebouncedLatestCaller } from "./nkbv-records-list-caller";

export type NkbvMedicalRecordRow = {
  id: string;
  ma_benh_an?: string | null;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien?: string | null;
  ngay_ra_vien?: string | null;
  khoa_dieu_tri_id?: string | null;
  [key: string]: unknown;
};

type ListParams = {
  page: number;
  search: string;
  inpatientOnly: boolean;
  devicePriorityOnly: boolean;
  chuaPhanTichOnly: boolean;
  khoaId: string;
};

type ListResult = Awaited<ReturnType<typeof listNkbvMedicalRecords>>;

const PAGE_SIZE = 15;

/**
 * Tab «Hồ sơ bệnh án»: debounce tìm kiếm 300 ms + bỏ phản hồi cũ.
 * Chọn A (không C/`useServerPaginatedTable`): cần `enabled` theo tab + 4 bộ lọc
 * ngoài ServerPaginationParams; vitest node → caller thuần test được debounce/race.
 */
export function useNkbvRecordsTable(opts: {
  enabled: boolean;
  inpatientOnly: boolean;
  devicePriorityOnly: boolean;
  chuaPhanTichOnly: boolean;
  khoaId: string;
}) {
  const [data, setData] = useState<NkbvMedicalRecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const paramsRef = useRef<ListParams>({
    page: 1,
    search: "",
    inpatientOnly: opts.inpatientOnly,
    devicePriorityOnly: opts.devicePriorityOnly,
    chuaPhanTichOnly: opts.chuaPhanTichOnly,
    khoaId: opts.khoaId,
  });
  paramsRef.current = {
    page,
    search: searchTerm,
    inpatientOnly: opts.inpatientOnly,
    devicePriorityOnly: opts.devicePriorityOnly,
    chuaPhanTichOnly: opts.chuaPhanTichOnly,
    khoaId: opts.khoaId,
  };
  const enabledRef = useRef(opts.enabled);
  enabledRef.current = opts.enabled;

  const applyResult = useCallback((res: ListResult) => {
    setLoading(false);
    if (res.success) {
      setData((res.data || []) as NkbvMedicalRecordRow[]);
      setTotalCount(res.totalCount ?? 0);
    } else {
      toast.error(res.error || "Không thể tải danh sách bệnh án");
    }
  }, []);

  const onError = useCallback((error: unknown) => {
    setLoading(false);
    toast.error(error instanceof Error ? error.message : "Lỗi");
  }, []);

  const callerRef = useRef<ReturnType<typeof createDebouncedLatestCaller<ListParams, ListResult>> | null>(
    null,
  );

  useEffect(() => {
    const caller = createDebouncedLatestCaller<ListParams, ListResult>(async (params) => {
      if (!enabledRef.current) {
        return { success: true as const, data: [], totalCount: 0 };
      }
      setLoading(true);
      return listNkbvMedicalRecords({
        page: params.page,
        pageSize: PAGE_SIZE,
        search: params.search,
        inpatientOnly: params.inpatientOnly,
        devicePriorityOnly: params.devicePriorityOnly,
        chuaPhanTichOnly: params.chuaPhanTichOnly,
        khoaId: params.khoaId || null,
      });
    }, { debounceMs: 300 });
    callerRef.current = caller;
    return () => {
      caller.dispose();
      callerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!opts.enabled) return;
    callerRef.current?.schedule(paramsRef.current, applyResult, onError);
  }, [
    opts.enabled,
    opts.inpatientOnly,
    opts.devicePriorityOnly,
    opts.chuaPhanTichOnly,
    opts.khoaId,
    page,
    searchTerm,
    applyResult,
    onError,
  ]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    if (!enabledRef.current) return;
    callerRef.current?.runImmediate(paramsRef.current, applyResult, onError);
  }, [applyResult, onError]);

  return {
    data,
    loading,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE) || 1),
    searchTerm,
    handleSearch,
    refresh,
  };
}
