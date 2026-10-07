"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  STAFF_GATE_LINK_SYNC_TTL_MS,
  clearStaffGateAuthCheckAt,
  decideStaffGateAction,
  shouldRunGateTask,
} from "@/lib/auth/staff-session-gate";
import { checkStaffSessionAllowed } from "@/modules/auth/actions/staff-session.actions";
import { syncAccountLinkAction } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-link-governance.actions";
import { toast } from "sonner";

const CHANGE_PASSWORD_PATH = "/tai-khoan/doi-mat-khau";

function isPublicAuthPath(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  return pathname.startsWith("/login/");
}

/** Tránh tranh băng thông với tải dashboard lần đầu — chạy sau idle hoặc trễ nhẹ. */
function scheduleNonUrgent(fn: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: 4000 });
    return;
  }
  setTimeout(fn, 300);
}

function mustChangePassword(meta: Record<string, unknown> | undefined): boolean {
  return meta?.must_change_password === true;
}

/** Đăng xuất nếu hồ sơ vô hiệu; chặn khi kiểm lỗi; tự liên kết tài khoản nếu cần. */
export default function StaffSessionGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [checkFailedBlock, setCheckFailedBlock] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isPublicAuthPath(pathname)) return;

    let cancelled = false;

    const applyCheckResult = async (res: Awaited<ReturnType<typeof checkStaffSessionAllowed>>) => {
      const decision = decideStaffGateAction(res);
      if (decision.action === "sign_out_inactive") {
        setCheckFailedBlock(false);
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login?inactive=1");
        router.refresh();
        return "stop" as const;
      }
      if (decision.action === "block_check_failed") {
        clearStaffGateAuthCheckAt();
        setCheckFailedBlock(true);
        return "stop" as const;
      }
      setCheckFailedBlock(false);
      return "continue" as const;
    };

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;

      const meta = (data.session.user?.user_metadata ?? {}) as Record<string, unknown>;
      if (mustChangePassword(meta) && pathname !== CHANGE_PASSWORD_PATH) {
        router.replace(CHANGE_PASSWORD_PATH);
        return;
      }

      // Không bỏ qua 60 giây: hồ sơ vừa bị tắt phải bị chặn ở lần điều hướng kế.
      const res = await checkStaffSessionAllowed();
      if (cancelled) return;
      if ((await applyCheckResult(res)) === "stop") return;

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
        const meta = (session.user?.user_metadata ?? {}) as Record<string, unknown>;
        if (mustChangePassword(meta) && pathname !== CHANGE_PASSWORD_PATH) {
          router.replace(CHANGE_PASSWORD_PATH);
          return;
        }
        const res = await checkStaffSessionAllowed();
        if (cancelled) return;
        if ((await applyCheckResult(res)) === "stop") return;
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

  const onRetry = async () => {
    setRetrying(true);
    clearStaffGateAuthCheckAt();
    try {
      const res = await checkStaffSessionAllowed();
      const decision = decideStaffGateAction(res);
      if (decision.action === "sign_out_inactive") {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login?inactive=1");
        router.refresh();
        return;
      }
      if (decision.action === "block_check_failed") {
        setCheckFailedBlock(true);
        return;
      }
      setCheckFailedBlock(false);
    } finally {
      setRetrying(false);
    }
  };

  const onSignOut = async () => {
    clearStaffGateAuthCheckAt();
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  };

  if (!checkFailedBlock || isPublicAuthPath(pathname)) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="staff-gate-check-failed-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="staff-gate-check-failed-title" className="text-lg font-semibold text-slate-900">
          Không kiểm tra được phiên đăng nhập
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Hệ thống tạm thời không xác nhận được trạng thái tài khoản. Bạn không thể tiếp tục dùng ứng
          dụng cho đến khi kiểm tra thành công.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={retrying}
            onClick={() => void onRetry()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {retrying ? "Đang thử lại…" : "Thử lại"}
          </button>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
