import { describe, expect, it } from "vitest";
import {
  coerceInstrumentFormTypeId,
  defaultCauseClass,
  INCIDENT_TYPE_PRESETS,
  instrumentFormTypeOptions,
  isAccountabilityCause,
  isBatchQcFailTypeId,
  resolveInstrumentFormSubmitTypeId,
} from "./cssd-incident-taxonomy";
import {
  INSTRUMENT_MOVE_TYPE_ID,
  INSTRUMENT_PHYSICAL_DOOR_ID,
  SET_RECONCILE_TYPE_ID,
} from "@/lib/domain/cssd-set-reconcile";

describe("cssd-incident-taxonomy", () => {
  it("defaults cause by group", () => {
    expect(defaultCauseClass("EQUIPMENT")).toBe("SC_HE_THONG");
    expect(defaultCauseClass("CHEMICAL")).toBe("SC_HE_THONG");
    expect(defaultCauseClass("PROCESS")).toBe("SC_QUY_TRINH");
    expect(defaultCauseClass("INSTRUMENT")).toBe("SC_QUY_TRINH");
  });

  it("accountability excludes system cause and empty", () => {
    expect(isAccountabilityCause("SC_CHU_QUAN")).toBe(true);
    expect(isAccountabilityCause("SC_QUY_TRINH")).toBe(true);
    expect(isAccountabilityCause("SC_HE_THONG")).toBe(false);
    expect(isAccountabilityCause("")).toBe(false);
  });

  it("coerces legacy instrument types to 3 form doors", () => {
    expect(coerceInstrumentFormTypeId("INSTRUMENT_BROKEN")).toBe(INSTRUMENT_PHYSICAL_DOOR_ID);
    expect(coerceInstrumentFormTypeId("INSTRUMENT_MISSING")).toBe(INSTRUMENT_PHYSICAL_DOOR_ID);
    expect(coerceInstrumentFormTypeId("INSTRUMENT_TRANSFER")).toBe(INSTRUMENT_MOVE_TYPE_ID);
    expect(coerceInstrumentFormTypeId("INSTRUMENT_REPLENISH")).toBe(INSTRUMENT_MOVE_TYPE_ID);
    expect(coerceInstrumentFormTypeId("INSTRUMENT_MOVE")).toBe(INSTRUMENT_MOVE_TYPE_ID);
    expect(coerceInstrumentFormTypeId(SET_RECONCILE_TYPE_ID)).toBe(SET_RECONCILE_TYPE_ID);
  });

  it("form options expose only 3 doors", () => {
    expect(instrumentFormTypeOptions().map((x) => x.code)).toEqual([
      SET_RECONCILE_TYPE_ID,
      INSTRUMENT_PHYSICAL_DOOR_ID,
      INSTRUMENT_MOVE_TYPE_ID,
    ]);
    expect(INCIDENT_TYPE_PRESETS.INSTRUMENT.map((x) => x.code)).toEqual([
      SET_RECONCILE_TYPE_ID,
      INSTRUMENT_PHYSICAL_DOOR_ID,
      INSTRUMENT_MOVE_TYPE_ID,
    ]);
  });

  it("physical door submits as SET_RECONCILE", () => {
    expect(resolveInstrumentFormSubmitTypeId(INSTRUMENT_PHYSICAL_DOOR_ID)).toBe(SET_RECONCILE_TYPE_ID);
    expect(resolveInstrumentFormSubmitTypeId("INSTRUMENT_BROKEN")).toBe(SET_RECONCILE_TYPE_ID);
  });

  it("batch QC fail types are distinct from station QC", () => {
    expect(isBatchQcFailTypeId("PROCESS_STERILIZATION_FAIL")).toBe(true);
    expect(isBatchQcFailTypeId("PROCESS_STERILE_QC_FAIL")).toBe(true);
    expect(isBatchQcFailTypeId("PROCESS_BI_POSITIVE")).toBe(true);
    expect(isBatchQcFailTypeId("PROCESS_QC_FAIL")).toBe(false);
  });
});
