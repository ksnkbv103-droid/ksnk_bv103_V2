// src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx
"use client";

import React, { useState } from "react";
import { Loader2, AlertTriangle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HoaChatMasterPage from "@/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatMasterPage";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import KhoHoaChatMoveSheet from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import KhoHoaChatOverview from "../components/kho-hoa-chat/kho-hoa-chat-overview";
import KhoHoaChatTables from "../components/kho-hoa-chat/kho-hoa-chat-tables";
import KhoHoaChatTonSummary from "../components/kho-hoa-chat/kho-hoa-chat-ton-summary";
import KhoHoaChatSuCoPanel from "../components/kho-hoa-chat/kho-hoa-chat-su-co-panel";
import { useKhoHoaChatPage } from "../hooks/use-kho-hoa-chat-page";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY, CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_IDLE } from "../shared/ui/cssd-ui-chrome";
import { NEAR_EXPIRY_DAYS } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { cssdSuCoChemicalHref } from "@/lib/cssd-routes";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";
import { formatDateVi } from "@/lib/format-datetime-vi";

type KhoTab = "TON" | "NHAP_XUAT" | "DANH_MUC";
const TABS: ReadonlyArray<readonly [KhoTab, string]> = [
  ["TON", "Tồn kho"],
  ["NHAP_XUAT", "Nhập · Xuất"],
  ["DANH_MUC", "Danh mục"],
];
const LOAI_TABS = [
  ["ALL", "Tất cả"],
  ["HOA_CHAT", "Hóa chất"],
  ["VAT_TU", "Vật tư"],
] as const;

export default function KhoHoaChatKsnkPage() {
  const h = useKhoHoaChatPage();
  const [tab, setTab] = useState<KhoTab>(useSearchParams().get("tab") === "danh-muc" ? "DANH_MUC" : "TON");
  const { canEdit, sheet, duoiNguongItems, sapHetHanItems, totalByDm } = h;

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
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <button type="button" className={CSSD_UI_ACTION_PRIMARY} onClick={() => h.openSheet("NHAP")}>
                + Nhập
              </button>
              <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => h.openSheet("XUAT")}>
                Xuất
              </button>
              <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => h.openSheet("DIEU")}>
                Điều chỉnh
              </button>
            </>
          )}
          <Link
            href={cssdSuCoChemicalHref()}
            className="bv103-type-label flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 py-2 font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 active:scale-[0.98]"
          >
            ⚠️ Báo sự cố HC
          </Link>
        </div>
      }
    >
      <div className="space-y-[var(--bv103-space-3)]">
        {duoiNguongItems.length > 0 || sapHetHanItems.length > 0 ? (
          <KsnkContextBanner
            tone={duoiNguongItems.length > 0 ? "rose" : "amber"}
            dismissible={false}
            icon={
              duoiNguongItems.length > 0 ? (
                <AlertTriangle className="h-4 w-4" aria-hidden />
              ) : (
                <CalendarClock className="h-4 w-4" aria-hidden />
              )
            }
            summary={
              <span className="text-xs font-semibold">
                {[
                  duoiNguongItems.length > 0 ? `${duoiNguongItems.length} mặt hàng dưới ngưỡng` : null,
                  sapHetHanItems.length > 0
                    ? `${sapHetHanItems.length} lô cận hạn / quá hạn (≤${NEAR_EXPIRY_DAYS} ngày — FEFO)`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            }
            detail={
              <div className="space-y-2">
                {duoiNguongItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {duoiNguongItems.map((item) => {
                      const currentStock = totalByDm.get(item.id) || 0;
                      return (
                        <span
                          key={item.id}
                          className="inline-flex items-center rounded-lg border border-red-200/50 bg-red-100/80 px-2 py-0.5 text-[11px] font-semibold text-red-800"
                        >
                          {item.ma_hoa_chat}: {currentStock}/{item.nguong_ton_toi_thieu}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {sapHetHanItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sapHetHanItems.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center rounded-lg border border-amber-200/50 bg-amber-100/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                      >
                        Lô {item.ma_lo || "Không mã"}: {item.ton_so_luong} ({formatDateVi(item.han_su_dung)})
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            }
          />
        ) : null}

        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`bv103-type-label rounded-lg px-4 py-1.5 font-semibold ${tab === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== "DANH_MUC" ? (
          <div className="flex flex-wrap gap-2">
            {LOAI_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => h.setLoaiFilter(key)}
                className={`bv103-type-label rounded-lg px-3 py-1 font-semibold ${h.loaiFilter === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "TON" ? (
          <div className="space-y-[var(--bv103-space-3)] animate-in fade-in duration-300">
            <KhoHoaChatSuCoPanel rows={h.suCoRows} canEdit={canEdit} onXuatTuSuCo={h.openXuatTuSuCo} />
            <KhoHoaChatOverview
              countSapHetHan={h.countSapHetHan}
              countDuoiNguong={h.countDuoiNguong}
              dmCount={h.filteredDms.length}
            />
            <KhoHoaChatTonSummary rows={h.dmSummary} loading={h.busy} />
            <p className="bv103-type-label font-semibold text-slate-500">Chi tiết theo lô</p>
            <KhoHoaChatTables tons={h.filteredTons} movs={[]} loading={h.busy} todayYmd={h.todayYmd} section="ton" />
          </div>
        ) : null}

        {tab === "NHAP_XUAT" ? (
          <div className="animate-in fade-in duration-300">
            <KhoHoaChatTables tons={[]} movs={h.filteredMovs} loading={h.busy} todayYmd={h.todayYmd} section="mov" />
          </div>
        ) : null}

        {tab === "DANH_MUC" ? <HoaChatMasterPage /> : null}
      </div>

      <KhoHoaChatMoveSheet
        open={sheet.open}
        mode={sheet.mode}
        dmList={h.filteredDms}
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
