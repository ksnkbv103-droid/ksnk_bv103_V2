import { Suspense } from "react";
import { redirect } from "next/navigation";
import VSTFormView from "@/modules/giam-sat-vst/views/VSTFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

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

export default async function GiamSatVstPage({ searchParams }: Props) {
  const params = await searchParams;
  if (pickParam(params.tab) === "history") redirectWithQuery("/lich-su/vst", params);
  if (pickParam(params.tab) === "analytics") redirectWithQuery("/thong-ke/vst", params);
  const editId = pickParam(params.edit);

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTFormView editSessionId={editId} />
    </Suspense>
  );
}
