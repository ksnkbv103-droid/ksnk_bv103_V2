"use client";

import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const VSTHistoryView = dynamic(
  () => import("@/modules/giam-sat-vst/views/VSTHistoryView"),
  { loading: () => <SupervisionPageSkeleton /> },
);

export default function LichSuVstClient() {
  return <VSTHistoryView />;
}
