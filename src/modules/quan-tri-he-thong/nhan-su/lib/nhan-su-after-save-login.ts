import { toast } from "sonner";
import {
  provisionStaffAuthAccount,
  setStaffKsnkRbacRole,
} from "../../tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import { resolveAssignableRoleName } from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";

export { resolveAssignableRoleName };

type AfterSaveArgs = {
  staffId: string;
  savedMessage: string;
  canProvision: boolean;
  hasAuth: boolean;
  createLogin: boolean;
  email?: string | null;
  password: string;
  roleName: string;
  /** ADM-03: bắt buộc khi gán/đồng bộ vai trò. */
  confirmActorPassword?: string;
};

/** Hồ sơ đã lưu — tạo đăng nhập / đồng bộ vai trò nếu có quyền. */
export async function afterSaveNhanSuLogin(args: AfterSaveArgs): Promise<void> {
  const roleName = resolveAssignableRoleName(args.roleName);
  const actorPw = String(args.confirmActorPassword || "").trim();

  if (args.canProvision && args.staffId && args.createLogin && !args.hasAuth) {
    if (!args.email) {
      toast.success(args.savedMessage);
      toast.error("Đã lưu hồ sơ nhưng thiếu email — chưa tạo đăng nhập.");
      return;
    }
    if (args.password.length < 8) {
      toast.success(args.savedMessage);
      toast.error("Đã lưu hồ sơ. Mật khẩu đăng nhập cần tối thiểu 8 ký tự — tạo tài khoản bằng nút «Tạo TK» trên danh sách Nhân sự.");
      return;
    }
    const prov = await provisionStaffAuthAccount({ staffId: args.staffId, password: args.password });
    if (!prov.success) {
      toast.success(args.savedMessage);
      toast.error(prov.error || "Hồ sơ đã lưu, chưa tạo được đăng nhập.");
      return;
    }
    if (roleName) {
      if (!actorPw) {
        toast.success("Đã lưu hồ sơ và tạo đăng nhập.");
        toast.error("Chưa gán vai trò — cần nhập lại mật khẩu quản trị (màn Tài khoản).");
        return;
      }
      const roleRes = await setStaffKsnkRbacRole({
        staffId: args.staffId,
        roleName,
        confirmActorPassword: actorPw,
      });
      if (!roleRes.success) toast.error(roleRes.error || "Đã tạo tài khoản nhưng chưa gán được vai trò.");
    }
    toast.success("Đã lưu hồ sơ và tạo đăng nhập.");
    return;
  }

  // Có Auth: đồng bộ RBAC khi có mật khẩu xác nhận (ADM-03). ADM-07: ô vai trò form chỉ đọc.
  if (args.canProvision && args.staffId && args.hasAuth && actorPw) {
    const roleRes = await setStaffKsnkRbacRole({
      staffId: args.staffId,
      roleName: roleName || "",
      confirmActorPassword: actorPw,
    });
    if (!roleRes.success) {
      toast.success(args.savedMessage);
      toast.error(roleRes.error || "Hồ sơ đã lưu, chưa đồng bộ vai trò đăng nhập.");
      return;
    }
  }

  toast.success(args.savedMessage);
}
