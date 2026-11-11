"use server";

import { getTrungTamDanhMucStatsAction } from "../danh-muc/actions/danh-muc-hybrid.actions";
import type { TrungTamDanhMucStatsPayload } from "../danh-muc/actions/danh-muc-hybrid.types";
import type { MdmGatewayResult } from "./mdm-gateway.types";

// CRUD danh mục generic: gọi thẳng `@/lib/master-data/engine/generic-dm.actions` (AR-8c).
export async function mdmGetTrungTamDanhMucStats(options?: { includeRegistry?: boolean }) {
  return getTrungTamDanhMucStatsAction(options) as Promise<MdmGatewayResult<TrungTamDanhMucStatsPayload>>;
}
