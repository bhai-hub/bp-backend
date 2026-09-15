# ADR-004: Server-Authoritative Employee Onboarding Lifecycle and Cryptographic Invitation Security

## Status
Accepted

## Date
2026-09-15

## Context
Employee onboarding is the gateway through which workforce identities enter enterprise SaaS platforms. When onboarding states are managed loosely or driven by client-side browser flags:
1. Malicious actors or unauthorized employees can bypass mandatory profile completion and consent steps by manipulating client-side state.
2. Raw invitation tokens stored in databases are vulnerable to database dump leaks or log aggregation exposures.
3. Reusable or non-expiring invitation links create permanent account hijack attack vectors.

## Decision
We implement a **Server-Authoritative Onboarding State Machine** backed by cryptographic token hashing:
1. **Explicit Onboarding States**: `INVITED` → `ACCOUNT_CREATED` → `PROFILE_PENDING` → `IKIGAI_PENDING` → `COMPLETED`.
2. **Zero Client Trust**: The frontend route guards query the server-authoritative `onboardingStatus` returned by the backend. The backend enforces that incomplete employees cannot access restricted actions.
3. **Cryptographic Token Hashing**:
   - Invitation links contain high-entropy raw tokens (`crypto.randomBytes(32).toString('hex')`).
   - The raw token is delivered once to the recipient and is **never stored in PostgreSQL**.
   - The database stores only the deterministic SHA-256 hash (`invitationTokenHash`).
4. **Single-Use & Strict Expiry**:
   - Invitations expire automatically after 7 days.
   - Upon acceptance, the invitation token hash and expiration are immediately set to `null` in a database transaction, rendering the invitation non-reusable.
5. **Role & Tenant Scoping**: Only authorized HR Managers belonging to the employee's specific tenant organization can initiate or resend onboarding invitations.

## Consequences
### Positive
- Prevents account takeover and token leak exposure in database backups and logs.
- Eliminates state desynchronization between the frontend UI and database.
- Guarantees that employees complete mandatory profile setup and reflective alignment before receiving recognition points or accessing team features.

### Considerations
- HR managers cannot view raw invitation tokens after the creation event; resending an invitation generates a fresh token and invalidates previous ones.
