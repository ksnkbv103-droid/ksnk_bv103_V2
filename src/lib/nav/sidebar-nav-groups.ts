/**
 * SSOT menu sidebar — nhóm theo công việc (IA lớp 2).
 * @see docs/wiki/concepts.md#layout-primitives
 */

import {
  Activity,
  AlertTriangle,
  BarChart2,
  Box,
  ClipboardList,
  Clock,
  Droplets,
  FileBarChart,
  History,
  LayoutDashboard,
  PanelsTopLeft,
  Stethoscope,
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
  NAV_GATE_DASHBOARD,
  NAV_GATE_GSC,
  NAV_GATE_LICH_SU,
  NAV_GATE_NKBV,
  NAV_GATE_THONG_KE,
  NAV_GATE_VST,
  type NavGate,
} from "@/lib/nav/ksnk-nav-gates";

export type SidebarNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  gate: NavGate;
};

export type SidebarNavGroup = {
  id: string;
  label: string;
  items: SidebarNavItem[];
};

export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: "command",
    label: "Điều hành và báo cáo",
    items: [
      { name: "Trung tâm điều hành", href: "/", icon: LayoutDashboard, gate: NAV_GATE_DASHBOARD },
      { name: "Báo cáo tổng hợp KSNK", href: "/bao-cao-tong-hop", icon: FileBarChart, gate: NAV_GATE_DASHBOARD },
    ],
  },
  {
    id: "supervision",
    label: "Giám sát lâm sàng",
    items: [
      { name: "Trung tâm giám sát", href: "/giam-sat", icon: ClipboardList, gate: NAV_GATE_LICH_SU },
      { name: "Vệ sinh tay (WHO)", href: "/giam-sat-vst", icon: Stethoscope, gate: NAV_GATE_VST },
      { name: "Giám sát tuân thủ KSNK", href: "/giam-sat-chung", icon: ClipboardList, gate: NAV_GATE_GSC },
      { name: "Giám sát NKBV", href: "/giam-sat-nkbv", icon: Activity, gate: NAV_GATE_NKBV },
    ],
  },
  {
    id: "supervision-read",
    label: "Tra cứu giám sát",
    items: [
      { name: "Lịch sử giám sát", href: "/lich-su", icon: History, gate: NAV_GATE_LICH_SU },
      { name: "Thống kê giám sát", href: "/thong-ke", icon: BarChart2, gate: NAV_GATE_THONG_KE },
    ],
  },
  {
    id: "internal",
    label: "Vận hành nội bộ",
    items: [{ name: "Công việc", href: "/quan-ly-cong-viec", icon: PanelsTopLeft, gate: NAV_GATE_CONG_VIEC }],
  },
  {
    id: "cssd",
    label: "CSSD",
    items: [
      { name: "Quy trình xử lý dụng cụ", href: "/cssd-quy-trinh", icon: Clock, gate: NAV_GATE_CSSD_QUY_TRINH },
      { name: "Báo cáo sự cố", href: "/cssd-su-co", icon: AlertTriangle, gate: NAV_GATE_CSSD_SU_CO },
      { name: "Dụng cụ phẫu thuật", href: "/cssd-dung-cu", icon: Box, gate: NAV_GATE_CSSD_DUNG_CU },
      { name: "Thiết bị KSNK", href: "/cssd-thiet-bi", icon: Wrench, gate: NAV_GATE_CSSD_THIET_BI },
      { name: "Hóa chất và Vật tư", href: "/cssd-hoa-chat", icon: Droplets, gate: NAV_GATE_CSSD_HOA_CHAT },
    ],
  },
];
