// src/modules/giam-sat-vst/views/VSTFormView.tsx
"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import VSTForm from "../components/VSTForm";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { VstModuleAccessGate } from "../components/VstModuleAccessGate";
import { getVSTSessionDetail } from "../actions/vst-read.actions";
import { assertCanEditVSTSession } from "../actions/vst-write-delete.actions";

/**
 * View chỉ chứa form giám sát VST.
 * Có thể nhận `editSessionId` từ URL param để mở chế độ sửa.
 */
export default function VSTFormView({ editSessionId }: { editSessionId?: string | null }) {
  const router = useRouter();
  const [editVstSourceSessionId, setEditVstSourceSessionId] = useState<string | null>(
    editSessionId ?? null,
  );
  const [editVstDetail, setEditVstDetail] = useState<{
    session: Record<string, unknown>;
    observations: Array<Record<string, unknown>>;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(Boolean(editSessionId));

  useEffect(() => {
    if (!editSessionId) {
      setEditLoading(false);
      setEditVstSourceSessionId(null);
      setEditVstDetail(null);
      return;
    }

    let cancelled = false;
    setEditLoading(true);
    setEditVstSourceSessionId(editSessionId);
    setEditVstDetail(null);

    (async () => {
      const can = await assertCanEditVSTSession(editSessionId);
      if (cancelled) return;
      if (!can.success) {
        toast.error(can.error);
        setEditVstSourceSessionId(null);
        setEditLoading(false);
        return;
      }
      const detail = await getVSTSessionDetail(editSessionId);
      if (cancelled) return;
      if (!detail.success) {
        toast.error(detail.error);
        setEditVstSourceSessionId(null);
        setEditLoading(false);
        return;
      }
      setEditVstDetail({
        session: detail.session as Record<string, unknown>,
        observations: (detail.observations || []) as Array<Record<string, unknown>>,
      });
      setEditLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [editSessionId]);

  if (editLoading) {
    return (
      <VstModuleAccessGate requireCreate>
        <KsnkSupervisionPanel className={`min-h-[50vh] ${UI.sectionGap}`}>
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          <p className={`animate-pulse ${UI.emptyBody}`}>Đang tải phiên giám sát…</p>
        </div>
      </KsnkSupervisionPanel>
      </VstModuleAccessGate>
    );
  }

  return (
    <VstModuleAccessGate requireCreate>
      <KsnkSupervisionPanel className={`min-h-[50vh] ${UI.sectionGap}`}>
      <VSTForm
        editDetail={editVstDetail}
        editingSessionId={editVstSourceSessionId}
        onSuccess={() => {
          setEditVstSourceSessionId(null);
          setEditVstDetail(null);
          router.push("/lich-su/vst");
        }}
      />
    </KsnkSupervisionPanel>
    </VstModuleAccessGate>
  );
}
