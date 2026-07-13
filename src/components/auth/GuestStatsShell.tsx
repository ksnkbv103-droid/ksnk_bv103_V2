"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GUEST_STATS_HOME_PATH } from "@/lib/auth/guest-stats-access";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export function GuestStatsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    if (pathname === "/thong-ke") {
      router.replace(GUEST_STATS_HOME_PATH);
    }
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 max-md:h-dvh max-md:max-h-dvh max-md:overflow-hidden">
      <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/logo-bv103.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Xem thống kê giám sát</p>
              <p className="truncate text-xs text-slate-500">Chế độ khách — chỉ xem, không chỉnh sửa dữ liệu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`inline-flex shrink-0 items-center gap-2 ${T.btnSecondary}`}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Đăng xuất
          </button>
        </div>
      </header>
      <main
        data-bv103-app-scroll
        className="mx-auto w-full max-w-7xl flex-1 min-h-0 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:py-6 max-md:overflow-y-auto max-md:overscroll-y-contain max-md:bv103-scroll-y max-md:custom-scrollbar"
      >
        {children}
      </main>
    </div>
  );
}
