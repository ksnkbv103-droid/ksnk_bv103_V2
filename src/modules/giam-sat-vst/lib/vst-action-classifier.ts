export function normalizeVstAction(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function classifyVstAction(value: string | null | undefined): {
  isMissed: boolean;
  isCompliant: boolean;
  isKnown: boolean;
} {
  const normalized = normalizeVstAction(value);
  if (!normalized) return { isMissed: false, isCompliant: false, isKnown: false };

  const isMissed = normalized === "bo sot";
  const isCompliant = normalized === "rua tay bang nuoc" || normalized === "cha tay bang con";
  return { isMissed, isCompliant, isKnown: isMissed || isCompliant };
}
