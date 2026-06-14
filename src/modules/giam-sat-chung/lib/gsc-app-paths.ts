/** App Router paths — revalidate sau mutation GSC. */
export const GSC_APP_PATHS = [
  "/giam-sat-chung",
  "/giam-sat-chung/tuan-thu",
  "/giam-sat-chung/nhat-ky",
  "/giam-sat-chung/he-thong",
] as const;

export type GscLoaiGiamSatRoute = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG";

export type GscRouteChrome = {
  eyebrow: string;
  titlePlain: string;
  titleAccent: string;
  description: string;
  href: string;
};

export const GSC_ROUTE_CHROME: Record<GscLoaiGiamSatRoute | "ALL", GscRouteChrome> = {
  ALL: {
    eyebrow: "Bảng kiểm theo bộ quy chuẩn thực hành kiểm soát nhiễm khuẩn",
    titlePlain: "Giám sát ",
    titleAccent: "tổng hợp",
    description: "Form giám sát, lịch sử phiên và thống kê tuân thủ KSNK.",
    href: "/giam-sat-chung",
  },
  TUAN_THU: {
    eyebrow: "Mạng lưới KSNK · Tuân thủ thực hành",
    titlePlain: "Giám sát ",
    titleAccent: "tuân thủ thực hành",
    description: "Quan sát hành vi NVYT theo bảng kiểm động (TY_LE, Care bundle, Đạt/Không đạt).",
    href: "/giam-sat-chung/tuan-thu",
  },
  NHAT_KY_VAN_HANH: {
    eyebrow: "Vận hành thiết bị & môi trường",
    titlePlain: "Nhật ký ",
    titleAccent: "vận hành",
    description: "Ghi số liệu thiết bị/môi trường — không tính % tuân thủ, cảnh báo ngoài ngưỡng.",
    href: "/giam-sat-chung/nhat-ky",
  },
  DANH_GIA_HE_THONG: {
    eyebrow: "Thanh tra nội bộ · JCI/APSIC",
    titlePlain: "Đánh giá ",
    titleAccent: "hệ thống",
    description: "Review SOP/policy và đánh giá hệ thống KSNK nội bộ.",
    href: "/giam-sat-chung/he-thong",
  },
};

export function resolveGscRouteChrome(initialLoaiGiamSat?: GscLoaiGiamSatRoute): GscRouteChrome {
  if (!initialLoaiGiamSat) return GSC_ROUTE_CHROME.ALL;
  return GSC_ROUTE_CHROME[initialLoaiGiamSat];
}

/** Đường dẫn form GSC theo loại giám sát của bảng kiểm. */
export function gscFormHrefForLoaiGiamSat(loai: string | null | undefined): string {
  const key = String(loai ?? "").trim() as GscLoaiGiamSatRoute;
  if (key === "TUAN_THU" || key === "NHAT_KY_VAN_HANH" || key === "DANH_GIA_HE_THONG") {
    return GSC_ROUTE_CHROME[key].href;
  }
  return GSC_ROUTE_CHROME.TUAN_THU.href;
}
