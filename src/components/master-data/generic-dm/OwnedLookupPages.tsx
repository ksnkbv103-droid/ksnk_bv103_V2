import Link from "next/link";
import { notFound } from "next/navigation";
import GenericDmMasterPage from "@/components/master-data/generic-dm/GenericDmMasterPage";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import {
  getDanhMucOwnerKey,
  getOwnedDanhMucHref,
  type DanhMucOwnerKey,
} from "@/lib/master-data/danh-muc-admin-routes";
import { DM_HUB_LABELS, getAllRegistryEntries } from "@/lib/master-data/domain-registry";

/** Chuẩn hóa `[loai]` từ URL (decode + trim + HOA). */
export function normalizeLoaiParam(raw: string): string {
  return decodeURIComponent(raw).trim().toUpperCase();
}

export function ownedLookupTitle(raw: string): string {
  const loai = normalizeLoaiParam(raw);
  return DM_HUB_LABELS[loai] || `Danh mục ${loai}`;
}

/**
 * AR-8e/8f: trang một danh mục trong module sở hữu. Loại của miền khác → 404.
 * Xem = quyền khóa danh mục của miền; ghi = ADMIN (grant + kiểm ở action).
 */
export async function OwnedLookupDetail({
  loaiParam,
  owner,
  backHref,
}: {
  loaiParam: string;
  owner: DanhMucOwnerKey;
  backHref: string;
}) {
  const loai = normalizeLoaiParam(loaiParam);
  if (getDanhMucOwnerKey(loai) !== owner) notFound();
  if (!(await canAccessDanhMucModuleRoute(owner))) {
    return <QuanTriAccessDenied detail={`Cần quyền xem danh mục (${owner}) hoặc vai trò quản trị.`} />;
  }
  return <GenericDmMasterPage loaiDanhMuc={loai} backHref={backHref} />;
}

/** Danh sách các danh mục thuộc một miền (trang index `/…/danh-muc`). */
export async function OwnedLookupIndex({
  owner,
  title,
  subtitle,
}: {
  owner: DanhMucOwnerKey;
  title: string;
  subtitle: string;
}) {
  if (!(await canAccessDanhMucModuleRoute(owner))) {
    return <QuanTriAccessDenied detail={`Cần quyền xem danh mục (${owner}) hoặc vai trò quản trị.`} />;
  }
  const items = getAllRegistryEntries()
    .map((e) => ({ href: getOwnedDanhMucHref(e.loaiDanhMuc, owner), title: DM_HUB_LABELS[e.loaiDanhMuc] || e.loaiDanhMuc }))
    .filter((c): c is { href: string; title: string } => c.href != null);

  return (
    <div className="bv103-stack-page pb-12">
      <header>
        <h1 className={T.pageTitle}>{title}</h1>
        <p className={T.pageSubtitle}>{subtitle}</p>
      </header>
      <ul className="grid gap-[var(--bv103-space-3)] sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-[var(--radius-shell)] border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-[var(--primary)] touch-manipulation"
            >
              <span className={T.sectionTitle}>{c.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
