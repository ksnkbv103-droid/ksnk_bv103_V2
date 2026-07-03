/**
 * Menu con nhóm Quản trị — shortcut ≤2 click tới danh mục thường dùng.
 */
import { Building2, ClipboardList, Layers, Settings, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { quanTriDungCuHref, quanTriHubHref } from "@/lib/master-data/quan-tri-paths";
import {
  NAV_GATE_DM_HUB,
  NAV_GATE_QUAN_TRI,
  type NavGate,
} from "@/lib/nav/ksnk-nav-gates";

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
    id: "qt-to-chuc",
    label: "Tổ chức",
    items: [
      {
        name: "Khoa phòng",
        href: "/quan-tri-he-thong/danh-muc/khoa-phong",
        icon: Building2,
        gate: { id: "adm-khoa", moduleKeys: ["KHOA_PHONG", "DANH_MUC"] },
      },
      {
        name: "Nhân sự",
        href: "/quan-tri-he-thong/nhan-su",
        icon: Users,
        gate: { id: "adm-ns", moduleKeys: ["NHAN_SU"] },
      },
    ],
  },
  {
    id: "qt-cssd",
    label: "Master CSSD",
    items: [
      {
        name: "Dụng cụ (Loại/Bộ/CT)",
        href: quanTriDungCuHref("loai"),
        icon: Layers,
        gate: { id: "adm-dc", moduleKeys: ["LOAI_DC", "BO_DC", "DC_LE", "DANH_MUC"] },
      },
      {
        name: "Thiết bị",
        href: "/quan-tri-he-thong/danh-muc/thiet-bi",
        icon: Settings,
        gate: { id: "adm-tb", moduleKeys: ["THIET_BI", "DANH_MUC"] },
      },
      {
        name: "Hóa chất",
        href: "/quan-tri-he-thong/danh-muc/hoa-chat",
        icon: Layers,
        gate: { id: "adm-hc", moduleKeys: ["HOA_CHAT", "DANH_MUC"] },
      },
    ],
  },
  {
    id: "qt-gstt",
    label: "Master giám sát",
    items: [
      {
        name: "Bảng kiểm",
        href: "/quan-tri-he-thong/bang-kiem",
        icon: ClipboardList,
        gate: { id: "adm-bk", moduleKeys: ["BANG_KIEM", "DANH_MUC"] },
      },
    ],
  },
  {
    id: "qt-he-thong",
    label: "Hệ thống",
    items: [
      {
        name: "Trung tâm danh mục",
        href: "/quan-tri-he-thong",
        icon: Settings,
        gate: NAV_GATE_QUAN_TRI,
      },
      {
        name: "Lookup danh mục",
        href: "/quan-tri-he-thong?tab=dm_registry",
        icon: Shield,
        gate: NAV_GATE_DM_HUB,
      },
      {
        name: "Phân quyền",
        href: quanTriHubHref("PHAN_QUYEN"),
        icon: Shield,
        gate: { id: "adm-rbac", moduleKeys: ["PHAN_QUYEN"] },
      },
    ],
  },
];
