// src/modules/giam-sat-vst/components/HistoryTable.tsx
"use client";

import React, { useCallback, useMemo } from "react";
import { deleteVSTSessions } from "../actions/vst.actions";
import { getVSTSessionsPaginated } from "../actions/vst-read.actions";
import VSTPrintView from "./VSTPrintView";
import { toast } from "sonner";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import { getVSTHistoryColumns } from "./VSTHistoryColumns";
import { useVstPrint } from "../hooks/use-vst-print";
import { enrichVstSessionRows, type VstHistoryRow } from "../lib/vst-read-utils";

const MODULE_KEY = "GIAM_SAT_VST";

export default function HistoryTable({
  onEditSessionId,
}: {
  onEditSessionId?: (sessionId: string) => void;
}) {
  const { allowed } = useModulePermission(MODULE_KEY);
  const { isPrinting, printingSessionId, printData, onPrint } = useVstPrint();

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
    totalCount, totalPages,
    page, setPage,
    pageSize, searchTerm,
    handleSearch, handleSort,
    loading, refresh,
  } = useServerPaginatedTable({ fetchAction, defaultPageSize: 20 });

  const handleDelete = async (items: VstHistoryRow[]) => {
    const ids = items.map((i) => String(i.id)).filter(Boolean);
    if (!ids.length || !confirm(`Xóa vĩnh viễn ${ids.length} phiên khỏi cơ sở dữ liệu? Chỉ phiên do bạn giám sát mới được xóa.`)) return;
    try {
      const res = await deleteVSTSessions(ids);
      if (res.success) {
        toast.success(`Đã xóa ${ids.length} phiên khỏi cơ sở dữ liệu`);
        refresh();
      } else {
        toast.error("Lỗi khi xóa: " + res.error);
      }
    } catch (error: unknown) {
      toast.error("Lỗi: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const columns = useMemo(
    () =>
      getVSTHistoryColumns(
        printingSessionId,
        onPrint,
        onEditSessionId,
        Boolean(allowed.edit),
      ),
    [printingSessionId, onPrint, onEditSessionId, allowed.edit],
  );

  return (
    <div className="w-full space-y-4">
      {printData && <VSTPrintView {...printData} />}
      <div className="print:hidden">
        <AdvancedDataTable 
          columns={columns}
          data={processedData}
          enableMultiSelect={allowed.delete}
          onDeleteSelected={allowed.delete ? handleDelete : undefined}
          onRowClick={(s) => onPrint(s.id)}
          onSearch={handleSearch}
          onSort={handleSort}
          searchValue={searchTerm}
          searchPlaceholder="Tìm kiếm người giám sát, hình thức..."
          loading={loading}
          serverPagination={{ page, totalPages, totalCount, pageSize, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
