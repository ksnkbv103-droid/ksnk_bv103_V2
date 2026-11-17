import { OwnedLookupDetail, ownedLookupTitle } from "@/components/master-data/generic-dm/OwnedLookupPages";
import { GSC_DANH_MUC_PATH } from "@/lib/master-data/quan-tri-paths";
import type { Metadata } from "next";

type Props = { params: Promise<{ loai: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: ownedLookupTitle((await props.params).loai) };
}

/** AR-8f: chỉ nhận loại thuộc `GIAM_SAT_CHUNG`; loại khác → 404. */
export default async function Page(props: Props) {
  return <OwnedLookupDetail loaiParam={(await props.params).loai} owner="GIAM_SAT_CHUNG" backHref={GSC_DANH_MUC_PATH} />;
}
