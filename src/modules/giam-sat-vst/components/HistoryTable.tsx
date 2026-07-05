// src/modules/giam-sat-vst/components/HistoryTable.tsx
"use client";

import React from "react";
import VSTPrintView from "./VSTPrintView";
import VstSessionViewer from "./VstSessionViewer";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useVstHistoryTable } from "../hooks/use-vst-history-table";

export default function HistoryTable() {
  const {
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
  } = useVstHistoryTable();

  return (
    <div className="w-full space-y-4">
      {printData && <VSTPrintView {...printData} />}
      <VstSessionViewer
        open={Boolean(viewData)}
        data={viewData}
        onClose={() => {
          setViewData(null);
          setViewSessionId(null);
        }}
        onPrint={() => {
          if (viewSessionId) void onPrint(viewSessionId);
        }}
      />
      <div className="print:hidden">
        <AdvancedDataTable
          columns={columns}
          data={processedData}
          tableClassName="w-full min-w-[1024px] table-fixed border-collapse text-left"
          enableMultiSelect={allowed.delete}
          onDeleteSelected={allowed.delete ? handleDelete : undefined}
          onRowClick={(s) => void onView(s)}
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
