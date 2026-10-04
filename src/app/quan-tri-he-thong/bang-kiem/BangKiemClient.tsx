"use client";

import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const BangKiemView = dynamic(
  () => import("@/modules/quan-tri-he-thong/bang-kiem/views/BangKiemView"),
  { loading: () => <SupervisionPageSkeleton /> },
);

export default function BangKiemClient() {
  return <BangKiemView />;
}
