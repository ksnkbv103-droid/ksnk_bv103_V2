import { describe, expect, it } from "vitest";
import {
  parseMaHoaChatFromMachineLabel,
  resolveDmHoaChatIdFromIncidentAttrs,
  resolveMaLoFromIncidentAttrs,
} from "./cssd-hoa-chat-su-co-resolve";

describe("cssd-hoa-chat-su-co-resolve", () => {
  it("parses ma from legacy label", () => {
    expect(parseMaHoaChatFromMachineLabel("HC01 - Dung dịch")).toBe("HC01");
  });

  it("reads uuid dm id from attrs", () => {
    const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    expect(resolveDmHoaChatIdFromIncidentAttrs({ MACHINE_ID: id })).toBe(id);
  });

  it("reads lot from ERROR_QR", () => {
    expect(resolveMaLoFromIncidentAttrs({ ERROR_QR: "L2024-A" })).toBe("L2024-A");
  });
});
