# Tavryn Forum Engineering Skill

## Trigger
Use this skill for any feature touching questions, answers, comments, tags, categories, votes, bookmarks, reports, moderation, profiles, search/discovery, or forum UX.

## Source principles
1. Treat questions/topics as canonical content records.
2. Treat answers/posts as first-class contributions that can be ranked and accepted.
3. Keep comments subordinate to answers/questions.
4. Use category boundaries for both discovery and authorization.
5. Separate visibility rules from action authorization.
6. Make moderation/report records distinct from normal content.
7. Persist/derive enough counters and timestamps to support multiple discovery modes.
8. Make stable slugs/canonical URLs part of content design.
9. Prefer server-enforced policy and RLS over client-only hiding of controls.
10. Borrow patterns, not proprietary code or branding, from open-source forum projects.

## Quality gate
Before implementing a forum feature, answer:
- What mature forum pattern is being reused?
- What is the canonical database object?
- What are the visibility states?
- Who may perform each mutation?
- What RLS/server authorization protects it?
- How does the object participate in search/discovery?
- What URL should search engines index?
- What should happen when content is deleted, hidden, locked, or moderated?

## Discovery gate
A feature is incomplete when it only works from a direct URL. It must connect to at least one useful discovery surface: search, category, tag, latest, unanswered, popular, related questions, or profile history.

## Security gate
Never trust browser-supplied author IDs, roles, trust levels, scores, moderator IDs, or publication states. Derive identity from the authenticated session and enforce permissions on the server/database.

## Performance gate
Foreign keys used for joins/filtering need covering indexes. Avoid loading all tags, comments, or posts when a paginated/limited query can satisfy the view.

## UX gate
Post actions should be contextual and predictable: reply, edit, vote/like, bookmark, flag, share, and moderation actions should appear only when applicable. Users should be able to understand why a question is visible, closed, unanswered, or restricted.

## V1 boundary
Do not introduce federation, complex earned-trust mechanics, a plugin marketplace, a separate forum service, or media infrastructure merely because mature forums contain those capabilities. Preserve extension points without paying their complexity cost early.