import { Suspense } from "react";
import EntityQrScanPage from "@/modules/entity-qr/views/EntityQrScanPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Quét QR truy vết | KSNK 103",
  description: "Quét mã QR trên phiếu in để mở lại bản ghi trong phần mềm",
};

export default function QrPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <EntityQrScanPage />
    </Suspense>
  );
}
