"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExamFormThongTin } from "@/lib/dao-tao/types";
import { usePermission } from "@/hooks/usePermission";

const EMPTY: ExamFormThongTin = { hoTen: "", khoaDonVi: "", soDienThoai: "", email: "" };

/** Điền họ tên / khoa từ hồ sơ đăng nhập — chỉ hỏi lại khi thiếu. */
export function useDaoTaoThiSinhForm() {
  const { userData, userEmail, loading } = usePermission();
  const [form, setForm] = useState<ExamFormThongTin>(EMPTY);

  useEffect(() => {
    if (loading) return;
    setForm({
      hoTen: (userData?.ho_ten ?? "").trim(),
      khoaDonVi: (userData?.khoa?.ten_khoa ?? "").trim(),
      soDienThoai: "",
      email: (userData?.email ?? userEmail ?? "").trim(),
    });
  }, [loading, userData, userEmail]);

  const complete = Boolean(form.hoTen.trim() && form.khoaDonVi.trim());
  const banner = useMemo(
    () => (complete ? `${form.hoTen} · ${form.khoaDonVi}` : null),
    [complete, form.hoTen, form.khoaDonVi],
  );

  return { form, setForm, complete, banner, loading };
}
