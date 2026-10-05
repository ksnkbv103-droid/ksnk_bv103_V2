"use client";

import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const GscHistoryView = dynamic(
  () => import("@/modules/giam-sat-chung/views/GscHistoryView"),
  { loading: () => <SupervisionPageSkeleton /> },
);

export default function LichSuGscClient() {
  return <GscHistoryView />;
}
