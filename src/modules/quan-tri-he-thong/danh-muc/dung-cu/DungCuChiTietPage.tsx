"use client";

import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import { DungCuChiTietPageContent } from "./dung-cu-chi-tiet-page-content";

export default function DungCuChiTietPage() {
  return (
    <DmMasterPageGuard moduleKey="DC_LE" label="Danh mục Dụng cụ chi tiết">
      <DungCuChiTietPageContent />
    </DmMasterPageGuard>
  );
}
