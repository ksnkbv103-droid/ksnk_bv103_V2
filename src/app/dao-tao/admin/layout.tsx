"use client";

import React from "react";
import { DaoTaoAdminAccessGate } from "@/modules/dao-tao/components/DaoTaoAdminAccessGate";

export default function DaoTaoAdminLayout({ children }: { children: React.ReactNode }) {
  return <DaoTaoAdminAccessGate>{children}</DaoTaoAdminAccessGate>;
}
