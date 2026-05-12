"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { requestPasswordResetEmail } from "@/modules/auth/actions/staff-password.actions";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

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
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
          <h1 className="text-center text-2xl font-black uppercase text-[#026f17]">Quên mật khẩu</h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Nhập email đã đăng ký trong hệ thống để nhận liên kết đặt lại mật khẩu.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="ten@bv103.vn"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#026f17] py-3 text-sm font-bold uppercase text-white disabled:opacity-50"
            >
              {loading ? "Đang gửi…" : "Gửi email"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-bold text-[#026f17] underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
