import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdBaoTriRedirect() {
  redirect(`${CSSD_ROUTES.thietBi}?tab=maintenance`);
}
