// src/modules/giam-sat-vst/components/HistoryLoader.tsx
"use client";

import React from "react";
import HistoryTable from "./HistoryTable";

/**
 * HistoryLoader đơn giản hóa: HistoryTable tự quản lý fetch thông qua
 * useServerPaginatedTable, không cần pre-load toàn bộ sessions nữa.
 */
export default function HistoryLoader({
  onEditSessionId,
}: {
  onEditSessionId?: (sessionId: string) => void;
}) {
  return <HistoryTable onEditSessionId={onEditSessionId} />;
}
