// src/app/giam-sat-chung/layout.tsx
"use client";

import React, { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useModulePermission } from "@/hooks/useModulePermission";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { resolveGscRouteChrome, type GscLoaiGiamSatRoute } from "@/modules/giam-sat-chung/lib/gsc-app-paths";

const MODULE_KEY = "GIAM_SAT_CHUNG";

/** Infer loaiGiamSat + basePath from current pathname. */
function inferFromPathname(pathname: string): { loai?: GscLoaiGiamSatRoute; basePath: string } {
  if (pathname.startsWith("/giam-sat-chung/tuan-thu")) return { loai: "TUAN_THU", basePath: "/giam-sat-chung/tuan-thu" };
  if (pathname.startsWith("/giam-sat-chung/nhat-ky")) return { loai: "NHAT_KY_VAN_HANH", basePath: "/giam-sat-chung/nhat-ky" };
  if (pathname.startsWith("/giam-sat-chung/he-thong")) return { loai: "DANH_GIA_HE_THONG", basePath: "/giam-sat-chung/he-thong" };
  return { basePath: "/giam-sat-chung" };
}

export default function GiamSatChungLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useModulePermission(MODULE_KEY);

  const { loai } = useMemo(() => inferFromPathname(pathname), [pathname]);
  const routeChrome = resolveGscRouteChrome(loai);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          eyebrow={routeChrome.eyebrow}
          description={routeChrome.description}
          title={
            <>
              {routeChrome.titlePlain}
              <span className="text-[var(--primary)]">{routeChrome.titleAccent}</span>
            </>
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
