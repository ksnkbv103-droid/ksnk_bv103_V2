// src/components/shared/Header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getKsnkAppHeaderBreadcrumb } from "@/lib/app-shell-scope";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumb = getKsnkAppHeaderBreadcrumb(pathname, { bk: searchParams.get("bk") });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
    <header className="sticky top-0 z-50 flex shrink-0 min-h-11 items-center justify-between gap-2 bg-[var(--bg-panel)] px-2 py-1 pt-[max(0.25rem,env(safe-area-inset-top))] shadow-[var(--shadow-app-header)] sm:min-h-12 sm:gap-2 sm:px-3 sm:py-1.5 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMenuClick?.();
            }}
            className="app-shell-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-hover)] md:hidden touch-manipulation"
            aria-label="Mở menu điều hướng"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav aria-label="Ngữ cảnh trang" className="flex min-w-0 flex-1 items-center">
            <h1 className={T.shellPage}>{breadcrumb.page ?? breadcrumb.zone}</h1>
          </nav>
        </div>
        {/*
          Slot tìm kiếm theo trang: AdvancedDataTable (searchPlacement="header") portal vào đây từ lg trở lên.
          Trang con tự quyết nội dung tìm — không dùng ô “chung” không nối dữ liệu.
        */}
        <div
          id="bv103-header-toolbar-slot"
          className="hidden min-w-0 justify-end empty:hidden lg:flex lg:max-w-md lg:items-center"
          aria-live="polite"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {sessionResolved && userEmail ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menu tài khoản"
              title={userEmail}
              className="app-shell-focus flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold uppercase text-white transition-colors hover:bg-[var(--primary-hover)] touch-manipulation"
            >
              {userEmail.charAt(0)}
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-md"
              >
                <p className="truncate px-4 py-2 text-xs text-[var(--text-secondary)]" title={userEmail}>
                  {userEmail}
                </p>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  role="menuitem"
                  href="/tai-khoan/doi-mat-khau"
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className="app-shell-focus flex min-h-10 items-center px-4 text-sm text-slate-700 hover:bg-slate-50 touch-manipulation"
                >
                  Đổi mật khẩu
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleSignOut}
                  className="app-shell-focus flex min-h-10 w-full items-center px-4 text-left text-sm text-slate-700 hover:bg-slate-50 touch-manipulation"
                >
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {sessionResolved && !userEmail ? (
          <Link
            href="/login"
            prefetch={false}
            className="app-shell-focus inline-flex shrink-0 items-center rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] sm:text-sm touch-manipulation bv103-control-h"
          >
            Đăng nhập
          </Link>
        ) : null}
      </div>
    </header>
  );
}
