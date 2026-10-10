"use client";

import { useEffect } from "react";
import { Bv103EmptyState } from "@/components/shared/Bv103EmptyState";
import { Button } from "@/components/ui/button";

/** Lỗi không bắt được trong một trang: giữ khung ứng dụng, báo một câu + nút thử lại. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error({ module: "app", action: "route-error", digest: error.digest, error: error.message });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-4">
      <Bv103EmptyState
        title="Trang gặp lỗi khi tải. Anh/chị thử tải lại; nếu vẫn lỗi, báo quản trị hệ thống."
        action={
          <Button type="button" onClick={() => reset()}>
            Tải lại trang
          </Button>
        }
      />
    </div>
  );
}
