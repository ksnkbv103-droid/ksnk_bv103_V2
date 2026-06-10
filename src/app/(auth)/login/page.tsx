"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { loginWithStaffIdentifier } from "@/modules/auth/actions/staff-login.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ensureGuest = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/");
      }
    };
    void ensureGuest();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginWithStaffIdentifier(identifier, password);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error: browserErr } = await supabase.auth.signInWithPassword({
        email: res.authEmail,
        password,
      });
      if (browserErr) {
        toast.error(
          browserErr.message ||
            "Phiên chưa đồng bộ trình duyệt. Thử tải lại trang hoặc đăng nhập lại.",
        );
        window.location.assign("/");
        return;
      }
      toast.success("Đăng nhập thành công!");
      window.location.assign("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="sticky top-0 z-50 h-20 shrink-0 border-b border-gray-200 bg-white px-4 md:px-8 flex items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/logo-bv103.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 bg-transparent object-contain drop-shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
            aria-hidden
          />
          <span className={`truncate ${T.authBrand}`}>KSNK 103</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <Image
              src="/brand/logo-bv103.png"
              alt="Logo Bệnh viện Quân y 103"
              width={112}
              height={112}
              className="mx-auto mb-4 block h-28 w-28 bg-transparent object-contain drop-shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
              priority
            />
            <p className="text-[11px] font-medium leading-tight tracking-wide text-slate-700 md:text-xs">
              Bệnh viện Quân y 103
            </p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-[var(--primary)] md:text-xs">
              Khoa Kiểm soát nhiễm khuẩn
            </p>
            <h1 className={`mt-4 ${T.authTitle}`}>KSNK 103</h1>
            <p className={T.authSubtitle}>Đăng nhập hệ thống</p>
          </div>

          <form id="ksnk-login-form" onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className={T.authLabel}>Mã nhân viên hoặc email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={T.authInput}
                placeholder="Ví dụ: NV001 hoặc email@bv.vn"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className={T.authLabel}>Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={T.authInput}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="text-right">
              <Link href="/login/forgot-password" className="text-sm font-medium text-[var(--primary)] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
              {loading ? "Đang xử lý…" : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
