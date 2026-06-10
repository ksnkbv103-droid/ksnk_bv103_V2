import { Suspense } from "react";
import { redirect } from "next/navigation";
import VSTFormView from "@/modules/giam-sat-vst/views/VSTFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

type Props = {
  searchParams: Promise<{ edit?: string; tab?: string }>;
};

export default async function GiamSatVstPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.tab === "history") redirect("/lich-su/vst");
  if (params.tab === "analytics") redirect("/thong-ke/vst");
  const editId = params.edit || null;

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTFormView editSessionId={editId} />
    </Suspense>
  );
}
