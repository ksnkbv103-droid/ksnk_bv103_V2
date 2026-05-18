"use client";

import { AlertTriangle, ArrowRightLeft, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { appendChiTietIssueNoteAction } from "@/modules/quan-tri-he-thong/danh-muc/actions/bo-dung-cu-chi-tiet-read.actions";
import type { CSSDChiTiet } from "../types/catalog.types";
import type { DungCuChiTietTableRow } from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-shared";
import { cssdChiTietToModalRow } from "./cssd-catalog-page-helpers";

export function CSSDCatalogQuickActions(props: {
  selectedBoId: string | null;
  selectedChiTiet: CSSDChiTiet | null;
  setEditing: (row: DungCuChiTietTableRow | null) => void;
  setModalOpen: (open: boolean) => void;
  reload: () => Promise<void>;
}) {
  const { selectedBoId, selectedChiTiet, setEditing, setModalOpen, reload } = props;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-600">Tác vụ nhanh</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!selectedBoId}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <PackagePlus className="h-3.5 w-3.5" /> Bổ sung dụng cụ vào bộ đang chọn
        </button>
        <button
          type="button"
          disabled={!selectedChiTiet}
          onClick={() => {
            if (!selectedChiTiet) return;
            setEditing(cssdChiTietToModalRow(selectedChiTiet));
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" /> Điều chuyển / chỉnh chi tiết đã chọn
        </button>
        <button
          type="button"
          disabled={!selectedChiTiet}
          onClick={async () => {
            if (!selectedChiTiet) return;
            const note = window.prompt("Mô tả hỏng (tùy chọn):", "") || "";
            const r = await appendChiTietIssueNoteAction({ chiTietId: selectedChiTiet.id, issueType: "HONG", note });
            if (!r.success) return toast.error(r.error || "Không ghi nhận được báo hỏng.");
            toast.success("Đã ghi nhận báo hỏng.");
            void reload();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Báo hỏng
        </button>
        <button
          type="button"
          disabled={!selectedChiTiet}
          onClick={async () => {
            if (!selectedChiTiet) return;
            const note = window.prompt("Mô tả mất / thất lạc (tùy chọn):", "") || "";
            const r = await appendChiTietIssueNoteAction({ chiTietId: selectedChiTiet.id, issueType: "MAT", note });
            if (!r.success) return toast.error(r.error || "Không ghi nhận được báo mất.");
            toast.success("Đã ghi nhận báo mất.");
            void reload();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold uppercase text-rose-800 hover:bg-rose-100 disabled:opacity-50"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Báo mất
        </button>
      </div>
    </section>
  );
}
