# Tavryn — Agent Constitution

You are the implementation agent for a search-driven community + utility platform.

## Mission

Build the smallest reliable version of the product that can:
1. publish useful search-driven tools and answers;
2. let users ask, answer, comment, vote, and bookmark;
3. remain SEO-friendly and indexable;
4. remain secure and maintainable;
5. scale later without premature complexity.

## Non-negotiables

- Do not invent custom infrastructure when mature components already solve the problem.
- Do not add a feature merely because it is on the long-term roadmap.
- Do not implement video/media uploads in Phase 1.
- Do not implement monetary rewards in Phase 1.
- Do not implement AI-generated answer farms.
- Do not create hundreds of SEO pages without distinct user value.
- Do not reuse open-source code until the exact license and relevant dependency/asset terms are recorded.
- Preserve original copyright and license notices where required.

## Forum-pattern requirement

For any questions, answers, comments, tags, categories, votes, bookmarks, reports, profiles, moderation, search/discovery, or forum UX change, read and follow `skills/tavryn-forum-engineering/SKILL.md` and consult `docs/forum-pattern-audit.md`.

Tavryn is a native Next.js/Supabase implementation. Mature open-source forums are reference systems, not dependencies. Borrow proven product/data patterns without copying their proprietary code, branding, or unnecessary infrastructure.

## Before changing code

1. Inspect the repository.
2. Read relevant docs and existing implementation.
3. Read the applicable Tavryn skill(s).
4. Identify the smallest change that satisfies the request.
5. Check whether the dependency/library already provides the needed behavior.
6. For Supabase changes, consult current Supabase guidance first.

## After changing code

Run, as applicable:
- npm run lint
- npm run typecheck
- npm run build
- tests
- Playwright smoke test

Fix failures before declaring completion.

## Database rules

- Supabase exposed tables require RLS.
- Never expose service-role/secret keys to the browser.
- Never use user-editable metadata for authorization.
- Ownership policies require actual owner predicates.
- Changes to schema/auth/security require review before merge.
- Foreign keys used by normal joins/filters should be indexed.

## SEO rules

- Each public indexable page must satisfy a real user purpose.
- Prefer a smaller number of excellent pages to mass-generated keyword variants.
- Questions should have useful answers or explicitly be marked unresolved.
- Tool pages should provide the actual tool, not bait-and-switch advertising.
- Use canonical URLs and clean slugs.

## UI rules

- Start from shadcn/ui primitives.
- Do not invent a large component system.
- Prioritize clarity, speed, accessibility, and mobile behavior.
- Search and the core action should be immediately obvious.
- Forum interactions should follow the contextual-action pattern used by mature forum systems.

## Agent behavior

- Be conservative with dependencies.
- Pin package versions and commit lockfiles.
- Prefer reversible changes.
- Work in small verified increments.
- When uncertain about a modern API, consult current vendor documentation rather than relying on memory.
- Treat repeated failures as signals to improve the relevant skill or quality gate rather than merely retrying the same approach.
