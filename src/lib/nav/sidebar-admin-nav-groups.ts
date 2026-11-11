/**
 * Menu Sửa danh mục trên sidebar — một cổng hub (module-first).
 * IA khóa: Vận hành / Tra cứu (ops CSSD) · Sửa danh mục (Quản trị → Master).
 * Chi tiết (Tổ chức, Master CSSD, Bảng kiểm, Phân quyền, Tài khoản) chọn trong `/quan-tri-he-thong`.
 */
import { Building2, Settings, type LucideIcon } from "lucide-react";
import { NAV_GATE_QUAN_TRI, NAV_GATE_TO_CHUC, type NavGate } from "@/lib/nav/ksnk-nav-gates";

export type SidebarAdminItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  gate: NavGate;
};

export type SidebarAdminGroup = {
  id: string;
  label: string;
  items: SidebarAdminItem[];
};

export const SIDEBAR_ADMIN_GROUPS: SidebarAdminGroup[] = [
  {
    id: "qt-hub",
    label: "Quản trị",
    items: [
      {
        name: "Tổ chức",
        href: "/to-chuc",
        icon: Building2,
        gate: NAV_GATE_TO_CHUC,
      },
      {
        name: "Quản trị hệ thống",
        href: "/quan-tri-he-thong",
        icon: Settings,
        gate: NAV_GATE_QUAN_TRI,
      },
    ],
  },
];
