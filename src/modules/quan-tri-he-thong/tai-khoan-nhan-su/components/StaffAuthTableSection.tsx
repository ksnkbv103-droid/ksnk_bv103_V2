"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Shield, KeyRound, Loader2, UserCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { listStaffAuthOverview } from "../actions/tai-khoan-nhan-su.actions";
import type { StaffAuthRow } from "@/types/nhan-su";
import { staffKsnkRoleDisplayLabel } from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";
import StaffKsnkRoleDialog from "@/modules/quan-tri-he-thong/nhan-su/components/StaffKsnkRoleDialog";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function StaffAuthTableSection() {
  const [rows, setRows] = useState<StaffAuthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleStaff, setRoleStaff] = useState<{
    id: string;
    ho_ten?: string;
    ma_nv?: string;
    vai_tro_he_thong_ksnk?: string;
  } | null>(null);

  const fetchRows = useCallback(async (keyword: string, currentPage: number) => {
    setLoading(true);
    try {
      const res = await listStaffAuthOverview({
        search: keyword.trim() || undefined,
        page: currentPage,
        pageSize: 15,
      });
      if (res.success && res.rows) {
        setRows(res.rows);
        setTotal(res.total);
      } else {
        toast.error("Không tải được danh sách tài khoản: " + (res.error || ""));
      }
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRows(search, page);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, page, fetchRows]);

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Danh sách tài khoản & vai trò KSNK
          </h2>
          <p className="text-xs text-slate-500">
            Xem hồ sơ tài khoản và gán trực tiếp vai trò trong phân hệ Kiểm soát nhiễm khuẩn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, mã NV, email..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void fetchRows(search, page)}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm disabled:opacity-40"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Email tài khoản</th>
                <th className="px-4 py-3">Trạng thái Auth</th>
                <th className="px-4 py-3">Vai trò KSNK hiện tại</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy nhân sự phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const mainRole = (r.role_names || [])[0] || "";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{r.ma_nv || "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.ho_ten || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={r.email || undefined}>
                        {r.email || <span className="text-slate-400">Chưa có email</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.auth_user_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Đã liên kết
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            Chưa tạo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mainRole ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                            <Shield className="w-3 h-3 text-teal-600" />
                            {staffKsnkRoleDisplayLabel(mainRole)}
                          </span>
                        ) : (
                          <span className="text-slate-400">— chưa gán vai trò —</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.auth_user_id ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleStaff({
                                id: r.id,
                                ho_ten: r.ho_ten || undefined,
                                ma_nv: r.ma_nv || undefined,
                                vai_tro_he_thong_ksnk: mainRole,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50/80 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 shadow-sm transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5 text-teal-600" />
                            Gán / Đổi vai trò
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Tạo TK tại Nhân sự</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 15 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <span>
              Tổng số <span className="font-semibold text-slate-800">{total}</span> hồ sơ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Trước
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <StaffKsnkRoleDialog
        open={Boolean(roleStaff)}
        onOpenChange={(open) => {
          if (!open) setRoleStaff(null);
        }}
        staff={roleStaff}
        onSuccess={() => void fetchRows(search, page)}
      />
    </section>
  );
}
