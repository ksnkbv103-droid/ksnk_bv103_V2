import { getToChucViewFlags } from "@/lib/auth/quan-tri-access";
import ToChucHubPage from "@/modules/to-chuc/views/ToChucHubPage";

export default async function Page() {
  return <ToChucHubPage flags={await getToChucViewFlags()} />;
}
