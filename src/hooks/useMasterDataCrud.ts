"use client";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface MasterDataCrudConfig<T> {
  tableName: string;
  codeField: keyof T | string;
  mainField: keyof T | string;
  entityLabel: string;
  onSuccess: () => void;
}

export function useMasterDataCrud<T extends { id: string; is_active?: boolean }>(config: MasterDataCrudConfig<T>) {
  const toggleStatus = async (item: T) => {
    const { error } = await supabase
      .from(config.tableName)
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã cập nhật trạng thái");
    config.onSuccess();
  };

  const quickEditMainField = async (item: T) => {
    const currentValue = String(item[config.mainField as keyof T] ?? "");
    const nextValue = window.prompt(`Nhập ${config.entityLabel} mới`, currentValue);
    if (!nextValue || nextValue.trim() === currentValue) return;
    const { error } = await supabase
      .from(config.tableName)
      .update({
        [config.mainField]: nextValue.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã cập nhật dữ liệu");
    config.onSuccess();
  };

  const softDelete = async (item: T) => {
    const code = String(item[config.codeField as keyof T] ?? item.id);
    if (!window.confirm(`Xóa mềm ${config.entityLabel} ${code}?`)) return;
    const { error } = await supabase
      .from(config.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa mềm dữ liệu");
    config.onSuccess();
  };

  const softDeleteMany = async (items: T[]) => {
    if (!items.length) return;
    if (!window.confirm(`Xóa mềm ${items.length} ${config.entityLabel}?`)) return;
    const { error } = await supabase
      .from(config.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", items.map((item) => item.id));
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa mềm dữ liệu đã chọn");
    config.onSuccess();
  };

  return { toggleStatus, quickEditMainField, softDelete, softDeleteMany };
}
