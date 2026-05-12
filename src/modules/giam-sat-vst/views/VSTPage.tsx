// src/modules/giam-sat-vst/views/VSTPage.tsx
"use client";

import React, { useMemo, useState } from "react";
import { FileText, History } from "lucide-react";
import VSTForm from "../components/VSTForm";
import HistoryLoader from "../components/HistoryLoader";
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

const MODULE_KEY = "GIAM_SAT_VST";

export default function VSTPage() {
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [editVstSourceSessionId, setEditVstSourceSessionId] = useState<string | null>(null);
  const [editVstDetail, setEditVstDetail] = useState<{
    session: Record<string, unknown>;
    observations: Array<Record<string, unknown>>;
  } | null>(null);
  const { loading, allowed } = useModulePermission(MODULE_KEY);
  const showTabs = allowed.view;

  const supervisionTabs = useMemo((): SupervisionTabDef[] => {
    const core: SupervisionTabDef[] = [{ id: "form", label: "Form giám sát", icon: FileText }];
    if (!showTabs) return core;
    return [...core, { id: "history", label: "Lịch sử phiên", icon: History }];
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
              const next = id as typeof activeTab;
              setActiveTab(next);
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
            <HistoryLoader onEditSessionId={handleEditSession} />
          </div>
        )}
      </KsnkSupervisionPanel>
    </div>
  );
}
