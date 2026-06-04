// src/modules/giam-sat-vst/views/VSTPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart2, FileText, History } from "lucide-react";
import VSTForm from "../components/VSTForm";
import HistoryTable from "../components/HistoryTable";
import { useVstAnalyticsData } from "../hooks/use-vst-analytics-data";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { getVSTSessionDetail } from "../actions/vst-read.actions";
import {
  KsnkSupervisionHero,
  KsnkSupervisionPanel,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { assertCanEditVSTSession } from "../actions/vst-write-delete.actions";
import { parseSupervisionTab, type SupervisionTabId } from "@/lib/analytics/supervision-deep-link";

const VstStrategicAnalyticsPanel = dynamic(() => import("../components/VstStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-50" />,
});

const MODULE_KEY = "GIAM_SAT_VST";

function VstAnalyticsTab() {
  const d = useVstAnalyticsData();
  if (!d.initDone) return <SupervisionPageSkeleton />;
  return (
    <VstStrategicAnalyticsPanel
      tuNgay={d.tuNgay}
      setTuNgay={d.setTuNgay}
      denNgay={d.denNgay}
      setDenNgay={d.setDenNgay}
      khoiOptions={d.khoiOptions}
      selectedKhoiIds={d.selectedKhoiIds}
      setSelectedKhoiIds={d.setSelectedKhoiIds}
      khoaOptions={d.khoaOptions}
      selectedKhoaIds={d.selectedKhoaIds}
      setSelectedKhoaIds={d.setSelectedKhoaIds}
      ngheOptions={d.ngheOptions}
      selectedNgheIds={d.selectedNgheIds}
      setSelectedNgheIds={d.setSelectedNgheIds}
      khuVucOptions={d.khuVucOptions}
      selectedKhuVucIds={d.selectedKhuVucIds}
      setSelectedKhuVucIds={d.setSelectedKhuVucIds}
      selectedHinhThucIds={d.selectedHinhThucIds}
      setSelectedHinhThucIds={d.setSelectedHinhThucIds}
      payload={d.payload}
      loading={d.loading}
      loadError={d.loadError}
      onRefresh={() => void d.loadAnalytics()}
    />
  );
}

export default function VSTPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SupervisionTabId>(() => parseSupervisionTab(searchParams.get("tab")));
  const [editVstSourceSessionId, setEditVstSourceSessionId] = useState<string | null>(null);
  const [editVstDetail, setEditVstDetail] = useState<{
    session: Record<string, unknown>;
    observations: Array<Record<string, unknown>>;
  } | null>(null);
  const { loading, allowed } = useModulePermission(MODULE_KEY);
  const showTabs = allowed.view;

  useEffect(() => {
    const fromUrl = parseSupervisionTab(searchParams.get("tab"));
    setActiveTab((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  const supervisionTabs = useMemo((): SupervisionTabDef[] => {
    const core: SupervisionTabDef[] = [{ id: "form", label: "Form giám sát", icon: FileText }];
    if (!showTabs) return core;
    return [
      ...core,
      { id: "analytics", label: "Thống kê", icon: BarChart2 },
      { id: "history", label: "Lịch sử phiên", icon: History },
    ];
  }, [showTabs]);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  const handleEditSession = async (sessionId: string) => {
    const id = String(sessionId || "").trim();
    if (!id) return;

    const can = await assertCanEditVSTSession(id);
    if (!can.success) {
      toast.error(can.error);
      return;
    }

    const detail = await getVSTSessionDetail(id);
    if (!detail.success) {
      toast.error(detail.error);
      return;
    }

    setEditVstSourceSessionId(id);
    setEditVstDetail({
      session: detail.session as Record<string, unknown>,
      observations: (detail.observations || []) as Array<Record<string, unknown>>,
    });
    setActiveTab("form");
  };

  return (
    <div className="space-y-6 pb-12">
      <KsnkSupervisionHero
        eyebrow="Giám sát thực hành"
        title={
          <>
            Vệ sinh tay <span className="text-[var(--primary)]">(WHO)</span>
          </>
        }
        trailing={
          <KsnkSupervisionTabList
            tabs={supervisionTabs}
            activeId={activeTab}
            onChange={(id) => {
              const next = id as SupervisionTabId;
              setActiveTab(next);
              router.replace(`/giam-sat-vst?tab=${next}`, { scroll: false });
              if (next === "history") {
                setEditVstSourceSessionId(null);
                setEditVstDetail(null);
              }
            }}
            ariaLabel="Giám sát vệ sinh tay"
          />
        }
      />

      <KsnkSupervisionPanel className="min-h-[50vh]">
        {activeTab === "form" && (
          <VSTForm
            editDetail={editVstDetail}
            editingSessionId={editVstSourceSessionId}
            onSuccess={() => {
              setEditVstSourceSessionId(null);
              setEditVstDetail(null);
              setActiveTab("history");
            }}
          />
        )}

        {activeTab === "history" && showTabs && (
          <div className="app-data-shell overflow-hidden p-2">
            <HistoryTable onEditSessionId={handleEditSession} />
          </div>
        )}

        {activeTab === "analytics" && showTabs && <VstAnalyticsTab />}
      </KsnkSupervisionPanel>
    </div>
  );
}
