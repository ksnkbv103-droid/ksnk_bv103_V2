// src/app/giam-sat-chung/page.tsx
import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { pickSearchParam, redirectWithQuery } from "@/lib/nav/redirect-with-query";

export const metadata = {
  title: "Giám sát tuân thủ",
  description: "Mở phiên giám sát chung (sửa phiếu) hoặc chuyển sang cửa tuân thủ.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (pickSearchParam(params.tab) === "history") redirectWithQuery("/lich-su/gsc", params);
  if (pickSearchParam(params.tab) === "analytics") redirectWithQuery("/thong-ke/gsc", params);

  const editId = pickSearchParam(params.edit);
  // Không có edit → cửa ghi = tuân thủ (R5); giữ loc/ma/bk…
  if (!editId) redirectWithQuery("/giam-sat-chung/tuan-thu", params);

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
