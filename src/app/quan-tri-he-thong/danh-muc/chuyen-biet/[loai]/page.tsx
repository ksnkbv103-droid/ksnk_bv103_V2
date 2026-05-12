import GenericDmMasterPage from "@/modules/quan-tri-he-thong/danh-muc/views/GenericDmMasterPage";
import { Metadata } from "next";

export async function generateMetadata(props: {
  params: Promise<{ loai: string }>;
}): Promise<Metadata> {
  const { loai } = await props.params;
  return {
    title: `Danh mục ${decodeURIComponent(loai)} | Quản trị | KSNK BV103`,
    description: "Quản lý danh mục master dm_* theo registry",
  };
}

export default async function Page(props: { params: Promise<{ loai: string }> }) {
  const { loai } = await props.params;
  return <GenericDmMasterPage loaiDanhMuc={decodeURIComponent(loai)} />;
}
