#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs/specs"

if [[ ! -d "$DOCS_DIR" ]]; then
  echo "ERROR: docs directory not found: $DOCS_DIR"
  exit 2
fi

python3 - <<'PY'
from pathlib import Path
import re
import sys

docs_dir = Path("docs/specs").resolve()
pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
broken = []

for file_path in docs_dir.rglob("*.md"):
    text = file_path.read_text(encoding="utf-8")
    for match in pattern.finditer(text):
        link = match.group(1).strip()
        if link.startswith("http://") or link.startswith("https://") or link.startswith("#"):
            continue
        target = (file_path.parent / link).resolve()
        if not target.exists():
            broken.append((str(file_path.relative_to(docs_dir)), link))

if broken:
    print("BROKEN DOC LINKS:")
    for rel_file, link in broken:
        print(f"- {rel_file} -> {link}")
    print(f"\nRESULT: FAIL ({len(broken)} broken links)")
    sys.exit(1)

print("RESULT: PASS (0 broken links)")
PY
