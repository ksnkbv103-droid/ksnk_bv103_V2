// src/components/shared/Header.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getKsnkAppHeaderTitle } from "@/lib/app-shell-scope";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Không đăng xuất được: " + error.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 flex h-[4.25rem] items-center justify-between border-b border-slate-200/90 bg-[var(--bg-panel)] px-4 shadow-[var(--shadow-app-header)] md:px-8">
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMenuClick?.();
          }}
          className="app-shell-focus flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] md:hidden touch-manipulation"
          aria-label="Mở menu điều hướng"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight text-slate-900 md:text-lg">
            {getKsnkAppHeaderTitle(pathname)}
          </h1>
          <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
            Chuyên nghiệp - An toàn - Hiệu quả - Hợp tác.
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
              className="app-shell-focus hidden shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex sm:px-4 sm:text-sm touch-manipulation"
            >
              Đổi mật khẩu
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="app-shell-focus shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-slate-50 sm:px-4 sm:text-sm touch-manipulation"
            >
              Đăng xuất
            </button>
          </>
        ) : null}
        {sessionResolved && !userEmail ? (
          <Link
            href="/login"
            className="app-shell-focus inline-flex min-h-10 shrink-0 items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] sm:text-sm touch-manipulation"
          >
            Đăng nhập
          </Link>
        ) : null}
      </div>
    </header>
  );
}
