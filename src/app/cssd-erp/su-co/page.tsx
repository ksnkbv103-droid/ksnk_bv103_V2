import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdErpSuCoRedirect() {
  redirect(CSSD_ROUTES.suCo);
}
