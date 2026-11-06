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
import { setStaffKsnkRbacRole } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import {
  RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER,
  staffKsnkRoleDisplayLabel,
} from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: { id: string; ho_ten?: string; ma_nv?: string; vai_tro_he_thong_ksnk?: string } | null;
  onSuccess: () => void;
};

export default function StaffKsnkRoleDialog({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: Props) {
  const [selectedRole, setSelectedRole] = useState("");
  const [actorPassword, setActorPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && staff) {
      setSelectedRole(staff.vai_tro_he_thong_ksnk || "");
      setActorPassword("");
    }
  }, [open, staff]);

  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actorPassword) {
      toast.error("Vui lòng nhập mật khẩu quản trị của bạn để xác nhận.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await setStaffKsnkRbacRole({
        staffId: staff.id,
        roleName: selectedRole,
        confirmActorPassword: actorPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Không thể gán vai trò.");
        return;
      }

      toast.success(
        selectedRole
          ? `Đã gán vai trò «${staffKsnkRoleDisplayLabel(selectedRole)}» cho ${staff.ho_ten || staff.ma_nv}.`
          : `Đã gỡ vai trò KSNK của ${staff.ho_ten || staff.ma_nv}.`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error("Lỗi khi gán vai trò: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Gán / Đổi vai trò KSNK hệ thống
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nhân sự: <span className="font-semibold text-slate-800">{staff.ho_ten}</span> ({staff.ma_nv})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label htmlFor="ksnk-role-select" className={T.labelBlockMuted}>
                Vai trò KSNK phân bổ
              </label>
              <select
                id="ksnk-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">— Gỡ bỏ vai trò KSNK —</option>
                {RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER.map((roleKey) => (
                  <option key={roleKey} value={roleKey}>
                    {staffKsnkRoleDisplayLabel(roleKey)} ({roleKey})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Gán đúng một vai trò chính trong phân hệ Kiểm soát nhiễm khuẩn (RBAC).
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label htmlFor="actor-confirm-pw" className={T.labelBlockMuted}>
                Mật khẩu quản trị của bạn <span className="text-rose-500">*</span>
              </label>
              <PasswordField
                id="actor-confirm-pw"
                name="actor-confirm-pw"
                value={actorPassword}
                onChange={(e) => setActorPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Nhập lại mật khẩu admin để xác nhận"
                required
              />
              <p className="text-[11px] text-slate-400">
                Cơ chế Sudo Re-auth: bắt buộc xác thực lại mật khẩu quản trị viên để bảo mật.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !actorPassword}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
            >
              {submitting ? "Đang lưu…" : "Xác nhận gán vai trò"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
