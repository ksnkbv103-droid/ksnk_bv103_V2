import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdDongGoiRedirect() {
  redirect(CSSD_ROUTES.quyTrinh);
}
