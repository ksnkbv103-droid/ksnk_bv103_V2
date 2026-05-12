"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { changePasswordWithReauth } from "@/modules/auth/actions/staff-password.actions";

export default function DoiMatKhauPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await changePasswordWithReauth(email, oldPw, newPw);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại nếu phiên bị hết hạn.");
      setOldPw("");
      setNewPw("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <h1 className="text-xl font-black uppercase tracking-tight text-[#026f17]">Đổi mật khẩu</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-xs font-bold text-slate-600">Email đăng nhập</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
            readOnly
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600">Mật khẩu mới (ít nhất 8 ký tự)</label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#026f17] py-3 text-sm font-bold uppercase text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
