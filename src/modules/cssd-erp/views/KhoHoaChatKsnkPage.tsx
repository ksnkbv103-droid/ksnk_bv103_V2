// src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HoaChatMasterPage from "@/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatMasterPage";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import KhoHoaChatMoveSheet from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import KhoHoaChatSuCoPanel from "../components/kho-hoa-chat/kho-hoa-chat-su-co-panel";
import KhoHoaChatFilterBar from "../components/kho-hoa-chat/kho-hoa-chat-filter-bar";
import KhoHoaChatItemTable from "../components/kho-hoa-chat/kho-hoa-chat-item-table";
import KhoHoaChatDrawer from "../components/kho-hoa-chat/kho-hoa-chat-drawer";
import { useKhoHoaChatPage } from "../hooks/use-kho-hoa-chat-page";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_IDLE } from "../shared/ui/cssd-ui-chrome";
import { cssdSuCoChemicalHref } from "@/lib/cssd-routes";
import { countCanChuY, filterKhoRows, type KhoChip } from "@/lib/domain/cssd-kho-hoa-chat-rows";

type KhoTab = "KHO" | "DANH_MUC";
const TABS: ReadonlyArray<readonly [KhoTab, string]> = [
  ["KHO", "Kho"],
  ["DANH_MUC", "Danh mục"],
];

export default function KhoHoaChatKsnkPage() {
  const h = useKhoHoaChatPage();
  const [tab, setTab] = useState<KhoTab>(useSearchParams().get("tab") === "danh-muc" ? "DANH_MUC" : "KHO");
  const [chip, setChip] = useState<KhoChip>("ALL");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { canEdit, sheet } = h;
  const rows = useMemo(() => filterKhoRows(h.dmSummary, chip, search, h.choDuyetByDm), [h.dmSummary, chip, search, h.choDuyetByDm]);
  const openDm = openId ? h.dmSummary.find((d) => d.id === openId) : undefined;

  if (h.permLoading) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (!h.allowed.view) {
    return (
      <CSSDPageShell title="Kho hóa chất và vật tư">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Bạn không có quyền module Kho hóa chất — liên hệ quản trị (KSNK_KHO_HOACHAT).
        </div>
      </CSSDPageShell>
    );
  }

  return (
    <CSSDPageShell
      title={<span className="text-[var(--primary)]">Kho hóa chất và vật tư KSNK</span>}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <button type="button" className={CSSD_UI_ACTION_PRIMARY} onClick={() => h.openSheet("NHAP")}>
              + Nhập kho
            </button>
          ) : null}
          <Link href={cssdSuCoChemicalHref()} className="bv103-type-label font-semibold text-red-600 underline">
            Báo sự cố
          </Link>
        </div>
      }
    >
      <div className="space-y-[var(--bv103-space-3)]">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                if (key === "KHO") void h.reload();
              }}
              className={`bv103-type-label rounded-lg px-4 py-1.5 font-semibold ${tab === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "KHO" ? (
          <div className="space-y-[var(--bv103-space-3)]">
            <KhoHoaChatSuCoPanel rows={h.suCoRows} canEdit={canEdit} onXuatTuSuCo={h.openXuatTuSuCo} />
            <KhoHoaChatFilterBar
              chip={chip}
              onChip={setChip}
              search={search}
              onSearch={setSearch}
              canChuY={countCanChuY(h.dmSummary)}
              choDuyet={h.choDuyetByDm.size}
            />
            <KhoHoaChatItemTable
              rows={rows}
              loading={h.busy}
              canEdit={canEdit}
              choDuyetByDm={h.choDuyetByDm}
              onOpen={setOpenId}
              onMove={h.openSheet}
            />
          </div>
        ) : (
          <HoaChatMasterPage />
        )}
      </div>

      {openDm ? (
        <KhoHoaChatDrawer
          dm={openDm}
          lots={h.tons.filter((t) => t.dm_hoa_chat_id === openDm.id)}
          movs={h.movs.filter((m) => m.dm_hoa_chat_id === openDm.id)}
          suCo={h.suCoRows.filter((r) => r.dm_hoa_chat_id === openDm.id)}
          canEdit={canEdit}
          approve={h.approve}
          onXuatTuSuCo={(r) => {
            setOpenId(null);
            h.openXuatTuSuCo(r);
          }}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      <KhoHoaChatMoveSheet
        open={sheet.open}
        mode={sheet.mode}
        dmList={h.dms}
        tonLots={h.tons}
        canSubmit={sheet.canSubmit}
        onClose={sheet.onClose}
        onSubmit={sheet.onSubmit}
        dmId={sheet.dmId}
        onDmId={sheet.onDmId}
        lotKey={sheet.lotKey}
        onLotKey={sheet.onLotKey}
        qty={sheet.qty}
        onQty={sheet.onQty}
        note={sheet.note}
        onNote={sheet.onNote}
        maLoNhap={sheet.maLoNhap}
        onMaLoNhap={sheet.onMaLoNhap}
        hanNhap={sheet.hanNhap}
        onHanNhap={sheet.onHanNhap}
        linkedSuCoId={sheet.linkedSuCoId}
      />
    </CSSDPageShell>
  );
}
