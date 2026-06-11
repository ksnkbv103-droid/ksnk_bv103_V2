#!/usr/bin/env node
/** Thêm import chrome vào panel/form/modal thiếu gate. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const FIXES = [
  ["src/modules/cssd-erp/components/bao-tri/bao-tri-active-panel.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/bao-tri/bao-tri-start-modal.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/batch/me-tiet-khuan-process-qc-panel.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/batch/me-tiet-khuan-process-scan-panel.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/batch/me-tiet-khuan-waiting-panel.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/inventory/InventoryIssueModal.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/inventory/SetMembersModal.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-erp/components/workflow/DigitalChecklistPanel.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/cssd-su-co/components/IncidentReportModal.tsx", 'import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";'],
  ["src/modules/giam-sat-chung/views/GscFormView.tsx", 'import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";'],
  ["src/modules/giam-sat-nkbv/components/NkbvAdjudicationPanel.tsx", 'import { nkbvFormChrome as UI } from "@/modules/giam-sat-nkbv/lib/nkbv-form-chrome";'],
  ["src/modules/giam-sat-vst/components/VstStrategicAnalyticsPanel.tsx", 'import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";'],
  ["src/modules/giam-sat-vst/views/VSTFormView.tsx", 'import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";'],
  ["src/modules/quan-ly-cong-viec/components/QlcvChecklistPanel.tsx", 'import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";'],
  ["src/modules/quan-ly-cong-viec/components/QlcvDinhKyPanel.tsx", 'import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";'],
  ["src/modules/quan-tri-he-thong/components/MasterDataImportExportModal.tsx", 'import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";'],
  ["src/modules/quan-tri-he-thong/components/MdmSuggestionApproveModal.tsx", 'import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";'],
  ["src/modules/quan-tri-he-thong/danh-muc/dung-cu/loai-dung-cu-chi-tiet-panel.tsx", 'import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";'],
  ["src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatStatsPanel.tsx", 'import { dashboardChrome as UI } from "@/modules/dashboard/lib/dashboard-chrome";'],
];

for (const [rel, imp] of FIXES) {
  const path = join(ROOT, rel);
  let text = readFileSync(path, "utf8");
  if (text.includes(imp.split(" as ")[0])) continue;
  const useIdx = text.indexOf('"use client"');
  if (useIdx >= 0) {
    const lineEnd = text.indexOf("\n", useIdx);
    text = `${text.slice(0, lineEnd + 1)}\n${imp}\n${text.slice(lineEnd + 1)}`;
  } else {
    text = `${imp}\n${text}`;
  }
  writeFileSync(path, text);
  console.log(`[add-import] ${rel}`);
}
