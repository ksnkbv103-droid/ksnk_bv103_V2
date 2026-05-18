import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdKhoHoaChatRedirect() {
  redirect(CSSD_ROUTES.hoaChat);
}
