"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PasswordField from "@/components/auth/PasswordField";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { toast } from "sonner";

export type StaffAuthPasswordMode = "create" | "reset" | "approve_request" | "approve_reset";

export type StaffAuthPasswordSubmit = {
  password: string;
  confirmActorPassword?: string;
  secondApproverEmail?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StaffAuthPasswordMode;
  staffName: string;
  submitting?: boolean;
  /** Bắt buộc nhập MK admin hiện tại (reset / duyệt). */
  requireReauth?: boolean;
  /** Chỉ khi tự reset MK của chính mình — cần ghi nhận email quản trị khác (không phải dual-control live). */
  requireSecondApprover?: boolean;
  onSubmit: (payload: StaffAuthPasswordSubmit) => void | Promise<void>;
};

/** Dialog đặt mật khẩu ban đầu / đặt lại MK (≥8 + xác nhận + re-auth khi cần). */
export default function StaffAuthPasswordDialog({
  open,
  onOpenChange,
  mode,
  staffName,
  submitting = false,
  requireReauth = false,
  requireSecondApprover = false,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [actorPassword, setActorPassword] = useState("");
  const [secondEmail, setSecondEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setActorPassword("");
      setSecondEmail("");
    }
  }, [open]);

  const title =
    mode === "create" || mode === "approve_request"
      ? mode === "approve_request"
        ? "Duyệt và tạo tài khoản"
        : "Tạo tài khoản đăng nhập"
      : mode === "approve_reset"
        ? "Duyệt yêu cầu đặt lại mật khẩu"
        : "Đặt lại mật khẩu";
  const submitLabel =
    mode === "create" || mode === "approve_request"
      ? mode === "approve_request"
        ? "Duyệt & tạo TK"
        : "Tạo TK"
      : mode === "approve_reset"
        ? "Duyệt & đặt lại MK"
        : "Đặt lại MK";

  const needReauth = requireReauth || mode === "reset" || mode === "approve_request" || mode === "approve_reset";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      toast.error("Xác nhận mật khẩu không khớp.");
      return;
    }
    if (needReauth && !actorPassword) {
      toast.error("Nhập mật khẩu đăng nhập của bạn để xác nhận.");
      return;
    }
    if (requireSecondApprover && !secondEmail.trim()) {
      toast.error("Không tự đặt lại MK của chính mình — nhập email quản trị khác để ghi nhận, hoặc dùng Đổi mật khẩu của tôi.");
      return;
    }
    await onSubmit({
      password,
      ...(needReauth ? { confirmActorPassword: actorPassword } : {}),
      ...(requireSecondApprover && secondEmail.trim()
        ? { secondApproverEmail: secondEmail.trim() }
        : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {staffName ? (
              <>
                Nhân sự: <span className="font-medium text-slate-800">{staffName}</span>. Người dùng sẽ
                phải đổi mật khẩu ở lần đăng nhập tiếp theo.
              </>
            ) : (
              "Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập tiếp theo."
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <label className={T.authLabel}>
              {mode === "create" || mode === "approve_request" ? "Mật khẩu ban đầu" : "Mật khẩu mới"} (≥8)
            </label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={T.authInput}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className={T.authLabel}>Xác nhận mật khẩu</label>
            <PasswordField
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={T.authInput}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={submitting}
            />
          </div>
          {needReauth ? (
            <div>
              <label className={T.authLabel}>Mật khẩu của bạn (xác nhận lại)</label>
              <PasswordField
                value={actorPassword}
                onChange={(e) => setActorPassword(e.target.value)}
                className={T.authInput}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Xác thực lại phiên quản trị trước khi đổi mật khẩu người khác.
              </p>
            </div>
          ) : null}
          {needReauth && requireSecondApprover ? (
            <div>
              <label className={T.authLabel}>Email quản trị khác *</label>
              <input
                type="email"
                value={secondEmail}
                onChange={(e) => setSecondEmail(e.target.value)}
                className={T.authInput}
                placeholder="quantri.khac@bv103.vn"
                required
                disabled={submitting}
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-amber-700">
                Bạn đang đặt lại MK trên hồ sơ của chính mình. Nên dùng «Đổi mật khẩu của tôi» thay vì
                tự reset tại đây. Nếu vẫn tiếp tục, nhập email quản trị khác để ghi nhận (chưa có duyệt
                2 admin trực tiếp).
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              className={T.btnSecondary}
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </button>
            <button type="submit" className={T.btnPrimary} disabled={submitting}>
              {submitting ? "Đang xử lý…" : submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
