"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteVSTSessions, assertCanEditVSTSession } from "../actions/vst-write-delete.actions";
import { getVSTSessionDetail, getVSTSessionsPaginated } from "../actions/vst-read.actions";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import { getVSTHistoryColumns } from "../components/VSTHistoryColumns";
import { useVstPrint } from "../hooks/use-vst-print";
import { enrichVstSessionRows, type VstHistoryRow } from "../lib/vst-read-utils";
import { buildVstViewDataFromDetail } from "../lib/vst-session-view-data";
import { consumeSupervisionHistoryStale } from "@/lib/supervision-form-nav";
import { getCategoriesByType } from "@/lib/master-data/categories-by-type";
import { getCategoriesByTypeCached } from "@/lib/client-cache/danh-muc-cache";
import type { VstPrintData } from "../hooks/use-vst-print";

const MODULE_KEY = "GIAM_SAT_VST";

export function useVstHistoryTable() {
  const router = useRouter();
  const { allowed } = useModulePermission(MODULE_KEY);
  const { printingSessionId, printData, onPrint } = useVstPrint();
  const [viewData, setViewData] = useState<VstPrintData | null>(null);
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);

  const fetchAction = useCallback(async (params: ServerPaginationParams) => {
    const res = await getVSTSessionsPaginated({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortKey: params.sortKey,
      sortDir: params.sortDir,
    });
    if (!res.success) {
      toast.error("Lỗi tải lịch sử: " + res.error);
      return { success: false, data: [], totalCount: 0, error: res.error };
    }
    return { success: true, data: enrichVstSessionRows(res.data || []), totalCount: res.totalCount };
  }, []);

  const {
    data: processedData,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    searchTerm,
    handleSearch,
    handleSort,
    loading,
    refresh,
  } = useServerPaginatedTable({ fetchAction, defaultPageSize: 20 });

  useEffect(() => {
    if (consumeSupervisionHistoryStale("vst")) refresh();
  }, [refresh]);

  const loadViewData = useCallback(async (sessionId: string) => {
    const [detailRes, nnRes, kRes, kvRes] = await Promise.all([
      getVSTSessionDetail(sessionId),
      getCategoriesByTypeCached("NGHE_NGHIEP", getCategoriesByType),
      getCategoriesByTypeCached("KHOA_PHONG", getCategoriesByType),
      getCategoriesByTypeCached("KHU_VUC_GIAM_SAT", getCategoriesByType),
    ]);
    if (!detailRes.success) {
      toast.error(String(detailRes.error || "Không đọc được phiên"));
      return null;
    }
    return buildVstViewDataFromDetail(
      {
        session: detailRes.session as Record<string, unknown>,
        observations: (detailRes.observations || []) as Array<Record<string, unknown>>,
        nhanSuForPrint: detailRes.nhanSuForPrint,
      },
      {
        ngheNghieps: (nnRes.data || []) as VstPrintData["ngheNghieps"],
        khoas: (kRes.data || []) as VstPrintData["khoas"],
        khuVucs: (kvRes.data || []) as VstPrintData["khuVucs"],
      },
    );
  }, []);

  const onView = useCallback(
    async (session: VstHistoryRow) => {
      const id = String(session.id || "").trim();
      if (!id) return;
      const data = await loadViewData(id);
      if (data) {
        setViewSessionId(id);
        setViewData(data);
      }
    },
    [loadViewData],
  );

  const onEdit = useCallback(
    async (sessionId: string) => {
      const id = String(sessionId || "").trim();
      if (!id) return;
      const can = await assertCanEditVSTSession(id);
      if (!can.success) {
        toast.error(can.error);
        return;
      }
      router.push(`/giam-sat-vst?edit=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const handleDelete = useCallback(
    async (items: VstHistoryRow[]) => {
      const ids = items.map((i) => String(i.id)).filter(Boolean);
      if (!ids.length || !confirm(`Xóa vĩnh viễn ${ids.length} phiên khỏi cơ sở dữ liệu? Chỉ phiên do bạn giám sát mới được xóa.`)) {
        return;
      }
      const res = await deleteVSTSessions(ids);
      if (res.success) {
        toast.success(`Đã xóa ${ids.length} phiên khỏi cơ sở dữ liệu`);
        refresh();
      } else {
        toast.error("Lỗi khi xóa: " + res.error);
      }
    },
    [refresh],
  );

  const columns = useMemo(
    () =>
      getVSTHistoryColumns(
        printingSessionId,
        onView,
        (id) => void onPrint(id),
        (id) => void onEdit(id),
        Boolean(allowed.edit),
      ),
    [printingSessionId, onView, onPrint, onEdit, allowed.edit],
  );

  return {
    allowed,
    columns,
    processedData,
    loading,
    searchTerm,
    handleSort,
    handleSearch,
    handleDelete,
    onView,
    printData,
    viewData,
    viewSessionId,
    setViewData,
    setViewSessionId,
    onPrint,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
  };
}
