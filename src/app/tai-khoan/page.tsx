// src/app/tai-khoan/page.tsx
"use client";

import React, { useState } from "react";
import { User, Shield, Link as LinkIcon, AlertTriangle, CheckCircle, Search, LogOut } from "lucide-react";
import { usePermission, type UserDataProfile } from "@/hooks/usePermission";
import { manualLinkAccountAction } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-link-governance.actions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export default function AccountPage() {
  const { userData, loading: rbacLoading, isAdmin } = usePermission();
  const profile = userData as UserDataProfile | null;
  const [isLinking, setIsLinking] = useState(false);
  const [maNv, setMaNv] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maNv.trim()) return;

    setIsSubmitting(true);
    const res = await manualLinkAccountAction(maNv);
    if (res.success) {
      toast.success("Liên kết tài khoản thành công!");
      window.location.reload();
    } else {
      toast.error(res.error || "Có lỗi xảy ra");
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        toast.error("Không đăng xuất được: " + error.message);
        return;
      }
    } catch (e) {
      console.warn("[tai-khoan] signOut", e);
    }
    window.location.href = "/login";
  };

  if (rbacLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        <p className={T.pageEyebrow}>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  const isLinked = !!userData?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className={`relative overflow-hidden p-8 md:p-12 ${C.panelSurface}`}>
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <User size={200} />
        </div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="flex h-24 w-24 items-center justify-center rounded-[var(--radius-shell)] bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg">
            <User size={48} />
          </div>
          
          <div className="flex-1 space-y-2">
            <h1 className={T.authTitle}>
              {isLinked ? String(profile?.ho_ten || "") : "Người dùng hệ thống"}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className={`rounded-full bg-slate-100 px-3 py-1 ${T.labelBlock} text-slate-600`}>
                {String(profile?.email || "Chưa cập nhật email")}
              </span>
              {isAdmin && (
                <span className={`flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 ${T.labelBlock} text-[var(--primary)]`}>
                  <Shield size={12} />
                  Quản trị viên
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className={`${C.btnSecondary} gap-2 text-[var(--surface-danger-text)] hover:bg-[var(--surface-danger-bg)]`}
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Status Card */}
        <div className={`space-y-6 p-8 ${C.panelSurface}`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-[var(--radius-shell)] p-3 ${isLinked ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {isLinked ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            </div>
            <h3 className={T.sectionTitle}>Trạng thái liên kết</h3>
          </div>

          {isLinked ? (
            <div className="space-y-4">
              <div className={`space-y-2 p-4 ${C.noticeSuccess}`}>
                <p className={T.labelBlock}>Hồ sơ đã kết nối</p>
                <div className="flex items-center justify-between">
                  <span className={T.tableCellBody}>{String(profile?.ho_ten || "")}</span>
                  <span className={T.metaMono}>#{String(profile?.ma_nv || "")}</span>
                </div>
              </div>
              <p className={`${T.pageSubtitle} font-medium`}>
                Tài khoản của bạn đã được liên kết chính xác với hồ sơ nhân sự của bệnh viện. Mọi hoạt động giám sát sẽ được ghi nhận tên bạn.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className={`${T.pageSubtitle} font-medium`}>
                Tài khoản này chưa được liên kết với hồ sơ nhân sự. Vui lòng thực hiện liên kết để sử dụng đầy đủ các tính năng giám sát.
              </p>
              
              {!isLinking ? (
                <button 
                  onClick={() => setIsLinking(true)}
                  className={`${C.btnPrimary} h-12 w-full gap-2 shadow-md`}
                >
                  <LinkIcon size={18} />
                  Bắt đầu liên kết hồ sơ
                </button>
              ) : (
                <form onSubmit={handleLink} className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Nhập mã nhân viên của bạn..."
                      className={`${C.controlInput} h-14 bg-slate-50 pl-12 font-semibold`}
                      value={maNv}
                      onChange={(e) => setMaNv(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsLinking(false)}
                      className={`${C.btnSecondary} h-12 flex-1 bg-slate-100 hover:bg-slate-200`}
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || !maNv}
                      className={`${C.btnPrimary} h-12 flex-[2] shadow-md`}
                    >
                      {isSubmitting ? "Đang xử lý..." : "Xác nhận liên kết"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Info Card */}
        <div className={`space-y-6 bg-slate-900 p-8 text-white shadow-xl ${C.panelSurface}`}>
          <div className="flex items-center gap-4">
            <div className="rounded-[var(--radius-shell)] bg-white/10 p-3 text-[var(--primary)]">
              <Shield size={24} />
            </div>
            <h3 className="text-sm font-semibold text-white">An toàn & Bảo mật</h3>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
              <p className={`${T.pageSubtitle} font-medium text-slate-300`}>
                Việc liên kết hồ sơ giúp hệ thống truy vết chính xác các hoạt động kiểm soát nhiễm khuẩn theo quy định của Bộ Y tế.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
              <p className={`${T.pageSubtitle} font-medium text-slate-300`}>
                Mỗi tài khoản chỉ được liên kết với duy nhất một hồ sơ nhân sự.
              </p>
            </div>
          </div>

          <button 
            onClick={() => window.location.href = "/tai-khoan/doi-mat-khau"}
            className={`${C.btnSecondary} mt-6 h-12 w-full border-white/20 bg-transparent text-white hover:bg-white/5`}
          >
            Thay đổi mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
