// src/components/shared/ClientLayoutWrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import KsnkPageShell from "./KsnkPageShell";
import { pathnameUsesPhase1KsnkUnifiedContentShell } from "@/lib/app-shell-scope";
import { supabase } from "@/lib/supabase";
import StaffSessionGate from "@/components/auth/StaffSessionGate";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const hasSession = Boolean(data.session);
      if (!mounted) return;
      if (!hasSession && !isLoginPage) {
        router.replace("/login");
      } else if (hasSession && isLoginPage) {
        router.replace("/");
      }
      setCheckingAuth(false);
    };
    checkAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session && !isLoginPage) router.replace("/login");
      if (session && isLoginPage) router.replace("/");
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  if (checkingAuth && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 touch-manipulation pointer-events-auto">
      <StaffSessionGate />
      {/* Sidebar quản lý z-index nội bộ */}
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={toggleSidebar} />
        <main className="relative z-0 flex-1 touch-manipulation p-4 md:p-8 pointer-events-auto">
          {pathnameUsesPhase1KsnkUnifiedContentShell(pathname) ? (
            <KsnkPageShell rolloutPhase="phase-1">{children}</KsnkPageShell>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Overlay di động - z-index 9999 cực cao */}
      {isOpen && (
        <div 
          onClick={closeSidebar}
          className="md:hidden fixed inset-0 bg-black/50 z-[9999] cursor-pointer pointer-events-auto touch-manipulation"
        />
      )}
    </div>
  );
}
