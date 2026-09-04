/**
 * SSOT menu sidebar — module-first (IA lớp 2).
 * Sidebar = cổng vào module/workspace. CSSD: chuyển màn chỉ qua sidebar (không ModeNav trùng).
 * Giám sát: mục sidebar «Giám sát» → hub `/giam-sat`; nếu user chỉ 1 đích ghi (VST|GSC|NKBV) thì deep-link form (SXHD).
 * Lịch sử/Thống kê VST·GSC: ModeNav trong module giám sát hoặc `/lich-su/*` `/thong-ke/*`.
 * @see docs/wiki/concepts.md#layout-primitives
 * @see docs/reference/architecture/simplification-program-20260726.md
 */

import {
  AlertTriangle,
  Box,
  Clock,
  Droplets,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  PanelsTopLeft,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  NAV_GATE_CONG_VIEC,
  NAV_GATE_CSSD_DUNG_CU,
  NAV_GATE_CSSD_HOA_CHAT,
  NAV_GATE_CSSD_QUY_TRINH,
  NAV_GATE_CSSD_SU_CO,
  NAV_GATE_CSSD_THIET_BI,
  NAV_GATE_DAO_TAO,
  NAV_GATE_DASHBOARD,
  NAV_GATE_GIAM_SAT_HUB,
  type NavGate,
} from "@/lib/nav/ksnk-nav-gates";

export type SidebarNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  gate: NavGate;
  /** Khớp verifyCommandCenterShell — cần widget CC + nguồn giám sát. */
  requireCommandCenterShell?: boolean;
};

export type SidebarNavGroup = {
  id: string;
  label: string;
  items: SidebarNavItem[];
};

export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: "command",
    label: "Điều hành KSNK",
    items: [
      { name: "Tổng quan KSNK", href: "/", icon: LayoutDashboard, gate: NAV_GATE_DASHBOARD, requireCommandCenterShell: true },
      { name: "Báo cáo chính thức", href: "/bao-cao-tong-hop", icon: FileBarChart, gate: NAV_GATE_DASHBOARD, requireCommandCenterShell: true },
    ],
  },
  {
    id: "supervision",
    label: "Giám sát",
    items: [
      { name: "Giám sát", href: "/giam-sat", icon: ShieldCheck, gate: NAV_GATE_GIAM_SAT_HUB },
    ],
  },
  {
    id: "internal",
    label: "Vận hành nội bộ",
    items: [
      { name: "Công việc", href: "/quan-ly-cong-viec", icon: PanelsTopLeft, gate: NAV_GATE_CONG_VIEC },
      { name: "Thi KSNK", href: "/dao-tao", icon: GraduationCap, gate: NAV_GATE_DAO_TAO },
    ],
  },
  {
    id: "cssd-ops",
    label: "CSSD · Vận hành",
    items: [
      { name: "Quy trình", href: "/cssd-quy-trinh", icon: Clock, gate: NAV_GATE_CSSD_QUY_TRINH },
      { name: "Sự cố", href: "/cssd-su-co", icon: AlertTriangle, gate: NAV_GATE_CSSD_SU_CO },
    ],
  },
  {
    id: "cssd-catalog",
    label: "CSSD · Tra cứu",
    items: [
      { name: "Dụng cụ", href: "/cssd-dung-cu", icon: Box, gate: NAV_GATE_CSSD_DUNG_CU },
      { name: "Thiết bị", href: "/cssd-thiet-bi", icon: Wrench, gate: NAV_GATE_CSSD_THIET_BI },
      { name: "Hóa chất", href: "/cssd-hoa-chat", icon: Droplets, gate: NAV_GATE_CSSD_HOA_CHAT },
    ],
  },
];
