// src/modules/giam-sat-vst/views/VSTFormView.tsx
"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import VSTForm from "../components/VSTForm";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
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
  const loadedRef = useRef(false);

  // Load edit detail khi có editSessionId
  useEffect(() => {
    if (!editSessionId || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const can = await assertCanEditVSTSession(editSessionId);
      if (!can.success) {
        toast.error(can.error);
        setEditVstSourceSessionId(null);
        return;
      }
      const detail = await getVSTSessionDetail(editSessionId);
      if (!detail.success) {
        toast.error(detail.error);
        setEditVstSourceSessionId(null);
        return;
      }
      setEditVstDetail({
        session: detail.session as Record<string, unknown>,
        observations: (detail.observations || []) as Array<Record<string, unknown>>,
      });
    })();
  }, [editSessionId]);

  return (
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
  );
}
