import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Báo cáo chính thức",
};

export default function BaoCaoTongHopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
