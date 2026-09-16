# Tavryn Open-Source Forum Pattern Audit

## Purpose

Tavryn should be implemented as a native Next.js + Supabase application, while borrowing mature interaction, authorization, visibility, and discovery patterns from established open-source forum systems.

## Discourse patterns to adopt

- A discussion/topic is a first-class content object with a lifecycle independent of individual posts.
- Topic discovery needs multiple orderings such as latest/bumped, newest, unread/following, and popularity/hot.
- Trust levels can progressively unlock capabilities rather than relying on a single administrator/user split.
- Post-level actions are contextual: reply, edit, flag, bookmark, share, and moderation actions.
- Topic voting can be a separate discovery surface and a signal used by ranking/workflows.

References: Discourse `Topic`, `TrustLevel`, topic-query, site-settings, and bundled topic-voting implementation.

## NodeBB patterns to adopt

- Category is a real authorization boundary, not just presentation metadata.
- Topic/post/user identifiers and sortable counters are core primitives because discovery often depends on post count, votes, views, pinned state, and recency.
- Fine-grained category permissions should exist for reading categories/topics, creating topics, and replying/upvoting.
- Per-category permissions make it possible to support restricted or specialized communities later without replacing the authorization model.

References: NodeBB database structure and privileges documentation.

## Flarum patterns to adopt

- Separate visibility from authorization. A record may be structurally valid but hidden from a particular user because of moderation, tag/category restrictions, or publication state.
- Discussion resources should expose relationships explicitly: author, tags, first post, last-post user, and posts.
- Tags are first-class objects, but secondary/large tag sets should be loaded or queried incrementally rather than forcing all tags into every page payload.
- Object-level authorization should be returned with resources so the UI can know whether edit/reply/delete/etc. controls are available without duplicating policy logic in the browser.
- Keep moderation/audit events distinct from normal content rows.

References: Flarum model visibility, authorization, REST API, tags/model docs, and audit documentation.

## Tavryn translation

Tavryn will not embed Discourse, NodeBB, or Flarum. Their useful patterns become native Postgres tables, RLS policies, SQL queries, server actions/route handlers, and React components.

### Content hierarchy

`question/topic -> answers/posts -> comments`

The question is the canonical searchable page. Answers are independently rankable contributions. Comments remain subordinate discussion rather than becoming peer answers.

### Discovery surfaces

- Search: cross-content retrieval across questions, answers, and tools.
- Latest: recently bumped questions.
- Unanswered: questions without an accepted/validated answer.
- Popular: vote/view/activity-informed ranking.
- Category and tag pages.
- Tool pages as first-class searchable documents.

### Authorization model

Use Supabase RLS for baseline row protection and explicit server-side policy checks for actions. Category-level restrictions should be representable without redesigning the data model.

### Visibility model

Add publication/moderation states so hidden, pending, locked, deleted, or otherwise restricted content can be filtered consistently. Do not scatter visibility rules through individual UI components.

### Trust model

Start simple in V1: authenticated member plus moderator/admin roles. Preserve a field/model boundary for future earned trust levels and capability thresholds instead of coupling permissions directly to a single boolean.

### Ranking primitives

Persist or derive: answer count, comment count, view count, vote score, accepted-answer status, created_at, updated/bumped_at, and last activity. These allow multiple discovery modes without vendor-specific infrastructure.

### Audit and moderation

Reports/flags are separate records. Moderation actions should eventually be auditable. Do not expose internal moderation metadata in public resource payloads.

### SEO

Each public question gets a stable slug/canonical URL. Structured data should describe question/answer content where appropriate. Tool pages use their own page type and canonical metadata.

## Deliberate non-adoptions for V1

- No full Discourse trust-level bureaucracy.
- No NodeBB federation/ActivityPub.
- No Flarum extension subsystem.
- No embedded forum engine.
- No separate media service.
- No creator payout system.

The goal is to capture the proven primitives while keeping one small, understandable monolith.