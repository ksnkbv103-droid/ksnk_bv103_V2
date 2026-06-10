// src/components/shared/Header.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getKsnkAppHeaderBreadcrumb } from "@/lib/app-shell-scope";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumb = getKsnkAppHeaderBreadcrumb(pathname);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserEmail(data.session?.user.email ?? null);
      setSessionResolved(true);
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setSessionResolved(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        toast.error("Không đăng xuất được: " + error.message);
        return;
      }
    } catch (e) {
      console.warn("[Header] signOut", e);
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 flex min-h-[4.25rem] items-center justify-between gap-3 border-b border-slate-200/90 bg-[var(--bg-panel)] px-4 py-2 shadow-[var(--shadow-app-header)] md:gap-6 md:px-8">
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMenuClick?.();
            }}
            className="app-shell-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] md:hidden touch-manipulation"
            aria-label="Mở menu điều hướng"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav aria-label="Ngữ cảnh trang" className="min-w-0 flex-1">
            <p className={T.shellZone}>{breadcrumb.zone}</p>
            {breadcrumb.page ? <p className={T.shellPage}>{breadcrumb.page}</p> : null}
          </nav>
        </div>
        {/*
          Slot tìm kiếm theo trang: AdvancedDataTable (searchPlacement="header") portal vào đây từ lg trở lên.
          Trang con tự quyết nội dung tìm — không dùng ô “chung” không nối dữ liệu.
        */}
        <div
          id="bv103-header-toolbar-slot"
          className="hidden min-h-[var(--bv103-control-h)] min-w-0 flex-1 basis-0 justify-end lg:flex lg:max-w-[min(100%,48rem)] lg:items-center"
          aria-live="polite"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {sessionResolved && userEmail ? (
          <>
            <p
              className="hidden max-w-[10rem] truncate text-right text-xs font-medium text-slate-600 sm:block md:max-w-[16rem]"
              title={userEmail}
            >
              {userEmail}
            </p>
            <Link
              href="/tai-khoan/doi-mat-khau"
              prefetch={false}
              className="app-shell-focus hidden shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex sm:px-4 sm:text-sm touch-manipulation bv103-control-h"
            >
              Đổi mật khẩu
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="app-shell-focus shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-slate-50 sm:px-4 sm:text-sm touch-manipulation bv103-control-h"
            >
              Đăng xuất
            </button>
          </>
        ) : null}
        {sessionResolved && !userEmail ? (
          <Link
            href="/login"
            prefetch={false}
            className="app-shell-focus inline-flex shrink-0 items-center rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] sm:text-sm touch-manipulation bv103-control-h"
          >
            Đăng nhập
          </Link>
        ) : null}
      </div>
    </header>
  );
}
