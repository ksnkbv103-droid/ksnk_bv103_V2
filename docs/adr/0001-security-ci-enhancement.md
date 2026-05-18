# ADR 0001: Security and CI/CD Enhancement

**Status**: Proposed
**Date**: 2026-05-18

## Context
Current CI only has lint + Vitest. Missing security scanning, dependency audit, secret scanning.

## Decision
1. Update `.github/workflows/ci.yml` to include:
   - Secret scanning
   - `npm audit`
   - Dependency review
   - Trivy or CodeQL if applicable
2. Enforce test coverage ≥80%
3. Fail CI on high/critical vulnerabilities

## Alternatives Considered
- Keep current minimal CI
- Use third-party security tools

## Consequences
- Much higher security posture
- Better maintainability
- Slightly longer CI time (acceptable)

**Approved By**: Principal Engineer
