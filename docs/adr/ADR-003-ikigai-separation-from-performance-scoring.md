# ADR-003: Separation of Ikigai Responses from Performance Scoring and Employee Ranking

## Status
Accepted

## Date
2026-09-15

## Context
In enterprise employee platforms, self-assessment and motivational tools are frequently misapplied as algorithmic inputs to employee appraisals, stack-ranking systems, compensation adjustments, or disciplinary actions.

Applying numerical scores or ranking mechanisms to Ikigai reflections produces severe negative side effects:
1. **Perverse Incentives & Dishonesty**: Employees respond with sanitized, performative answers ("I love working overtime") rather than honest self-reflections about what genuinely motivates them.
2. **Regulatory & Surveillance Violations**: In works-council jurisdictions (e.g. Germany) and data-privacy regimes (e.g. EU GDPR, China PIPL), automated profiling or employee scoring from subjective psychological inputs triggers strict labor prohibitions and legal liability.
3. **Loss of Psychological Safety**: Transforming personal aspirations into manager-evaluated criteria destroys trust between the workforce and the recognition platform.

## Decision
We establish a foundational architectural separation:
1. **Reflective, Not Evaluative**: Ikigai responses are treated strictly as employee-owned reflective goals context.
2. **Zero Numerical Scoring**: No "Ikigai score", percentage match, or ranking algorithm is computed or persisted.
3. **No Automated Appraisal Integration**: Ikigai answers are never ingested into salary formulas, promotion workflows, performance ratings, or disciplinary triggers.
4. **Privacy by Default**: Ikigai reflections are accessible only to the authenticated author (`GET /api/v1/ikigai/me`). They are not surfaced in public employee directories, recognition feeds, or HR manager lists.
5. **Audit Sanitization**: Audit events record that an Ikigai submission occurred (`IKIGAI_COMPLETED`), but never record the employee's reflective text within audit logs.

## Consequences
### Positive
- Fosters genuine employee engagement, self-awareness, and career clarity.
- Complies with conservative jurisdiction policies against workplace surveillance and anti-social-scoring regulations.
- Protects employee psychological safety across global enterprise tenants.

### Considerations
- Managers cannot view an employee's Ikigai answers without future explicit employee consent and deliberate jurisdiction policy enablement.
