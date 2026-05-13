"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkStaffSessionAllowed } from "@/modules/auth/actions/staff-session.actions";
import { syncAccountLinkAction } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-link-governance.actions";
import { toast } from "sonner";

const STAFF_GATE_AUTH_CHECK_TTL_MS = 60_000;
const STAFF_GATE_LINK_SYNC_TTL_MS = 5 * 60_000;

function isPublicAuthPath(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  return pathname.startsWith("/login/");
}

function shouldRunGateTask(key: string, ttlMs: number) {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const last = Number(window.sessionStorage.getItem(key) || "0");
  if (Number.isFinite(last) && now - last < ttlMs) return false;
  window.sessionStorage.setItem(key, String(now));
  return true;
}

/** Tránh tranh băng thông với tải dashboard lần đầu — chạy sau idle hoặc trễ nhẹ. */
function scheduleNonUrgent(fn: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: 4000 });
    return;
  }
  setTimeout(fn, 300);
}

/** Đăng xuất nếu hồ sơ nhân sự bị vô hiệu hóa; Tự động liên kết tài khoản nếu cần. */
export default function StaffSessionGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPublicAuthPath(pathname)) return;

    let cancelled = false;
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;

      // 1. Kiểm tra trạng thái hoạt động (bắt buộc)
      const shouldCheck = shouldRunGateTask("staff_gate_auth_check_at", STAFF_GATE_AUTH_CHECK_TTL_MS);
      if (shouldCheck) {
        const res = await checkStaffSessionAllowed();
        if (cancelled) return;
        if (!res.ok && "reason" in res && res.reason === "inactive") {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          router.refresh();
          return;
        }
      }

      // 2. Tự động liên kết tài khoản (ngầm) — hoãn để không chặn tải trang chính
      const shouldSync = shouldRunGateTask("staff_gate_link_sync_at", STAFF_GATE_LINK_SYNC_TTL_MS);
      if (shouldSync) {
        scheduleNonUrgent(() => {
          void (async () => {
            const linkRes = await syncAccountLinkAction();
            if (cancelled) return;
            if (linkRes.success && "autoLinked" in linkRes && linkRes.autoLinked) {
              toast.success(`Hệ thống đã tự động liên kết tài khoản với hồ sơ: ${linkRes.nhanSuId}`, {
                description: "Việc liên kết giúp ghi nhận chính xác người thực hiện công việc.",
                duration: 5000,
              });
            }
          })();
        });
      }
    };

    void run();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!session || isPublicAuthPath(pathname)) return;
      void (async () => {
        const res = await checkStaffSessionAllowed();
        if (!res.ok && "reason" in res && res.reason === "inactive") {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          router.refresh();
        }
        scheduleNonUrgent(() => {
          void syncAccountLinkAction();
        });
      })();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
