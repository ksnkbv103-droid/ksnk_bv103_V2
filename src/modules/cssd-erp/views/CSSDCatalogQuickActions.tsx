"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { reportChiTietInstrumentIssueAction } from "@/lib/master-data/append-chi-tiet-issue-note.action";
import type { CSSDChiTiet } from "../types/catalog.types";
import CssdDieuChuyenQrModal from "../components/catalog/CssdDieuChuyenQrModal";

const MDM_DUNG_CU_HREF = "/quan-tri-he-thong/danh-muc/dung-cu";

export function CSSDCatalogQuickActions(props: {
  selectedBoId: string | null;
  selectedChiTiet: CSSDChiTiet | null;
  reload: () => Promise<void>;
}) {
  const { selectedBoId, selectedChiTiet, reload } = props;
  const [dieuChuyenOpen, setDieuChuyenOpen] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-600">Tác vụ vận hành</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={MDM_DUNG_CU_HREF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Sửa danh mục (Quản trị)
          </Link>
          <button
            type="button"
            onClick={() => setDieuChuyenOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold uppercase text-emerald-900 hover:bg-emerald-100"
          >
            <QrCode className="h-3.5 w-3.5" /> Điều chuyển cấu phần (2 QR)
          </button>
          <button
            type="button"
            disabled={!selectedChiTiet}
            onClick={async () => {
              if (!selectedChiTiet) return;
              const note = window.prompt("Mô tả hỏng (tùy chọn):", "") || "";
              const r = await reportChiTietInstrumentIssueAction({ chiTietId: selectedChiTiet.id, issueType: "HONG", note });
              if (!r.success) return toast.error(r.error || "Không ghi nhận được báo hỏng.");
              toast.success("Đã ghi nhận báo hỏng (ghi chú + sổ giao dịch).");
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
              const r = await reportChiTietInstrumentIssueAction({ chiTietId: selectedChiTiet.id, issueType: "MAT", note });
              if (!r.success) return toast.error(r.error || "Không ghi nhận được báo mất.");
              toast.success("Đã ghi nhận báo mất (ghi chú + sổ giao dịch).");
              void reload();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold uppercase text-rose-800 hover:bg-rose-100 disabled:opacity-50"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Báo mất
          </button>
        </div>
        {!selectedBoId && !selectedChiTiet ? (
          <p className="mt-2 text-[10px] text-slate-500">Chọn bộ hoặc chi tiết để báo hỏng/mất.</p>
        ) : null}
      </section>

      <CssdDieuChuyenQrModal
        open={dieuChuyenOpen}
        onClose={() => setDieuChuyenOpen(false)}
        suggestedTenDungCu={selectedChiTiet?.ten_chi_tiet}
        onSuccess={() => void reload()}
      />
    </>
  );
}
