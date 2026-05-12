"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { loginWithStaffIdentifier } from "@/modules/auth/actions/staff-login.actions";

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
      <header className="sticky top-0 z-50 h-20 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/logo-bv103.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 bg-transparent object-contain drop-shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
            aria-hidden
          />
          <span className="truncate text-xl font-black text-[#026f17] uppercase tracking-tight">KSNK 103</span>
        </div>
        <button
          type="submit"
          form="ksnk-login-form"
          disabled={loading}
          className="min-h-11 px-5 rounded-xl bg-[#026f17] text-white text-sm font-bold uppercase tracking-wider hover:bg-[#015711] active:bg-[#015a12] disabled:opacity-50 touch-manipulation"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
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
            <p className="text-[11px] font-bold leading-tight tracking-wide text-slate-700 md:text-xs">
              BỆNH VIỆN QUÂN Y 103
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-[#026f17] md:text-xs">
              Khoa Kiểm soát nhiễm khuẩn
            </p>
            <h1 className="mt-4 text-3xl font-black text-[#026f17] uppercase tracking-tighter">KSNK 103</h1>
            <p className="text-slate-500 font-medium mt-2">Đăng nhập hệ thống</p>
          </div>

          <form id="ksnk-login-form" onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mã nhân viên hoặc email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#026f17]/50 focus:border-[#026f17]"
                placeholder="Ví dụ: NV001 hoặc email@bv.vn"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#026f17]/50 focus:border-[#026f17]"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="text-right">
              <Link href="/login/forgot-password" className="text-sm font-bold text-[#026f17] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#026f17] text-white rounded-xl font-bold uppercase tracking-wider hover:bg-[#015711] transition-colors disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
