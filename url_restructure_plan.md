# URL Restructure Plan: `/community/[communitySlug]` to `/[communitySlug]`

This document outlines the plan to change the URL structure for community pages from `dance-hub.io/community/pandora` to `dance-hub.io/pandora`.

**Date:** May 22, 2025

## Phase 1: Planning & Analysis (Identifying Files to Change)

1.  **Routing and File Structure Changes (Next.js `app` router):**
    *   The primary change is moving files from `app/community/[communitySlug]/` to a new top-level dynamic route `app/[communitySlug]/`.
    *   **Action:**
        *   Move the contents of `app/community/[communitySlug]/` to `app/[communitySlug]/`.
            *   `app/community/[communitySlug]/page.tsx` -> `app/[communitySlug]/page.tsx`
            *   `app/community/[communitySlug]/about/page.tsx` -> `app/[communitySlug]/about/page.tsx`
            *   `app/community/[communitySlug]/classroom/page.tsx` -> `app/[communitySlug]/classroom/page.tsx`
            *   `app/community/[communitySlug]/classroom/[courseSlug]/page.tsx` -> `app/[communitySlug]/classroom/[courseSlug]/page.tsx`
            *   `app/community/[communitySlug]/classroom/[courseSlug]/lesson/[lessonId]/page.tsx` -> `app/[communitySlug]/classroom/[courseSlug]/lesson/[lessonId]/page.tsx`
            *   Any other sub-routes or layout files within `app/community/[communitySlug]/`.
    *   **Conflict Resolution:**
        *   The new `app/[communitySlug]/` route will be a "catch-all". Ensure it doesn't override other top-level static routes (e.g., `/discovery`, `/admin`, `/login`).
        *   The `app/[communitySlug]/page.tsx` (and other pages within this dynamic segment) must fetch community data based on the `communitySlug` parameter. If no community matches, it **must** return a 404 (Not Found) page.
    *   **Special Case:** `app/community/onboarding/`
        *   Decide its new location: `/onboarding/` (if general) or `/[communitySlug]/onboarding/` (if per-community). `/onboarding/` seems more appropriate if it's for users pre-community creation/joining.

2.  **Link and Navigation Updates:**
    *   All hardcoded links, `next/link` components, and programmatic navigation (e.g., `router.push`) using the `/community/` prefix need updating.
    *   **Files to inspect and likely change:**
        *   `components/CommunitySettingsModal.tsx` (e.g., `window.location.href = \`/\${newSlug}\`;`)
        *   `components/CommunityNavbar.tsx`
        *   `components/CommunityHeader.tsx`
        *   `app/admin/communities/page.tsx`
        *   `app/discovery/page.tsx`
        *   `app/dashboard/...`
        *   `components/auth/...`
        *   `components/landing/...`
        *   `components/ThreadCard.tsx`, `components/CourseCard.tsx`
        *   Any `sitemap.xml` or `robots.txt` generation logic.
    *   **Search for patterns:**
        *   `href="/community/`
        *   `href={\`/community/`
        *   `router.push("/community/` or `router.push(\`/community/`
        *   `window.location.href` assignments involving `/community/`.

3.  **API Route Calls & Definitions:**
    *   **Client-side calls:** (e.g., `/api/community/${communitySlug}/update`) are absolute and should **not** need to change if API route definitions remain the same.
    *   **API Route Definitions:** Files under `app/api/community/[communitySlug]/...`.
        *   **Decision:** Keep API routes at `app/api/community/[communitySlug]/...` for initial simplicity. Changing them to `app/api/[communitySlug]/...` can be a follow-up task if desired.

4.  **Middleware (`middleware.ts`):**
    *   **Action:** Read `middleware.ts` to check for logic specific to `/community/` paths. Adapt or remove this logic as needed.

5.  **Backend/Database:**
    *   No changes anticipated for the database schema itself.

6.  **SEO and External Links:**
    *   **Action:** Implement 301 redirects from old `/community/[slug]` paths to new `/[slug]` paths. This can be done in `next.config.js` or via hosting provider settings.

## Phase 2: Implementation Strategy

1.  **Create a New Git Branch:** Isolate these changes.
2.  **File System Changes:**
    *   Move `app/community/[communitySlug]` to `app/[communitySlug]`.
    *   Relocate `app/community/onboarding/` based on the decision in Phase 1.1.
3.  **Update Imports:** Adjust relative import paths in moved files if necessary.
4.  **Code Updates (Links & Navigation):**
    *   Systematically update all identified URL constructions.
5.  **Middleware Update:** Modify `middleware.ts` as identified in Phase 1.4.
6.  **Implement 404 Logic:**
    *   Ensure `app/[communitySlug]/page.tsx` (and related dynamic pages) correctly shows a 404 for invalid slugs.
    *   This might involve checking against a list of reserved paths (e.g., `admin`, `discovery`) before a database lookup.
7.  **Testing:**
    *   Thoroughly test all community pages with new URLs.
    *   Test navigation to and from community pages.
    *   Verify static pages (`/discovery`, `/admin`) are not misrouted.
    *   Confirm 404 behavior for invalid community slugs.
    *   Test functionality related to `communitySlug` in API calls.
    *   Verify SEO redirects.
8.  **API Route Changes (Optional - Postponed):** If API routes were to be changed, this would be the step.

## Tools for Implementation

*   IDE's Global Search and Replace
*   File Explorer
*   Git (for version control)

## Next Steps

*   Read `middleware.ts` to assess its impact.
*   Begin Phase 2 implementation on a new branch.

