"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { changePasswordWithReauth } from "@/modules/auth/actions/staff-password.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import PasswordField from "@/components/auth/PasswordField";

export default function DoiMatKhauPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
      const meta = (data.session?.user?.user_metadata ?? {}) as Record<string, unknown>;
      setMustChange(meta.must_change_password === true);
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await changePasswordWithReauth(email, oldPw, newPw);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã đổi mật khẩu.");
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
      setMustChange(false);
      // Refresh session metadata locally
      await supabase.auth.refreshSession();
      if (mustChange) {
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-[var(--bv103-space-3)] p-4">
      <h1 className={T.pageTitle}>Đổi mật khẩu</h1>
      {mustChange ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Tài khoản đang dùng mật khẩu tạm do quản trị cấp. Vui lòng đổi mật khẩu trước khi tiếp tục.
        </div>
      ) : null}
      <form onSubmit={onSubmit} className={`space-y-[var(--bv103-space-3)] ${C.panelShellPadded}`}>
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
          <PasswordField
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className={`mt-1 ${T.authInput}`}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className={T.labelBlock}>Mật khẩu mới (ít nhất 8 ký tự)</label>
          <PasswordField
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className={`mt-1 ${T.authInput}`}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className={T.labelBlock}>Xác nhận mật khẩu mới</label>
          <PasswordField
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
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
