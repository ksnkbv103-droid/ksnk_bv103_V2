import { toast } from "sonner";
import {
  provisionStaffAuthAccount,
  setStaffKsnkRbacRole,
} from "../../tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import {
  RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER,
  RBAC_STAFF_ASSIGNABLE_ROLE_LABEL,
} from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";

export function resolveAssignableRoleName(labelOrName: string): string {
  const raw = labelOrName.trim();
  const upper = raw.toUpperCase();
  if ((RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER as readonly string[]).includes(upper)) return upper;
  const found = Object.entries(RBAC_STAFF_ASSIGNABLE_ROLE_LABEL).find(([, label]) => label === raw);
  return found?.[0] ?? raw;
}

type AfterSaveArgs = {
  staffId: string;
  savedMessage: string;
  canProvision: boolean;
  hasAuth: boolean;
  createLogin: boolean;
  email?: string | null;
  password: string;
  roleName: string;
};

/** Hồ sơ đã lưu — tạo đăng nhập / đồng bộ vai trò nếu có quyền. */
export async function afterSaveNhanSuLogin(args: AfterSaveArgs): Promise<void> {
  const roleName = resolveAssignableRoleName(args.roleName);

  if (args.canProvision && args.staffId && args.createLogin && !args.hasAuth) {
    if (!args.email) {
      toast.success(args.savedMessage);
      toast.error("Đã lưu hồ sơ nhưng thiếu email — chưa tạo đăng nhập.");
      return;
    }
    if (args.password.length < 8) {
      toast.success(args.savedMessage);
      toast.error("Đã lưu hồ sơ. Mật khẩu đăng nhập cần tối thiểu 8 ký tự — tạo tài khoản ở «Người dùng và quyền».");
      return;
    }
    const prov = await provisionStaffAuthAccount({ staffId: args.staffId, password: args.password });
    if (!prov.success) {
      toast.success(args.savedMessage);
      toast.error(prov.error || "Hồ sơ đã lưu, chưa tạo được đăng nhập.");
      return;
    }
    if (roleName) {
      const roleRes = await setStaffKsnkRbacRole({ staffId: args.staffId, roleName });
      if (!roleRes.success) toast.error(roleRes.error || "Đã tạo tài khoản nhưng chưa gán được vai trò.");
    }
    toast.success("Đã lưu hồ sơ và tạo đăng nhập.");
    return;
  }

  if (args.canProvision && args.staffId && args.hasAuth && roleName) {
    const roleRes = await setStaffKsnkRbacRole({ staffId: args.staffId, roleName });
    if (!roleRes.success) {
      toast.success(args.savedMessage);
      toast.error(roleRes.error || "Hồ sơ đã lưu, chưa đồng bộ vai trò đăng nhập.");
      return;
    }
  }

  toast.success(args.savedMessage);
}
