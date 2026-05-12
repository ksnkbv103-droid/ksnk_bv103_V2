// src/hooks/usePermission.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/constants";
import { createPermissionApi, type PermissionRow } from "./use-permission-api";

export type UserDataProfile = {
  id: string | null;
  ma_nv: string | null;
  ho_ten: string | null;
  email: string | null;
  khoa_id: string | null;
  khoa: {
    ma_khoa: string | null;
    ten_khoa: string | null;
  } | null;
};

type RBACSnapshot = {
  userRoles: string[];
  permissions: PermissionRow[];
  userEmail: string;
  userData: UserDataProfile | null;
};

const RBAC_CACHE_TTL_MS = 15_000;
let rbacCache: { userId: string; snapshot: RBACSnapshot; cachedAt: number } | null = null;
let rbacInFlight: Promise<RBACSnapshot> | null = null;

/**
 * Hook kiểm tra quyền hạn của người dùng (RBAC Linh hoạt)
 */
export function usePermission(moduleKey?: string, action: string = "view") {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userData, setUserData] = useState<UserDataProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    function applySnapshot(snapshot: RBACSnapshot) {
      if (!mounted) return;
      setUserRoles(snapshot.userRoles);
      setPermissions(snapshot.permissions);
      setUserEmail(snapshot.userEmail);
      setUserData(snapshot.userData);
      setLoading(false);
    }

    async function fetchRBAC(user: User): Promise<RBACSnapshot> {
      const { data: authData, error: authErr } = await supabase
        .from("v_auth_user_permissions")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (authErr) throw authErr;

      const userDataProfile: UserDataProfile | null = authData
        ? {
            id: authData.staff_id,
            ma_nv: authData.ma_nv,
            ho_ten: authData.ho_ten,
            email: authData.email,
            khoa_id: authData.khoa_id,
            khoa: authData.ten_khoa_phong
              ? {
                  ma_khoa: authData.ma_khoa_phong,
                  ten_khoa: authData.ten_khoa_phong,
                }
              : null,
          }
        : null;

      const roles = ((authData?.roles as string[]) || []).slice();
      const emailNorm = String(user.email || "").toLowerCase().trim();
      const isAdminEmail = ADMIN_EMAILS.some((a) => a.toLowerCase().trim() === emailNorm);
      if (isAdminEmail && !roles.includes("ADMIN")) {
        roles.push("ADMIN");
      }

      return {
        userRoles: roles,
        permissions: ((authData?.permissions as PermissionRow[]) || []).slice(),
        userEmail: user.email || "",
        userData: userDataProfile,
      };
    }

    async function loadRBAC(user: User | null) {
      if (!user) {
        setUserRoles([]);
        setPermissions([]);
        setUserEmail("");
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const now = Date.now();
        if (rbacCache && rbacCache.userId === user.id && now - rbacCache.cachedAt < RBAC_CACHE_TTL_MS) {
          applySnapshot(rbacCache.snapshot);
          return;
        }

        if (!rbacInFlight) {
          rbacInFlight = fetchRBAC(user).finally(() => {
            rbacInFlight = null;
          });
        }
        const snapshot = await rbacInFlight;
        rbacCache = { userId: user.id, snapshot, cachedAt: now };
        applySnapshot(snapshot);
      } catch (error) {
        console.error("RBAC Error (Smart DB View):", error);
        if (mounted) setLoading(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      void loadRBAC(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadRBAC(session?.user ?? null);
    });
    const unsub = () => subscription.unsubscribe();

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const api = useMemo(() => createPermissionApi(permissions, userRoles, userEmail), [permissions, userRoles, userEmail]);
  const allowed = moduleKey ? api.checkPermission(moduleKey, action) : false;

  return {
    loading,
    isAdmin: api.finalIsAdmin,
    userRoles,
    role: userRoles[0] || "",
    userEmail,
    userData,
    can: api.can,
    canView: api.canView,
    canCreate: api.canCreate,
    canEdit: api.canEdit,
    canDelete: api.canDelete,
    canImport: api.canImport,
    allowed,
    canManageNS: api.canManageNS,
    canImportNS: api.canImportNS,
    canManageBK: api.canManageBK,
    canImportBK: api.canImportBK,
    canManageDM: api.canManageDM,
    isNhanVienKSNK: api.isNhanVienKSNK,
    isMangLuoi: api.isMangLuoi,
    isToTruongMangLuoiKSNK: api.isToTruongMangLuoiKSNK,
    isThanhVienMangLuoiKSNK: api.isThanhVienMangLuoiKSNK,
    isHoiDongKSNK: api.isHoiDongKSNK,
    hasPermission: api.hasPermission,
  };
}
