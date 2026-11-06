"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const ChatThaiDoVaiPage = dynamic(
  () => import("@/modules/chat-thai-do-vai/views/ChatThaiDoVaiPage"),
  { ssr: false, loading: () => <SupervisionPageSkeleton /> }
);

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <ChatThaiDoVaiPage />
    </Suspense>
  );
}
