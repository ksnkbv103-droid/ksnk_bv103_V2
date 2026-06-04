// src/modules/giam-sat-chung/components/HistoryTable.tsx
"use client";

import React from "react";
import GiamSatChungPrintView from "./GiamSatChungPrintView";
import GiamSatChungSessionViewer from "./GiamSatChungSessionViewer";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useGscHistoryTable, type GscHistoryRow } from "../hooks/use-gsc-history-table";
import type { GscViewBundle } from "../lib/load-gsc-view-bundle";

import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";

export default function HistoryTable({
  onEditBundle,
  loaiGiamSat,
}: {
  onEditBundle?: (bundle: GscViewBundle, row: GscHistoryRow) => void;
  loaiGiamSat?: GscLoaiGiamSatRoute;
}) {
  const {
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
    printSession,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
  } = useGscHistoryTable(onEditBundle, loaiGiamSat);

  return (
    <div className="space-y-6">
      {printingBundle && (
        <GiamSatChungPrintView
          session={printingBundle.session}
          results={printingBundle.results}
          template={printingBundle.template}
          khoas={printingBundle.khoas}
          khuVucs={printingBundle.khuVucs}
          ngheNghieps={printingBundle.ngheNghieps}
          nhanSus={printingBundle.nhanSus}
        />
      )}

      <GiamSatChungSessionViewer
        open={viewingBundle !== null}
        session={viewingBundle?.session || {}}
        results={viewingBundle?.results || []}
        template={viewingBundle?.template || { id: "", title: "", criteria: [] }}
        khoas={viewingBundle?.khoas || []}
        khuVucs={viewingBundle?.khuVucs || []}
        ngheNghieps={viewingBundle?.ngheNghieps || []}
        nhanSus={viewingBundle?.nhanSus || []}
        onClose={() => setViewingBundle(null)}
        onPrint={() => {
          if (!viewingBundle) return;
          const row = viewingBundle.session as GscHistoryRow;
          setViewingBundle(null);
          void printSession(row);
        }}
      />

      <div className="print:hidden">
        <AdvancedDataTable
          columns={columns}
          data={processedData}
          loading={loading}
          tableClassName="w-full min-w-[1200px] table-fixed border-collapse text-left"
          enableMultiSelect={allowed.delete}
          onDeleteSelected={allowed.delete ? handleDelete : undefined}
          onSearch={handleSearch}
          onSort={handleSort}
          searchValue={searchTerm}
          searchPlaceholder="Tìm kiếm phiên giám sát..."
          onRowClick={(s) => void onView(s as GscHistoryRow)}
          serverPagination={{ page, totalPages, totalCount, pageSize, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
