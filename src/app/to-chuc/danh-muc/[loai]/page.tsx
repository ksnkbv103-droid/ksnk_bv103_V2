import GenericDmMasterPage from "@/components/master-data/generic-dm/GenericDmMasterPage";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import { isToChucLookupType } from "@/lib/master-data/danh-muc-admin-routes";
import { DM_HUB_LABELS } from "@/lib/master-data/domain-registry";
import { TO_CHUC_PATH } from "@/lib/master-data/quan-tri-paths";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(props: { params: Promise<{ loai: string }> }): Promise<Metadata> {
  const loai = decodeURIComponent((await props.params).loai);
  return { title: DM_HUB_LABELS[loai] || `Danh mục ${loai}` };
}

/** AR-8e: chỉ nhận loại thuộc `DANH_MUC_ORG`; loại khác → 404 (không mở danh mục miền khác qua Tổ chức). */
export default async function Page(props: { params: Promise<{ loai: string }> }) {
  const loai = decodeURIComponent((await props.params).loai).trim().toUpperCase();
  if (!isToChucLookupType(loai)) notFound();

  const allowed = await canAccessDanhMucModuleRoute("DANH_MUC_ORG");
  if (!allowed) {
    return <QuanTriAccessDenied detail="Cần quyền xem Danh mục tổ chức (DANH_MUC_ORG) hoặc vai trò quản trị." />;
  }
  return <GenericDmMasterPage loaiDanhMuc={loai} backHref={TO_CHUC_PATH} />;
}
