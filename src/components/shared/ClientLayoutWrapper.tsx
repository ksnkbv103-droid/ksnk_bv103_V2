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
import Bv103UxHintsBanner from "@/components/shared/Bv103UxHintsBanner";
import SupervisionOfflineSyncListener from "@/components/shared/SupervisionOfflineSyncListener";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  useEffect(() => {
    let mounted = true;
    
    // Đăng ký listener để redirect khi đăng xuất
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

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 touch-manipulation pointer-events-auto">
      <StaffSessionGate />
      <SupervisionOfflineSyncListener />
      {/* Sidebar quản lý z-index nội bộ */}
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />
      
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <Header onMenuClick={toggleSidebar} />
        <Bv103UxHintsBanner />
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
