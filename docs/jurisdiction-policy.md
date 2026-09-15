# Jurisdiction-Specific Feature Policy Foundation

## 1. Overview & Principles

The Brownie Points enterprise platform operates across diverse legal and cultural regulatory environments. The platform rejects a single global rulebook assumption in favor of a modular, jurisdiction-specific policy configuration layer:

```
Company / Organization Country
            ↓
       Jurisdiction
            ↓
   Policy Configuration
            ↓
      Feature Rules
            ↓
   Application Behaviour
```

> **Important Legal Disclaimer:**
> These policies represent **product governance and application configuration** controls. They do not constitute legal advice and do not represent a claim that the platform is certified as compliant with local laws without independent legal counsel.

---

## 2. Why Country is Stored on the Organization

In an enterprise SaaS model, corporate subscriptions, master service agreements, and company-wide benefit budgets originate at the **organization level**.

- Every Organization is required to have a normalized ISO country code (e.g. `IN`, `US`, `DE`, `CN`).
- Free-text country names are prohibited to ensure deterministic lookup.
- The Organization Country acts as the primary jurisdiction resolver for all tenant-wide settings, default feature flags, and corporate audit rules.

---

## 3. Why Country-Specific Policy Exists

Different sovereign jurisdictions impose distinct constraints on rewards, employee data privacy, works councils, and recognition programs:

1. **India (`IN`)**:
   - Consent-led personal data processing.
   - Conservative non-cash award classification.
   - Configurable retention and deletion policies.
   - In-country data residency option.
2. **United States (`US`)**:
   - Strict separation between recognition points and base compensation or performance appraisals.
   - Bias testing considerations (disallow automated promotion/employment decisions).
   - Default non-cash redemption warnings.
3. **Germany / European Union (`DE`)**:
   - Works-council (Betriebsrat) transparency and co-determination constraints.
   - Public leaderboards and rankings disabled by default to prevent employee surveillance.
   - Strict opt-in requirements and EU data location.
   - Mandatory human review for recognition programs.
4. **China (`CN`)**:
   - Anti-social-scoring safeguards: Public employee rankings and public profiles are strictly disabled.
   - Cross-organization portability disabled.
   - Private, employer-bounded recognition only.
5. **Unconfigured / Other Countries**:
   - Fallback policy `DEFAULT_REVIEW_REQUIRED`: Restricts public leaderboards and portability until administrator review.

---

## 4. Policy Resolution Flow

The `JurisdictionPolicyService` is the single source of truth for policy resolution:

```
Client Request
      ↓
Authentication Middleware (JWT verification)
      ↓
Identify Organization
      ↓
JurisdictionPolicyService.getPolicyForOrganization(orgId)
      ↓
Match Country & Policy Version (e.g. 'IN' v1)
      ↓
Evaluate Feature Guard (e.g. requireJurisdictionFeature('LEADERBOARD'))
      ↓
Allowed -> Route Handler  |  Denied -> 403 FEATURE_DISABLED_BY_JURISDICTION
```

---

## 5. Feature-Toggle Architecture

Jurisdiction policies manage 10 core governance controls:

| Feature Flag | Type | Description |
| :--- | :--- | :--- |
| `leaderboardEnabled` | Boolean | Enables or disables organizational employee leaderboards. |
| `publicProfileEnabled`| Boolean | Allows or restricts public employee achievement profile pages. |
| `portabilityEnabled` | Boolean | Controls whether earned points can transfer across corporate entities. |
| `redemptionEnabled`  | Boolean | Governs whether employees can redeem spendable points for merchandise/vouchers. |
| `nonCashRedemptionOnly`| Boolean | Enforces non-cash redemption catalog only to avoid payroll classification. |
| `automatedDecisionEnabled`| Boolean | Flags whether algorithms can automatically trigger career or compensation impacts. |
| `humanReviewRequired`| Boolean | Mandates that HR or managers review points allocations before final release. |
| `consentRequired`    | Boolean | Requires explicit user consent before processing recognition data. |
| `dataLocationPolicy` | String  | Declares data residency preference (`GLOBAL`, `IN_COUNTRY_OPTION`, `EU_ONLY`, `LOCAL_ONLY`). |
| `retentionPolicy`    | String  | Declares record retention period (`STANDARD`, `CONFIGURABLE`, `MINIMAL_STRICT`). |

---

## 6. Policy Versioning & Auditability

Policies are versioned (`policyVersion: 1, 2, ...`). Historical policies are never overwritten in-place:
- When an organization is created, its active policy version is stored (`jurisdictionPolicyVersion: 1`).
- When a policy is updated, a new version is created or an audit record tracks the previous and new values, actor, and administrative reason.
- When an organization changes country, the previous country and policy version are preserved in the immutable audit log.

---

## 7. Future Extensibility: Employee Work Location

For V1, Organization Country is the primary jurisdiction resolver. However, the database schema and service abstraction cleanly support future multi-jurisdiction extensions:
- An `employeeWorkLocation` or `employeeLegalJurisdiction` can be added to the `Employee` model in later phases.
- The `JurisdictionPolicyService` can simply accept an optional `employeeId` to resolve the intersection of company and worker jurisdictions.

---

## 8. Security & Business Rule Independence

- **Independent BP Ledger:** Jurisdiction policy controls feature toggles only. It **never** alters wallet balance arithmetic, ledger entries, or currency math.
- **Backend Authorization:** Frontend controls are UX conveniences only. The backend independently enforces feature restrictions, returning `403 FEATURE_DISABLED_BY_JURISDICTION` even if an endpoint is called directly.
- **Audit Trails:** Denied feature accesses, policy updates, and country modifications generate immutable `AuditLog` entries.
