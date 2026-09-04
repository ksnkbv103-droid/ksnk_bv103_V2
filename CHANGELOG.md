# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- W1 / W2 / W3 execution packs for PO/IT go-live and UAT (`docs/reference/guides/w*-*.md`).
- Migration `20260722100000` — drop permissive RLS on `gstt_dm_bang_kiem`; align policies with `BANG_KIEM` + admin.
- `npm run trial:rbac:roles(:local)` — probe 5 KSNK roles + bang_kiem residual policies.
- CAP_PHAT soft-warning decision + CSSD P3 training ack.
- Incident / backup / restore-drill playbook.
- HIS/LIS next-steps guide; BRD vật tư workshop agenda.
- `npm run test:e2e:ci` — skip cleanly without E2E secrets; fail hard when secrets present.

### Changed
- Architecture one-pager: security posture + data client (no TanStack Query claim).
- Root README stack line aligned with `package.json`.
- CI e2e job: removed `continue-on-error`; uses `test:e2e:ci`.
- Go-live signoff §B split into W1 / W2 / W3 tables.

### Fixed
- Doc drift: G-11 residual / QLCV “RLS yếu hơn CSSD” outdated wording.

## [0.1.0] - 2026-05 — Documentation baseline

### Added
- Documentation restructuring and MASTER_COMPLETION_PLAN era notes (historical).

### Changed
- Consolidated architecture / guides / operations docs under `docs/`.
