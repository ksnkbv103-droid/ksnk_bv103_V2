"use client";

import React, { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { getIncidentForPrint } from "../actions/su-co-report.actions";
import IncidentPrintView, { type IncidentPrintViewProps } from "./IncidentPrintView";

type Props = {
  incidentId: string;
  className?: string;
};

export default function IncidentJournalPrintButton({ incidentId, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [printBundle, setPrintBundle] = useState<IncidentPrintViewProps | null>(null);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const res = await getIncidentForPrint(incidentId);
      if (!res.success) {
        toast.error("Không tải được biên bản in.");
        return;
      }
      setPrintBundle({
        incident: res.incident as IncidentPrintViewProps["incident"],
        details: res.details as IncidentPrintViewProps["details"],
      });
      setTimeout(() => window.print(), 150);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không in được biên bản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        disabled={loading}
        className={
          className ??
          "inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        }
        aria-label="In biên bản sự cố"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        In
      </button>
      {printBundle ? (
        <div className="hidden print:block">
          <IncidentPrintView incident={printBundle.incident} details={printBundle.details} />
        </div>
      ) : null}
    </>
  );
}
