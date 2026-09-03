"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { labelChungChiKind, type ChungChiStatus } from "@/lib/dao-tao/chung-chi";
import { getChungChiCuaToi } from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoPanel } from "@/modules/dao-tao/components/DaoTaoChrome";

function tone(kind: ChungChiStatus["kind"]) {
  if (kind === "con_han") return "border-emerald-200 bg-emerald-50/80 text-emerald-950";
  if (kind === "sap_het_han") return "border-amber-200 bg-amber-50 text-amber-950";
  if (kind === "het_han") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function DaoTaoChungChiBanner() {
  const [status, setStatus] = useState<ChungChiStatus | null>(null);

  useEffect(() => {
    void getChungChiCuaToi()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <DaoTaoPanel className={`!p-3 ${tone(status.kind)}`}>
      <div className="flex items-start gap-2">
        <Award className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{labelChungChiKind(status.kind)}</p>
          {status.kind === "chua_co" ? (
            <p className="mt-0.5 text-[11px] opacity-80">
              Chứng chỉ ghi từ lần <strong>thi chính thức đạt</strong>.{" "}
              <Link href="/dao-tao/thi-that" className="font-semibold underline">
                Vào thi chính thức
              </Link>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] opacity-80">
              {status.kyTen ?? "Kỳ thi"}
              {status.datLuc ? ` · đạt ${formatDateTimeVi(status.datLuc)}` : ""}
              {status.hetHanLuc ? ` · hạn đến ${formatDateTimeVi(status.hetHanLuc)}` : ""}
              {status.kind !== "con_han" ? (
                <>
                  {" "}
                  <Link href="/dao-tao/thi-that" className="font-semibold underline">
                    Thi lại
                  </Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </DaoTaoPanel>
  );
}
