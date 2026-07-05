/** Type Scope quyền KSNK của actor. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type ActorKsnkScope = {
  roles: string[];
  actorNhanSuId: string | null;
  actorKhoaId: string | null;
  isAdmin: boolean;
  isNhanVienKsnk: boolean;
  isMangLuoiKsnk: boolean;
  /** Vai trò KHACH_THONG_KE_GSTT — chỉ Thống kê VST/GSC. */
  isGuestStatsOnly: boolean;
};
