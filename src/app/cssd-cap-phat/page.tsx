import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdCapPhatRedirect() {
  redirect(CSSD_ROUTES.quyTrinh);
}
