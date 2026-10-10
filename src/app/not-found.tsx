import Link from "next/link";
import { Bv103EmptyState } from "@/components/shared/Bv103EmptyState";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-4">
      <Bv103EmptyState
        title="Không tìm thấy trang này."
        action={
          <Link href="/" className="text-sm font-medium text-primary underline underline-offset-2">
            Về trang chủ
          </Link>
        }
      />
    </div>
  );
}
