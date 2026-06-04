import { redirect } from "next/navigation";

/** Canonical history: tab on `/giam-sat-vst?tab=history`. */
export default function VSTHistoryRedirectPage() {
  redirect("/giam-sat-vst?tab=history");
}
