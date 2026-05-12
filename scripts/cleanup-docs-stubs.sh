#!/usr/bin/env bash
set -euo pipefail

# Cleanup redirect stubs in docs/specs after due date.
# Default mode is dry-run. Use --execute to delete.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DO_EXECUTE=0
TODAY="${TODAY_OVERRIDE:-$(date +%F)}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)
      DO_EXECUTE=1
      shift
      ;;
    --today)
      TODAY="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: bash scripts/cleanup-docs-stubs.sh [--execute] [--today YYYY-MM-DD]"
      exit 1
      ;;
  esac
done

ENTRIES=(
  "2026-06-02|docs/specs/00-legacy-full-spec-monolith.md"
  "2026-06-02|docs/specs/AUDIT_REPORT_V6_1.md"
  "2026-06-02|docs/specs/DEVELOPMENT_DIRECTION_FROM_DATA.md"
  "2026-06-02|docs/specs/PREP0_IMPLEMENTATION_BASELINE.md"
  "2026-06-02|docs/specs/AUDIT_RESULT_QUAN_LY_DUNG_CU_2026-05-05.md"
  "2026-06-02|docs/specs/P4_GIAM_SAT_VST_EXPORT_REPORT.md"
  "2026-06-02|docs/specs/PHASE_1_1_FACT_READ_TEST_CHECKLIST.md"
  "2026-06-02|docs/specs/PHASE_1_2_FACT_READ_AUDIT.md"
  "2026-06-02|docs/specs/PHASE_2_FINAL_COMPAT_VIEW_CLEANUP_REPORT.md"
  "2026-06-02|docs/specs/PHASE_2_WAVE2_CSSD_RENAME_REPORT.md"
  "2026-06-02|docs/specs/PHASE_2_WAVE3_CSSD_RENAME_REPORT.md"
  "2026-06-02|docs/specs/PHASE_3_WAVE1_UNCLASSIFIED_RENAME_REPORT.md"
  "2026-06-02|docs/specs/PHASE_3_WAVE1_WAVE2_RUNTIME_CUTOVER_AND_CLEANUP_REPORT.md"
  "2026-06-02|docs/specs/PHASE_3_WAVE2_UNCLASSIFIED_RENAME_REPORT.md"
)

echo "Mode: $([[ $DO_EXECUTE -eq 1 ]] && echo EXECUTE || echo DRY-RUN)"
echo "Today: $TODAY"
echo

is_due() {
  local due="$1"
  [[ "$TODAY" > "$due" || "$TODAY" == "$due" ]]
}

is_stub_content() {
  local abs="$1"
  [[ -f "$abs" ]] || return 1
  local first_line
  first_line="$(sed -n '1p' "$abs")"
  [[ "$first_line" == "> Da chuyen sang "* ]]
}

for item in "${ENTRIES[@]}"; do
  due="${item%%|*}"
  rel="${item#*|}"
  abs="$ROOT_DIR/$rel"

  if ! is_due "$due"; then
    echo "[SKIP] not due yet: $rel (due $due)"
    continue
  fi

  if ! is_stub_content "$abs"; then
    echo "[SKIP] not a recognized stub or file missing: $rel"
    continue
  fi

  if [[ $DO_EXECUTE -eq 1 ]]; then
    rm -f "$abs"
    echo "[DEL ] $rel"
  else
    echo "[PLAN] would delete: $rel"
  fi
done
