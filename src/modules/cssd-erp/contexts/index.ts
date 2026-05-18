/**
 * CSSD bounded-context entrypoints (progressive migration layer).
 * Code mới ưu tiên import từ đây thay vì xuyên nhiều thư mục.
 */
export * as CssdProcessingLifecycleContext from "./processing-lifecycle/entrypoint";
export * as CssdSterilizationBatchContext from "./sterilization-batch/entrypoint";
export * as CssdIncidentContext from "./incident/entrypoint";
export * as CssdSuCoContext from "@/modules/cssd-su-co/contexts/su-co/entrypoint";
export * as CssdMaintenanceContext from "./maintenance/entrypoint";
export * as CssdInventoryChemicalContext from "./inventory-chemical/entrypoint";
export * as CssdInstrumentInventoryContext from "./inventory-instrument/entrypoint";
export * as CssdInstrumentCatalogContext from "./instrument-catalog/entrypoint";
export * as CssdReportingContext from "./reporting/entrypoint";
