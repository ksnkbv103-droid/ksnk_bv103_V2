import { OwnedLookupDetail, ownedLookupTitle } from "@/components/master-data/generic-dm/OwnedLookupPages";
import { TO_CHUC_PATH } from "@/lib/master-data/quan-tri-paths";
import type { Metadata } from "next";

type Props = { params: Promise<{ loai: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: ownedLookupTitle((await props.params).loai) };
}

/** AR-8e: chỉ nhận loại thuộc `DANH_MUC_ORG`; loại khác → 404. */
export default async function Page(props: Props) {
  return <OwnedLookupDetail loaiParam={(await props.params).loai} owner="DANH_MUC_ORG" backHref={TO_CHUC_PATH} />;
}
