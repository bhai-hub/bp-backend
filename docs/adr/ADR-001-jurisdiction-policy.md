# ADR-001: Jurisdiction-Specific Feature Policy Architecture

## Status
Accepted

## Date
2026-09-15

## Context
Brownie Points is designed for global enterprise deployment across multiple regulatory and cultural environments. Operating recognition, points allocation, and employee rewards under a single universal rulebook creates significant compliance and cultural friction:
- In Germany and works-council jurisdictions, public leaderboards can trigger employee surveillance objections.
- In China, public ranking programs risk resembling social-scoring mechanisms.
- In India, emerging personal data privacy frameworks prioritize consent-led data handling and localized data options.
- In the United States, employee rewards must maintain clear separation from base compensation and promotion appraisals to avoid discrimination and wage disputes.

## Decision
We implement a **Country-Based Jurisdiction Policy Foundation** adhering to the following design:
1. **Mandatory Normalized Country:** Every Organization must store a validated ISO country code (`countryCode`).
2. **Decoupled Governance Layer:** Country metadata, jurisdiction policies, and the transactional Brownie Points ledger are separate layers.
3. **Backend Feature Guards:** Feature switches (`LEADERBOARD`, `PUBLIC_PROFILE`, `PORTABILITY`, `REDEMPTION`, `AUTOMATED_DECISION`) are authoritatively enforced at the API layer, rejecting restricted requests with HTTP 403.
4. **Policy Versioning:** Jurisdiction policies are versioned to preserve historical auditability.
5. **No Blockchain / Web3:** PostgreSQL remains the sole authoritative source of truth.
6. **No Legal Claims:** Product copy avoids claiming "legal compliance" and instead uses "configured jurisdiction policy" and "requires review".

## Consequences
### Positive
- Organizations in high-friction jurisdictions can operate safely with conservative defaults (e.g. Germany leaderboards disabled, China profiles disabled).
- Super Administrators can inspect and configure policy toggles through a centralized enterprise governance interface.
- Core balance and ledger logic remains untouched and mathematically pure.
- Seamless forward compatibility for future employee-level work location policies.

### Considerations
- Organizations changing countries trigger audit events and may see feature availability shift immediately.
- Backend API endpoints must consistently apply the `requireJurisdictionFeature` guard.
