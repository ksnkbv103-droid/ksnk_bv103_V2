"use client";

import { VST_EDIT_REASON_MIN_CHARS } from "../lib/vst-edit-reason";
import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteVSTSessions, assertCanEditVSTSession } from "../actions/vst-write-delete.actions";
import { getVSTSessionDetail, getVSTSessionsPaginated, getVstViewDanhMuc } from "../actions/vst-read.actions";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import { getVSTHistoryColumns } from "../components/VSTHistoryColumns";
import { useVstPrint } from "../hooks/use-vst-print";
import { enrichVstSessionRows, type VstHistoryRow } from "../lib/vst-read-utils";
import { buildVstViewDataFromDetail } from "../lib/vst-session-view-data";
import { consumeSupervisionHistoryStale } from "@/lib/supervision-form-nav";
import type { VstPrintData } from "../hooks/use-vst-print";
import { confirmAction, promptText } from "@/components/shared/confirm-action";

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
    const [detailRes, dmRes] = await Promise.all([getVSTSessionDetail(sessionId), getVstViewDanhMuc()]);
    if (!detailRes.success) {
      toast.error(String(detailRes.error || "Không đọc được phiên"));
      return null;
    }
    if (!dmRes.success) {
      toast.error(dmRes.error || "Không đọc được danh mục");
      return null;
    }
    return buildVstViewDataFromDetail(
      {
        session: detailRes.session as Record<string, unknown>,
        observations: (detailRes.observations || []) as Array<Record<string, unknown>>,
        nhanSuForPrint: detailRes.nhanSuForPrint,
      },
      {
        ngheNghieps: dmRes.data.ngheNghieps as VstPrintData["ngheNghieps"],
        khoas: dmRes.data.khoas as VstPrintData["khoas"],
        khuVucs: dmRes.data.khuVucs as VstPrintData["khuVucs"],
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
      if (!ids.length) return;
      if (
        !(await confirmAction(
          `Vô hiệu ${ids.length} phiên giám sát (xóa mềm — dữ liệu vẫn lưu ≥3 năm theo QT.07)? Phiên của bạn trong 30 phút được xóa ngay; quá 30 phút sẽ gửi yêu cầu chờ chủ nhiệm khoa duyệt.`,
        ))
      ) {
        return;
      }
      const lyDo = await promptText({
        title: "Lý do xóa phiên",
        label: "Lý do xóa (bắt buộc)",
        minLength: VST_EDIT_REASON_MIN_CHARS,
        multiline: true,
        tone: "danger",
        confirmText: "Xóa phiên",
      });
      if (lyDo == null) return;
      const res = await deleteVSTSessions(ids, { lyDo });
      if (res.success) {
        const cho = res.choDuyet ?? 0;
        if (cho > 0) toast.message(`Đã gửi ${cho} yêu cầu xóa, chờ chủ nhiệm khoa duyệt.`);
        if (ids.length - cho > 0) toast.success(`Đã vô hiệu ${ids.length - cho} phiên`);
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
