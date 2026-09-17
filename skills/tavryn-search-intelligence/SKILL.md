# Tavryn Search Intelligence

## Purpose
Turn real user search behavior into better retrieval, useful content opportunities, and measurable answer quality.

## Core loop
`search query -> unified retrieval -> click -> explicit outcome -> ranking feedback -> opportunity detection -> new question/tool -> better retrieval`

## Signals
- Search demand: query frequency, zero-result rate, weak-result rate, recency.
- Retrieval behavior: result clicks by target type and slug.
- Explicit quality: `solved` vs `not_solved` outcome feedback.
- Content quality: accepted answers, answer count, answer score, views, recency.
- Taxonomy: tags and categories are valid destinations, not just filters.

## Ranking rules
- Keep textual relevance as the primary signal.
- Add small, bounded usefulness boosts rather than allowing engagement to dominate relevance.
- Prefer answered/accepted content for solved intent while preserving fresh unanswered demand for discovery.
- Positive outcome feedback may boost a target for the same normalized query; negative feedback should reduce it modestly.
- Never let raw click volume alone determine ranking.
- Use deterministic tie-breakers.

## Telemetry rules
- Search and outcome telemetry should be append-oriented and minimally identifying.
- Raw search/outcome records are operational data, not public content.
- Exposed telemetry tables must have RLS and explicit least-privilege grants.
- Security-definer functions must be avoided unless genuinely required; prefer security-invoker functions.
- Validate redirect targets server-side before logging clicks or redirecting.

## Opportunity rules
A useful opportunity is a query with meaningful demand and insufficient successful resolution. Weight repeated demand, zero/weak results, recency, and negative outcome feedback. Do not manufacture low-value pages just because a query exists.

## Quality gates
Before shipping search changes:
1. Verify the SQL function directly with representative queries.
2. Verify result types and ordering are deterministic.
3. Verify telemetry write access and read isolation.
4. Run Supabase security advisors after schema/function changes.
5. Run CI typecheck, lint, and production build.
6. Inspect real result output before declaring the ranking change useful.

## Next-level improvements
Prefer outcome-aware ranking, duplicate detection, query clustering, result reformulation analysis, and tool-creation opportunities over vanity metrics. Upgrade to Meilisearch/Typesense only when Postgres retrieval is demonstrably the bottleneck.
