"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { requestPasswordResetEmail } from "@/modules/auth/actions/staff-password.actions";
import { submitForgotResetAdminRequestAction } from "@/modules/quan-tri-he-thong/nhan-su/actions/account-access-request.actions";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMaNv, setAdminMaNv] = useState("");
  const [adminLyDo, setAdminLyDo] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

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

  const onAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const res = await submitForgotResetAdminRequestAction({
        email: adminEmail || email,
        ma_nv: adminMaNv || undefined,
        ly_do: adminLyDo,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message || "Đã ghi nhận yêu cầu cho quản trị.");
      setAdminLyDo("");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-slate-100 bg-white p-8 shadow-[var(--shadow-app-soft)]">
          <h1 className={`text-center ${T.authTitle}`}>Quên mật khẩu</h1>
          <p className={`mt-2 text-center ${T.authSubtitle}`}>
            Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu. Nếu email nội bộ không hoạt động,
            gửi yêu cầu để quản trị đặt lại.
          </p>
          <form className="mt-8 space-y-[var(--bv103-space-3)]" onSubmit={(e) => void onSubmit(e)}>
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

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              type="button"
              className="w-full text-left text-sm font-semibold text-slate-800"
              onClick={() => {
                setAdminOpen((v) => !v);
                if (!adminEmail && email) setAdminEmail(email);
              }}
            >
              {adminOpen ? "▾" : "▸"} Gửi yêu cầu admin đặt lại MK
            </button>
            {adminOpen ? (
              <form className="mt-4 space-y-3" onSubmit={(e) => void onAdminSubmit(e)}>
                <div>
                  <label className={T.authLabel}>Email *</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className={T.authInput}
                    placeholder="ten@bv103.vn"
                  />
                </div>
                <div>
                  <label className={T.authLabel}>Mã nhân viên (tuỳ chọn)</label>
                  <input
                    type="text"
                    value={adminMaNv}
                    onChange={(e) => setAdminMaNv(e.target.value)}
                    className={T.authInput}
                    placeholder="VD: NV001"
                  />
                </div>
                <div>
                  <label className={T.authLabel}>Lý do *</label>
                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    value={adminLyDo}
                    onChange={(e) => setAdminLyDo(e.target.value)}
                    className={`${T.authInput} min-h-[80px] resize-y`}
                    placeholder="VD: Không nhận được email reset / hộp thư nội bộ lỗi…"
                  />
                </div>
                <button type="submit" disabled={adminLoading} className={`w-full ${T.btnSecondary}`}>
                  {adminLoading ? "Đang gửi…" : "Gửi yêu cầu admin"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Sau khi gửi, có thể{" "}
                  <Link href="/login/tra-cuu-yeu-cau" className="font-medium text-[var(--primary)] underline">
                    tra cứu trạng thái
                  </Link>
                  .
                </p>
              </form>
            ) : null}
          </div>

          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm">
            <Link href="/login" className="font-medium text-[var(--primary)] underline">
              Quay lại đăng nhập
            </Link>
            <Link href="/login/tra-cuu-yeu-cau" className="font-medium text-[var(--primary)] underline">
              Tra cứu yêu cầu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
