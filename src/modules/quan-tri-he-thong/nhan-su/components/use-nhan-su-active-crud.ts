"use client";

import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-action";
import { setNhanSuActiveAction } from "../actions/nhan-su-active.actions";
import type { NhanSu } from "../types";

/**
 * Bật/tắt và xóa mềm hồ sơ nhân sự qua server action (lát ACC-2) —
 * ngưng hồ sơ có tài khoản sẽ khóa đăng nhập Auth và xóa cache quyền.
 */
export function useNhanSuActiveCrud(onSuccess: () => void) {
  const run = async (ids: string[], active: boolean, mode: "toggle" | "delete", okMsg: string) => {
    const res = await setNhanSuActiveAction({ ids, active, mode });
    if (!res.success) {
      toast.error(res.error);
      onSuccess();
      return;
    }
    toast.success(okMsg);
    onSuccess();
  };

  const toggleStatus = async (item: NhanSu) => {
    await run([item.id], item.is_active === false, "toggle", "Đã cập nhật trạng thái");
  };

  const softDelete = async (item: NhanSu) => {
    if (!(await confirmAction(`Xóa mềm nhân sự ${item.ma_nv || item.id}?`))) return;
    await run([item.id], false, "delete", "Đã xóa mềm dữ liệu");
  };

  const softDeleteMany = async (items: NhanSu[]) => {
    if (!items.length) return;
    if (!(await confirmAction(`Xóa mềm ${items.length} nhân sự?`))) return;
    await run(
      items.map((i) => i.id),
      false,
      "delete",
      "Đã xóa mềm dữ liệu đã chọn",
    );
  };

  return { toggleStatus, softDelete, softDeleteMany };
}
