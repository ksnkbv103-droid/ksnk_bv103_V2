// src/app/giam-sat-chung/page.tsx
import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { pickSearchParam, redirectWithQuery } from "@/lib/nav/redirect-with-query";

export const metadata = {
  title: "Form giám sát chung | KSNK 103",
  description:
    "Form gốc — mọi loại bảng kiểm. Hub Giám sát mở mẫu tuân thủ tại /giam-sat-chung/tuan-thu.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (pickSearchParam(params.tab) === "history") redirectWithQuery("/lich-su/gsc", params);
  if (pickSearchParam(params.tab) === "analytics") redirectWithQuery("/thong-ke/gsc", params);
  const editId = pickSearchParam(params.edit);
  const locPrefill = parseGscLocPrefill({
    loc: pickSearchParam(params.loc),
    ma: pickSearchParam(params.ma),
    edit: editId,
  });

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView editSessionId={editId} locPrefill={locPrefill} />
    </Suspense>
  );
}
