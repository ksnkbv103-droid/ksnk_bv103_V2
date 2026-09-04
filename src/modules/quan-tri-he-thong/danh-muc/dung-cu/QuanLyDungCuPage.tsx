"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Database, History } from "lucide-react";
import { BoDungCuPageContent } from "./BoDungCuPage";
import { SetReconcileApproveQueue } from "./SetReconcileApproveQueue";
import { SetReconcileHistoryList } from "./SetReconcileHistoryList";
import { DungCuLoaiSheet } from "./dung-cu-loai-sheet";
import { DmTabGuard } from "../views/dm-tab-guard";
import {
  parseDungCuLayer,
  parseDungCuLoaiSheet,
  quanTriDungCuHref,
  type DungCuLayer,
} from "@/lib/master-data/quan-tri-paths";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";

const dungCuTabBtn = (active: boolean) =>
  `${C.navTabBtn} px-5 text-[11px] font-medium ${
    active ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
  }`;

const LAYERS: { id: DungCuLayer; label: string; icon: typeof Database }[] = [
  { id: "bo", label: "Bộ", icon: Database },
  { id: "phieu", label: "Rà soát", icon: ClipboardList },
  { id: "lich-su", label: "Lịch sử", icon: History },
];

export default function QuanLyDungCuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [layer, setLayer] = useState<DungCuLayer>(() => parseDungCuLayer(searchParams.get("tab")));
  const loaiSheet = parseDungCuLoaiSheet(searchParams.get("tab"), searchParams.get("sheet"));

  useEffect(() => {
    const raw = searchParams.get("tab");
    setLayer(parseDungCuLayer(raw));
    if (raw === "chi-tiet" || raw === "bo") {
      router.replace(quanTriDungCuHref("bo"), { scroll: false });
    } else if (raw === "loai") {
      router.replace(quanTriDungCuHref("loai"), { scroll: false });
    }
  }, [searchParams, router]);

  const selectLayer = (next: DungCuLayer) => {
    setLayer(next);
    router.replace(quanTriDungCuHref(next), { scroll: false });
  };

  const { loading: permLoading, isAdmin, allowed: loaiAllowed } = useModulePermission("LOAI_DC");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const { allowed: leAllowed } = useModulePermission("DC_LE");

  useEffect(() => {
    if (permLoading) return;
    if (!isAdmin && layer === "phieu") {
      setLayer("bo");
      router.replace(quanTriDungCuHref("bo"), { scroll: false });
    }
  }, [permLoading, isAdmin, layer, router]);

  if (permLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!loaiAllowed.view && !boAllowed.view && !leAllowed.view) {
    return (
      <div className={`mx-auto max-w-xl ${C.panelSurface} p-10 text-center`}>
        <p className="text-sm font-semibold text-slate-500">Không có quyền truy cập</p>
        <p className="mt-2 text-xs font-medium text-slate-500">Cần quyền xem bộ dụng cụ hoặc thành phần bộ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <KsnkPageChrome
        showTitle={false}
        title="Quản lý dụng cụ"
        tabs={
          <div className={`${C.navTabStrip} w-full max-sm:rounded-xl sm:w-fit`} role="tablist" aria-label="Quản lý dụng cụ">
            {(isAdmin ? LAYERS : LAYERS.filter((t) => t.id !== "phieu")).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={layer === t.id}
                onClick={() => selectLayer(t.id)}
                className={dungCuTabBtn(layer === t.id)}
              >
                <t.icon size={14} aria-hidden /> {t.label}
              </button>
            ))}
          </div>
        }
        actions={
          layer === "phieu" ? (
            <Link href={cssdSuCoInstrumentHref({ type: "INSTRUMENT_SET_RECONCILE" })} className={C.btnPrimary}>
              Lập phiếu rà soát
            </Link>
          ) : null
        }
      />

      {isAdmin ? (
        <p className="text-[11px] text-slate-500">
          Duyệt đổi danh mục tại tab <span className="font-semibold text-slate-700">Rà soát</span>
          {" "}(phiếu chờ). Điều chuyển / lấy kho / trả kho ở sự cố CSSD — cửa <span className="font-semibold text-slate-700">Chuyển</span>.
        </p>
      ) : (
        <p className="text-[11px] text-slate-500">
          Chỉ quản trị sửa danh mục. Nhân viên lập phiếu rà soát tại sự cố CSSD (cửa Rà soát).
        </p>
      )}

      {layer === "bo" ? (
        boAllowed.view || leAllowed.view ? (
          <BoDungCuPageContent onOpenLoaiSheet={isAdmin ? () => router.replace(quanTriDungCuHref("loai"), { scroll: false }) : undefined} />
        ) : (
          <DmTabGuard moduleKey="BO_DC" label="bộ dụng cụ">
            <BoDungCuPageContent />
          </DmTabGuard>
        )
      ) : layer === "phieu" && isAdmin ? (
        <SetReconcileApproveQueue />
      ) : layer === "phieu" ? (
        <p className="px-1 py-6 text-center text-[11px] text-slate-500">Chỉ quản trị duyệt phiếu rà soát danh mục.</p>
      ) : (
        <SetReconcileHistoryList />
      )}

      {loaiSheet && isAdmin ? (
        <DungCuLoaiSheet onClose={() => router.replace(quanTriDungCuHref(layer), { scroll: false })} />
      ) : null}
    </div>
  );
}
