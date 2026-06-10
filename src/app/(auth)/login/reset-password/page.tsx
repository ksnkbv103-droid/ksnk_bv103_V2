"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Đã đặt mật khẩu mới.");
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <p className={T.authSubtitle}>Đang xác thực liên kết đặt lại mật khẩu…</p>
          <Link href="/login" className="mt-6 inline-block font-medium text-[var(--primary)] underline">
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
          <h1 className={`text-center ${T.authTitle}`}>Đặt mật khẩu mới</h1>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className={T.authLabel}>Mật khẩu mới</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={T.authInput}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
              {loading ? "Đang lưu…" : "Lưu mật khẩu"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium text-[var(--primary)] underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
