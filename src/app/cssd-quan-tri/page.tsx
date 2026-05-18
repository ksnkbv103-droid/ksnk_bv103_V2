import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdQuanTriRedirect() {
  redirect(CSSD_ROUTES.dungCu);
}
