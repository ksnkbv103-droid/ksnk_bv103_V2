import Link from "next/link";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { isToChucLookupType } from "@/lib/master-data/danh-muc-admin-routes";
import { DM_HUB_LABELS, getAllRegistryEntries } from "@/lib/master-data/domain-registry";
import {
  TO_CHUC_KHOA_PHONG_PATH,
  TO_CHUC_NHAN_SU_PATH,
  toChucDanhMucHref,
} from "@/lib/master-data/quan-tri-paths";

type Card = { href: string; title: string; blurb?: string };

/** AR-8e (PO 2026-11-11): hub module Tổ chức — khoa phòng, nhân sự, danh mục tổ chức. Sửa = ADMIN (kiểm ở action). */
export default function ToChucHubPage({
  flags,
}: {
  flags: { KHOA_PHONG: boolean; NHAN_SU: boolean; DANH_MUC_ORG: boolean };
}) {
  const main: Card[] = [
    flags.KHOA_PHONG && { href: TO_CHUC_KHOA_PHONG_PATH, title: "Khoa phòng", blurb: "Khoa, phòng, vị trí CDC." },
    flags.NHAN_SU && { href: TO_CHUC_NHAN_SU_PATH, title: "Nhân sự", blurb: "Hồ sơ nhân sự, khoa công tác." },
  ].filter(Boolean) as Card[];

  const lookups: Card[] = flags.DANH_MUC_ORG
    ? getAllRegistryEntries()
        .filter((e) => isToChucLookupType(e.loaiDanhMuc))
        .map((e) => ({ href: toChucDanhMucHref(e.loaiDanhMuc), title: DM_HUB_LABELS[e.loaiDanhMuc] || e.loaiDanhMuc }))
    : [];

  return (
    <div className="bv103-stack-page pb-12">
      <header>
        <h1 className={T.pageTitle}>Tổ chức</h1>
        <p className={T.pageSubtitle}>Khoa phòng, nhân sự và danh mục tổ chức dùng chung cho mọi module.</p>
      </header>
      {main.length > 0 && <CardGrid cards={main} />}
      {lookups.length > 0 && (
        <section className="space-y-[var(--bv103-space-2)]">
          <h2 className={T.sectionTitle}>Danh mục tổ chức</h2>
          <CardGrid cards={lookups} />
        </section>
      )}
    </div>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <ul className="grid gap-[var(--bv103-space-3)] sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="block rounded-[var(--radius-shell)] border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-[var(--primary)] touch-manipulation"
          >
            <span className={T.sectionTitle}>{c.title}</span>
            {c.blurb && <span className="mt-1 block text-sm text-slate-600">{c.blurb}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
