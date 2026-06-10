"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { changePasswordWithReauth } from "@/modules/auth/actions/staff-password.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

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
      <h1 className={T.pageTitle}>Đổi mật khẩu</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={T.labelBlock}>Email đăng nhập</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 ${T.authInput}`}
            required
            readOnly
          />
        </div>
        <div>
          <label className={T.labelBlock}>Mật khẩu hiện tại</label>
          <input
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className={`mt-1 ${T.authInput}`}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className={T.labelBlock}>Mật khẩu mới (ít nhất 8 ký tự)</label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className={`mt-1 ${T.authInput}`}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
          {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
