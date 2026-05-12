"use server";

import {
  getSupervisionMasterDataBundle,
} from "../danh-muc/actions/master-data-gateway.actions";
import { getTrungTamDanhMucStatsAction } from "../danh-muc/actions/danh-muc-hybrid.actions";
import type { TrungTamDanhMucStatsPayload } from "../danh-muc/actions/danh-muc-hybrid.types";
import type { MdmGatewayResult } from "./mdm-gateway.types";
import {
  listGenericDmAction,
  suggestNextGenericDmMaAction,
  upsertGenericDmAction,
  toggleGenericDmAction,
  softDeleteGenericDmAction,
  softDeleteManyGenericDmAction,
} from "../danh-muc/actions/generic-dm.actions";

export async function mdmGetSupervisionMasterDataBundle(options: {
  includeNhanSu?: boolean;
  includeNgheNghiep?: boolean;
  includeHistoryLocations?: boolean;
  permissionContext?: "admin" | "vst" | "gsc" | "nkbv";
} = {}) {
  return getSupervisionMasterDataBundle(options);
}

export async function mdmGetTrungTamDanhMucStats(options?: { includeRegistry?: boolean }) {
  return getTrungTamDanhMucStatsAction(options) as Promise<MdmGatewayResult<TrungTamDanhMucStatsPayload>>;
}

export async function mdmListGenericDm(loaiDanhMuc: string) {
  return listGenericDmAction(loaiDanhMuc);
}

export async function mdmSuggestNextGenericDmMa(loaiDanhMuc: string) {
  return suggestNextGenericDmMaAction(loaiDanhMuc) as Promise<MdmGatewayResult<string>>;
}

export async function mdmUpsertGenericDm(
  loaiDanhMuc: string,
  id: string | null,
  ma: string,
  ten: string,
  isActive: boolean,
) {
  return upsertGenericDmAction(loaiDanhMuc, id, ma, ten, isActive);
}

export async function mdmToggleGenericDm(loaiDanhMuc: string, id: string, currentActive: boolean) {
  return toggleGenericDmAction(loaiDanhMuc, id, currentActive);
}

export async function mdmSoftDeleteGenericDm(loaiDanhMuc: string, id: string) {
  return softDeleteGenericDmAction(loaiDanhMuc, id);
}

export async function mdmSoftDeleteManyGenericDm(loaiDanhMuc: string, ids: string[]) {
  return softDeleteManyGenericDmAction(loaiDanhMuc, ids);
}
