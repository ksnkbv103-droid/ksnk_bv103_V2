import { redirect } from "next/navigation";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export default function LegacyCssdInventoryRedirect() {
  redirect(`${CSSD_ROUTES.quyTrinh}?tab=kho`);
}
