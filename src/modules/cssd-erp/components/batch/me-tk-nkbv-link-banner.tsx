"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { fetchNkbvCasesLinkedToCssd } from "@/modules/giam-sat-nkbv/actions/nkbv-cssd-rca.actions";

type Props = {
  loTietKhuanId?: string | null;
};

/** Chiều ngược trên mẻ TK: ca SSI/NKBV đã gắn mẻ này. */
export default function MeTkNkbvLinkBanner({ loTietKhuanId }: Props) {
  const [cases, setCases] = useState<
    Array<{ id: string; maCa: string | null; hoTen: string | null; ngayPhatHien: string | null }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = String(loTietKhuanId || "").trim();
    if (!id) {
      setCases([]);
      setLoaded(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void fetchNkbvCasesLinkedToCssd({ loTietKhuanId: id }).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setCases([]);
      } else {
        setError(null);
        setCases(res.cases);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loTietKhuanId]);

  if (!loTietKhuanId || !loaded) return null;

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950" role="status">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Activity size={14} aria-hidden />
        Ca NKBV / SSI gắn mẻ này
      </p>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {!error && cases.length === 0 ? (
        <p className="mt-2 text-xs font-medium text-sky-900/80 leading-relaxed">
          Chưa có ca SSI liên kết. Khi KSNK gắn mã QR chu trình trên checklist SSI, ca sẽ hiện tại đây để mở nhanh
          giám sát NKBV.
        </p>
      ) : null}
      {cases.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs font-medium">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/giam-sat-nkbv?case=${c.id}`} className="underline decoration-dotted font-semibold">
                {c.maCa || c.id.slice(0, 8)}
              </Link>
              {c.hoTen ? ` — ${c.hoTen}` : ""}
              {c.ngayPhatHien ? ` · ${new Date(c.ngayPhatHien).toLocaleDateString("vi-VN")}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
