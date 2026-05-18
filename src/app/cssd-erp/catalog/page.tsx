import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdCatalogRedirect() {
  redirect(CSSD_ROUTES.dungCu);
}
