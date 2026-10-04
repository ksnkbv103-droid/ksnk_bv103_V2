// src/modules/cssd-erp/components/waiting-list/WaitingList.tsx
"use client";

import React, { useState } from "react";
import { Clock, User, Phone, ArrowRight, List, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { CSSDWaitingItem, type Station } from "../../types/cssd.types";
import SetMembersModal from "../inventory/SetMembersModal";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY, CSSD_UI_PANEL } from "../../shared/ui/cssd-ui-chrome";
import { formatDateTimeVi, formatTimeVi } from "@/lib/format-datetime-vi";
import { Bv103EmptyState } from "@/components/shared/Bv103EmptyState";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { STATION_LABEL, WORKFLOW_STEPS } from "../../workflow/domain/cssd-stations";

const ACTION_VERBS: Record<string, string> = Object.fromEntries(
  WORKFLOW_STEPS.map((s) => [s, `${STATION_LABEL[s]} bởi`]),
);

interface Props {
  items: CSSDWaitingItem[];
  onAction: (maQR: string) => void;
  /** Optional empty CTA; default focuses station QR entry. */
  emptyAction?: React.ReactNode;
  /** CSSD-07: chỉ hiện «Trả về Làm sạch» tại Kiểm bộ. */
  currentStation?: Station | null;
  onRejectToLamSach?: (maQR: string, lyDo: string) => Promise<void>;
}

export default function WaitingList({
  items,
  onAction,
  emptyAction,
  currentStation,
  onRejectToLamSach,
}: Props) {
  const [detailSet, setDetailSet] = useState<{ bo_dung_cu_id: string; ten_bo?: string | null } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const showReject = currentStation === "QC" && typeof onRejectToLamSach === "function";

  const handleReject = async (maQR: string) => {
    const lyDo = window.prompt("Lý do trả về Làm sạch (bắt buộc):");
    if (lyDo == null) return;
    if (!String(lyDo).trim()) {
      toast.error("Cần nhập lý do trả về Làm sạch.");
      return;
    }
    setRejecting(maQR);
    try {
      await onRejectToLamSach?.(maQR, String(lyDo).trim());
      toast.success("Đã trả bộ về Làm sạch.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không trả được về Làm sạch.");
    } finally {
      setRejecting(null);
    }
  };

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <h2 className="bv103-type-label flex items-center gap-2 px-1">
        <Clock size={14} className="text-[var(--primary)]" /> Đang chờ xử lý ({items.length})
      </h2>
      <div className={`${CSSD_UI_PANEL} overflow-hidden divide-y divide-slate-100 max-h-[440px] overflow-y-auto custom-scrollbar`}>
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-base font-semibold text-slate-800 leading-snug truncate">
                  {item.ten_bo || "Chưa gán bộ"}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 shadow-sm">
                    Mã bộ: {item.ma_vach_qr}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="-mt-0.5 text-slate-400" />
                    {formatTimeVi(item.updated_at)}
                  </span>
                </div>

                {item.nguoi_tram_truoc && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2 text-[11px] text-blue-800">
                      <span className="flex items-center gap-1.5 font-bold">
                        <User size={12} className="shrink-0 text-blue-600" />
                        {ACTION_VERBS[item.tram_truoc || ""] || "Được xử lý bởi"}:{" "}
                        <span className="font-semibold text-blue-900">{item.nguoi_tram_truoc}</span>
                      </span>

                      {item.sdt_tram_truoc && (
                        <>
                          <span className="text-blue-300">·</span>
                          <a
                            href={`tel:${item.sdt_tram_truoc}`}
                            className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 underline decoration-dotted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={10} className="shrink-0" />
                            {item.sdt_tram_truoc}
                          </a>
                        </>
                      )}

                      {item.thoi_gian_tram_truoc && (
                        <>
                          <span className="text-blue-300">|</span>
                          <span className="font-semibold text-blue-700 flex items-center gap-1">
                            <Clock size={11} className="shrink-0" />
                            Đến lúc {formatDateTimeVi(item.thoi_gian_tram_truoc)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2 self-center sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={!item.bo_dung_cu_id}
                  onClick={() =>
                    item.bo_dung_cu_id
                      ? setDetailSet({ bo_dung_cu_id: item.bo_dung_cu_id, ten_bo: item.ten_bo })
                      : undefined
                  }
                  className={CSSD_UI_ACTION_SECONDARY}
                >
                  <List size={14} aria-hidden />
                  Chi tiết
                </button>
                {showReject ? (
                  <button
                    type="button"
                    disabled={rejecting === item.ma_vach_qr}
                    onClick={() => void handleReject(item.ma_vach_qr)}
                    className={CSSD_UI_ACTION_SECONDARY}
                  >
                    <Undo2 size={14} aria-hidden />
                    Trả về Làm sạch
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onAction(item.ma_vach_qr)}
                  className={CSSD_UI_ACTION_PRIMARY}
                >
                  <ArrowRight size={14} aria-hidden />
                  Xử lý
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="p-4">
            <Bv103EmptyState
              title="Không có bộ chờ xử lý tại trạm này."
              action={
                emptyAction ?? (
                  <button
                    type="button"
                    className={bv103LayoutChrome.btnPrimary}
                    onClick={() => {
                      document.getElementById("cssd-workflow-station-qr")?.focus();
                    }}
                  >
                    Quét QR để xử lý
                  </button>
                )
              }
            />
          </div>
        )}
      </div>

      <SetMembersModal
        isOpen={detailSet !== null}
        onClose={() => setDetailSet(null)}
        set={detailSet ? { bo_dung_cu_id: detailSet.bo_dung_cu_id, ten_bo: detailSet.ten_bo } : null}
      />
    </div>
  );
}
