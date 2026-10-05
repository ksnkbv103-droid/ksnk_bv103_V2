import type { ReactNode } from "react";
import GiamSatVstChrome from "./giam-sat-vst-chrome";

export const metadata = { title: "Vệ sinh tay" };

export default function GiamSatVstLayout({ children }: { children: ReactNode }) {
  return <GiamSatVstChrome>{children}</GiamSatVstChrome>;
}
