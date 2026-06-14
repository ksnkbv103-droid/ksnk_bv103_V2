"use server";

import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

export type AnalyticsViewerScope = {
  /** Khoa lâm sàng / mạng lưới — chỉ xem số liệu khoa mình. */
  isKhoaLocked: boolean;
  actorKhoaId: string | null;
};

/** Scope đọc analytics — khớp RPC strategic (`p_khoa_ids` khi `isMangLuoiKsnk`). */
export async function getAnalyticsViewerScope(): Promise<
  { success: true; data: AnalyticsViewerScope } | { success: false; error: string }
> {
  try {
    await verifyCommandCenterShell();
    const scope = await getActorKsnkScope();
    const isKhoaLocked =
      scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk && Boolean(scope.actorKhoaId);
    return {
      success: true,
      data: {
        isKhoaLocked,
        actorKhoaId: scope.actorKhoaId,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Không đọc được phạm vi người dùng",
    };
  }
}
