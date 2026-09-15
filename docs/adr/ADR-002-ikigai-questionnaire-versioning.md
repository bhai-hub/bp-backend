# ADR-002: Why Ikigai Questionnaires Are Versioned

## Status
Accepted

## Date
2026-09-15

## Context
The Brownie Points platform incorporates the Japanese concept of Ikigai (the intersection of What you Love, What you are Good At, What the World Needs, and What you can be Paid For) as an employee-owned self-reflection module during onboarding and ongoing professional development.

As organizations evolve their workplace culture, talent development frameworks, and question wording, the questionnaire structure inevitably changes:
- Prompts may be revised for greater clarity or relevance.
- New dimensions or optional questions may be introduced.
- Obsolete questions may be retired.

If questionnaires were updated in-place without versioning:
1. Past employee responses would point to altered question texts, destroying historical semantic fidelity.
2. Answering a newly modified question could invalidate an employee's previously submitted reflections.
3. Auditing the exact questions an employee saw at their onboarding date would become impossible.

## Decision
We implement a **Versioned Questionnaire Architecture** in PostgreSQL:
1. **`IkigaiQuestionnaire`**: Contains an integer `version` field (`version: 1`, `version: 2`), `isActive` boolean, and descriptive metadata.
2. **`IkigaiQuestion`**: Tied explicitly to a specific `questionnaireId`, defining the `dimension` (`LOVE`, `GOOD_AT`, `WORLD_NEEDS`, `PAID_FOR`), `questionType`, and `displayOrder`.
3. **`IkigaiResponse`**: Bound to both `questionnaireId` and `questionId`, guaranteeing that historical employee answers permanently point to the exact question version they answered.
4. **Non-Destructive Evolution**: Introducing a new questionnaire creates a new `version` record rather than overwriting historical questionnaires.

## Consequences
### Positive
- Historical integrity is preserved: employees' reflections always link back to the exact question text they answered.
- Organizations can roll out new questionnaire iterations without breaking existing employee profiles.
- Questions can be configured and activated dynamically through the backend database without modifying React code.

### Considerations
- When presenting an employee's responses in their dashboard, the system looks up the questions associated with their response version rather than assuming the latest active version.
