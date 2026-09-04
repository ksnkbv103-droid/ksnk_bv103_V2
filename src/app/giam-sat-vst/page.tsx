import { Suspense } from "react";
import VSTFormView from "@/modules/giam-sat-vst/views/VSTFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { pickSearchParam, redirectWithQuery } from "@/lib/nav/redirect-with-query";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GiamSatVstPage({ searchParams }: Props) {
  const params = await searchParams;
  if (pickSearchParam(params.tab) === "history") redirectWithQuery("/lich-su/vst", params);
  if (pickSearchParam(params.tab) === "analytics") redirectWithQuery("/thong-ke/vst", params);
  const editId = pickSearchParam(params.edit);

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTFormView editSessionId={editId} />
    </Suspense>
  );
}
