# Changelog

## [Unreleased]

### Changed
- **Documentation Restructuring (2026-05-19)**: Major cleanup and standardization of documentation structure.
  - Created `docs/README.md` as central documentation index.
  - Introduced clear folders: `architecture/`, `guides/`, `operations/`, `internal/`, `handover/`.
  - Moved and consolidated planning documents (`MASTER_COMPLETION_PLAN.md`, `PROGRESS_REPORT.md`).
  - Deprecated redundant root-level Markdown files (`CLAUDE.md`, `MASTER_COMPLETION_PLAN.md`, `PROGRESS_REPORT.md`).
  - Updated main `README.md` with new documentation navigation.
  - Improved long-term maintainability and discoverability of docs.

### Added
- Full Documentation & Architecture Diagram (Critical #4)
- Observability & Structured Logging (Critical #3)
- Test Coverage ≥80% (Critical #2)
- Security & CI Enhancement (Critical #1)

All changes follow Master Completion Plan and ADR-001.

## [Previous]
- Initial pilot modules
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-05-19

### Added
- Comprehensive MASTER_COMPLETION_PLAN.md with full 6-phase structure, current state analysis, gaps, and prioritized backlog.
- Initial CHANGELOG.md following Keep a Changelog.
- Deep onboarding analysis by Principal Software Engineer (static review of repo, CI, governance, recent 2026-05-18 overall review).

### Changed
- Updated MASTER_COMPLETION_PLAN.md from placeholder to production-ready living document.

### Fixed
- Documentation gaps identified in Giai đoạn 1 review.

### Security
- No changes (docs only).

## [0.1.0] - 2026-05 (Previous)

### Added
- Core modules: VST, GSC, CSSD ERP (partial), QLCV (Track B), NKBV MVP, Quản trị (MDM).
- DDD structure with modules/ + actions/ + lib/.
- Strong CI pipeline (Trufflehog, npm audit, lint CSSD arch, coverage gate, engineering verify).
- Pilot flags, env bootstrap/check scripts, many verify:* commands.
- AGENTS.md V8, PROGRESS_REPORT with slice development + Pilot DoD.
- Layout primitives, permission registry, proxy.ts.
- Supabase migrations (98+), RPCs, RLS.
- Production deploy on Vercel.
- Test coverage ~87% claimed, domain tests for policies/state engines.

### Notes
- Development followed strict slice-by-slice (mảnh) approach per PROGRESS_REPORT.
- Multiple lint fixes and NKBV test additions in 2026-05-18 review cycle.
- Focus on stability of pilot flows (VST end-to-end, GSC template, QLCV Kanban + định kỳ).

---

**Legend**: 
- Critical slices maintained stable.
- All changes via PR, conventional commits.
- Next: Continue per ACTIVE mảnh + quality gates.
