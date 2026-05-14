// src/app/tai-khoan/page.tsx
"use client";

import React, { useState } from "react";
import { User, Shield, Link as LinkIcon, AlertTriangle, CheckCircle, Search, LogOut } from "lucide-react";
import { usePermission, type UserDataProfile } from "@/hooks/usePermission";
import { manualLinkAccountAction } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-link-governance.actions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  const isLinked = !!userData?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[40px] bg-white border border-slate-100 shadow-xl p-8 md:p-12">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <User size={200} />
        </div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <User size={48} />
          </div>
          
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLinked ? String(profile?.ho_ten || "") : "Người dùng hệ thống"}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                {String(profile?.email || "Chưa cập nhật email")}
              </span>
              {isAdmin && (
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} />
                  Quản trị viên
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="px-6 py-3 rounded-2xl bg-rose-50 text-rose-600 text-sm font-black flex items-center gap-2 hover:bg-rose-100 transition-all active:scale-95"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Status Card */}
        <div className="rounded-[40px] bg-white border border-slate-100 shadow-lg p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isLinked ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Trạng thái liên kết</h3>
          </div>

          {isLinked ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
                <p className="text-[10px] font-black text-emerald-800 uppercase">Hồ sơ đã kết nối</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">{String(profile?.ho_ten || "")}</span>
                  <span className="text-xs font-black text-slate-400">#{String(profile?.ma_nv || "")}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Tài khoản của bạn đã được liên kết chính xác với hồ sơ nhân sự của bệnh viện. Mọi hoạt động giám sát sẽ được ghi nhận tên bạn.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Tài khoản này chưa được liên kết với hồ sơ nhân sự. Vui lòng thực hiện liên kết để sử dụng đầy đủ các tính năng giám sát.
              </p>
              
              {!isLinking ? (
                <button 
                  onClick={() => setIsLinking(true)}
                  className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
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
                      className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-12 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all uppercase"
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
                      className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || !maNv}
                      className="flex-[2] h-12 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50"
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
        <div className="rounded-[40px] bg-slate-900 text-white shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 text-indigo-400">
              <Shield size={24} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">An toàn & Bảo mật</h3>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-1 h-1 mt-2 rounded-full bg-indigo-400 shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Việc liên kết hồ sơ giúp hệ thống truy vết chính xác các hoạt động kiểm soát nhiễm khuẩn theo quy định của Bộ Y tế.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1 h-1 mt-2 rounded-full bg-indigo-400 shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Mỗi tài khoản chỉ được liên kết với duy nhất một hồ sơ nhân sự.
              </p>
            </div>
          </div>

          <button 
            onClick={() => window.location.href = "/tai-khoan/doi-mat-khau"}
            className="w-full h-12 rounded-2xl border border-white/20 text-white font-bold text-sm hover:bg-white/5 transition-all mt-6"
          >
            Thay đổi mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
