# ADR — LOAI_NKBV Strategy B (lock + allowlist)

- **Date:** 2026-09-26 (+07)
- **Status:** Accepted (code); migrate TEXT+CHECK = deferred
- **Context:** User asked to safely «loại bỏ loại nkbv» open-MDM debt without breaking clinical BA.
- **Decision:** **B** under Strategy B (process=CODE, hospital vocab=MDM).
  - Keep `nkbv_dm_loai` view + FK `loai_nkbv_id` + BA gate resolve by row id.
  - Lock hub CRUD (`LOCKED_SYSTEM_LOOKUP_LOAI` + server reject).
  - Allowlist codes from `nkbv-loai-labels.ts` (`NKBV_MDM_CODE_CANDIDATES` ∪ LOAI_TRU/KHAC).
  - Labels/pathway SSOT remain CODE module; MDM rows = persistence ids only.
- **Rejected:**
  - **A:** DROP MDM / TEXT-only on case — high BA risk.
  - **C:** Leave open hub CRUD — arbitrary HAI types break checklist engines.
- **Consequences:** Admin cannot add FOOBAR types; clinical create/edit only allowlisted codes present in DB seed; Domain must seed/align CDC codes before new sites.
- **Follow-ups:** Prod seed audit; optional draft TEXT+CHECK only when write/BA rewritten together; W3c QLCV migrate still needs Nghĩa apply.
