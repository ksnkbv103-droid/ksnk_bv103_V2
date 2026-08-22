"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { fetchNkbvCasesLinkedToCssd } from "@/modules/giam-sat-nkbv/actions/nkbv-cssd-rca.actions";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";
import { formatDateVi } from "@/lib/format-datetime-vi";

type Props = {
  loTietKhuanId?: string | null;
};

/** Chiều ngược trên mẻ TK: ca SSI/NKBV đã gắn mẻ này. */
export default function MeTkNkbvLinkBanner({ loTietKhuanId }: Props) {
  const [cases, setCases] = useState<
    Array<{ id: string; maCa: string | null; hoTen: string | null; ngayPhatHien: string | null }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = String(loTietKhuanId || "").trim();
    if (!id) {
      setCases([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void fetchNkbvCasesLinkedToCssd({ loTietKhuanId: id }).then((res) => {
      if (cancelled) return;
      setCases(res.success ? res.cases : []);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loTietKhuanId]);

  if (!loTietKhuanId || !loaded || cases.length === 0) return null;

  return (
    <KsnkContextBanner
      tone="sky"
      dismissible={false}
      icon={<Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />}
      summary={<span className="font-semibold">Ca NKBV / SSI gắn mẻ này</span>}
      detail={
        <ul className="mt-1 space-y-1">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/giam-sat-nkbv?case=${c.id}`} className="font-semibold underline decoration-dotted">
                {c.maCa || c.id.slice(0, 8)}
              </Link>
              {c.hoTen ? ` — ${c.hoTen}` : ""}
              {c.ngayPhatHien ? ` · ${formatDateVi(c.ngayPhatHien)}` : ""}
            </li>
          ))}
        </ul>
      }
    />
  );
}
