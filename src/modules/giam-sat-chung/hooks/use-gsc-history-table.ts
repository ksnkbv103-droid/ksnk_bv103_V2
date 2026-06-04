// src/modules/giam-sat-chung/hooks/use-gsc-history-table.ts
"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { deleteGiamSatChungSessions } from "../actions/giam-sat-chung.actions";
import { getGiamSatChungHistoryPaginated } from "../actions/giam-sat-chung-read.actions";
import { getBangKiemsForGiamSat } from "@/lib/mdm-read-gateway";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import { getGSCHistoryColumns } from "../components/GSCHistoryColumns";
import { useGscPrint } from "./use-gsc-print";
import { enrichGscHistoryRows, type GscHistoryRow } from "../lib/gsc-read-utils";
import type { GscViewBundle } from "../lib/load-gsc-view-bundle";
import { assertCanEditGiamSatChungSession } from "../actions/giam-sat-chung-session-meta.actions";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";

const MODULE_KEY = "GIAM_SAT_CHUNG";

export type { GscHistoryRow } from "../lib/gsc-read-utils";

export function useGscHistoryTable(
  onEditBundle?: (bundle: GscViewBundle, row: GscHistoryRow) => void,
  loaiGiamSat?: GscLoaiGiamSatRoute,
) {
  const { allowed } = useModulePermission(MODULE_KEY);
  const [dbTemplates, setDbTemplates] = useState<Record<string, unknown>[]>([]);
  const { printingBundle, onPrint, buildBundle } = useGscPrint(dbTemplates);
  const [viewingBundle, setViewingBundle] = useState<GscViewBundle | null>(null);

  const fetchAction = useCallback(async (params: ServerPaginationParams) => {
    const res = await getGiamSatChungHistoryPaginated({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortKey: params.sortKey,
      sortDir: params.sortDir,
      loaiGiamSat,
    });
    if (!res.success) {
      toast.error("Lỗi tải lịch sử: " + res.error);
      return { success: false, data: [], totalCount: 0, error: res.error };
    }
    return { success: true, data: enrichGscHistoryRows(res.data || []), totalCount: res.totalCount };
  }, [loaiGiamSat]);

  const {
    data: processedData,
    totalCount, totalPages,
    page, setPage,
    pageSize, searchTerm,
    handleSearch, handleSort,
    loading, refresh,
  } = useServerPaginatedTable({ fetchAction, defaultPageSize: 20 });

  useEffect(() => {
    async function loadTemplates() {
      const res = await getBangKiemsForGiamSat();
      if (res.success) setDbTemplates((res.data as Record<string, unknown>[]) || []);
    }
    void loadTemplates();
  }, []);

  const onView = useCallback(
    async (session: GscHistoryRow) => {
      const b = await buildBundle(session);
      if (b) setViewingBundle(b);
    },
    [buildBundle],
  );

  const onEdit = useCallback(
    async (session: GscHistoryRow) => {
      const id = String(session.id || "").trim();
      if (!id) return;
      const can = await assertCanEditGiamSatChungSession(id);
      if (!can.success) {
        toast.error(can.error);
        return;
      }
      const b = await buildBundle(session);
      if (b) onEditBundle?.(b, session);
    },
    [buildBundle, onEditBundle],
  );

  const handleDelete = useCallback(async (items: { id: string }[]) => {
    const ids = items.map((i) => String(i.id)).filter(Boolean);
    if (!ids.length || !confirm(`Xóa vĩnh viễn ${ids.length} phiên khỏi cơ sở dữ liệu? Chỉ phiên do bạn giám sát mới được xóa.`)) return;
    const res = await deleteGiamSatChungSessions(ids);
    if (res.success) {
      toast.success(`Đã xóa ${ids.length} phiên khỏi cơ sở dữ liệu`);
      refresh();
    } else toast.error("Lỗi xóa: " + res.error);
  }, [refresh]);

  const columns = useMemo(
    () => getGSCHistoryColumns(onView, (s) => onPrint(s), onEdit, Boolean(allowed.edit)),
    [onView, onPrint, onEdit, allowed.edit],
  );

  return {
    allowed,
    printingBundle,
    viewingBundle,
    setViewingBundle,
    columns,
    processedData,
    loading,
    searchTerm,
    handleSort,
    handleSearch,
    handleDelete,
    onView,
    printSession: onPrint,
    page, setPage, pageSize, totalCount, totalPages,
  };
}
