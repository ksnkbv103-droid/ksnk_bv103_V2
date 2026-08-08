"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { requestPasswordResetEmail } from "@/modules/auth/actions/staff-password.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Không gọi getSession ở đây — proxy đã redirect user có phiên khỏi /login/*.

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "";
      const redirectTo = `${origin}/login/reset-password`;
      const res = await requestPasswordResetEmail(email, redirectTo);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã gửi hướng dẫn đặt lại mật khẩu tới email (nếu tồn tại trong hệ thống).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-slate-100 bg-white p-8 shadow-[var(--shadow-app-soft)]">
          <h1 className={`text-center ${T.authTitle}`}>Quên mật khẩu</h1>
          <p className={`mt-2 text-center ${T.authSubtitle}`}>
            Nhập email đã đăng ký trong hệ thống để nhận liên kết đặt lại mật khẩu.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className={T.authLabel}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={T.authInput}
                placeholder="ten@bv103.vn"
              />
            </div>
            <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
              {loading ? "Đang gửi…" : "Gửi email"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium text-[var(--primary)] underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
