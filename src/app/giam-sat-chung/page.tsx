// src/app/giam-sat-chung/page.tsx
import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Giám sát tuân thủ KSNK | KSNK 103",
  description: "Hệ thống bảng kiểm giám sát tuân thủ Kiểm soát nhiễm khuẩn",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Giữ filter deep-link (tu_ngay, den_ngay, khoa_ids, …) khi chuyển tab → /thong-ke|/lich-su. */
function redirectWithQuery(base: string, params: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "tab") continue;
    const val = pickParam(raw);
    if (val) q.set(key, val);
  }
  const qs = q.toString();
  redirect(qs ? `${base}?${qs}` : base);
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (pickParam(params.tab) === "history") redirectWithQuery("/lich-su/gsc", params);
  if (pickParam(params.tab) === "analytics") redirectWithQuery("/thong-ke/gsc", params);
  const editId = pickParam(params.edit);
  const locPrefill = parseGscLocPrefill({
    loc: pickParam(params.loc),
    ma: pickParam(params.ma),
    edit: editId,
  });

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView editSessionId={editId} locPrefill={locPrefill} />
    </Suspense>
  );
}
