# Code Quality Improvement Plan

> **Process:** Follow this plan task-by-task. Use checklist (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicated utility functions across pages and parallelize sequential Supabase queries in API routes.

**Architecture:** Extract shared utilities into `lib/utils.ts`. Parallelize independent Supabase queries using `Promise.all()` in API routes. Replace inline `AnimatedCounter`/`AnimatedNumber` re-implementations with the existing `components/AnimatedCounter.tsx`.

**Tech Stack:** Next.js 16, React 19, Supabase, TypeScript

---

## Task 1: Extract shared utility functions to `lib/utils.ts`

**Files:**
- Create: `lib/utils.ts`
- Modify: `app/driver/page.tsx:33-111`
- Modify: `app/analytics/page.tsx:43-87`
- Modify: `app/analytics/[id]/page.tsx:31-135`

The following functions are duplicated across 2-3 files:
- `formatDuration(seconds)` — in `driver/page.tsx`, `analytics/page.tsx`, `analytics/[id]/page.tsx`
- `timeAgo(dateStr)` — in `driver/page.tsx`, `analytics/page.tsx`, `analytics/[id]/page.tsx`
- `getPerformanceBadge(avgSeconds)` — in `driver/page.tsx`, `analytics/[id]/page.tsx`
- `buildHeatmapWeeks(dailyCounts)` — in `driver/page.tsx`, `analytics/[id]/page.tsx`

**Step 1:** Create `lib/utils.ts` with all four functions exported.

**Step 2:** Update `app/driver/page.tsx` — remove local definitions, import from `@/lib/utils`.

**Step 3:** Update `app/analytics/page.tsx` — remove local `formatDuration` and `timeAgo`, import from `@/lib/utils`.

**Step 4:** Update `app/analytics/[id]/page.tsx` — remove local definitions, import from `@/lib/utils`.

---

## Task 2: Parallelize Supabase queries in `app/api/driver/[id]/route.ts`

**Files:**
- Modify: `app/api/driver/[id]/route.ts`

Currently 6 sequential queries (lines 13-76) that are all independent reads on the same `delivery_history` table. They can be parallelized with `Promise.all()`.

**Queries to parallelize:**
1. `totalDeliveries` count
2. `weekDeliveries` count
3. `monthDeliveries` count
4. `lastDelivery` fetch
5. `recentDeliveries` fetch
6. `allDeliveries` fetch (for heatmap)

The account fetch (line 13) must remain first since subsequent queries depend on its existence check.

---

## Task 3: Parallelize Supabase queries in `app/api/analytics/route.ts`

**Files:**
- Modify: `app/api/analytics/route.ts`

The `allTimeData` fetch (line 56) and `driverAccounts` fetch (line 67) are independent and can run in parallel.

The `trendData` fetch (line 125) and `recentInactiveData` fetch (line 153) are also independent of each other and can run in parallel.

The `prevData` fetch (line 232) is independent and can be included in the parallel group with trend/inactive.

---

## Task 4: Parallelize Supabase queries in `app/api/drivers/route.ts` POST handler

**Files:**
- Modify: `app/api/drivers/route.ts`

In the POST handler, after the device is found and status is determined, the `total` count and `ahead` count queries (e.g. lines 201-212, 233-244, 263-274, 313-324) are always run as a pair. These two queries are independent and can be parallelized with `Promise.all()`.

This pattern appears 4 times in the POST handler. Each pair should use `Promise.all()`.

---

## Task 5: Replace inline AnimatedCounter/AnimatedNumber with shared component

**Files:**
- Modify: `app/analytics/page.tsx:112-140`
- Modify: `app/analytics/[id]/page.tsx:54-75`

Both files re-implement `AnimatedCounter`/`AnimatedNumber` inline instead of using the existing `components/AnimatedCounter.tsx`. Replace with imports from `@/components/AnimatedCounter`.

---

## Verification

After all tasks, run:
```bash
npx tsc --noEmit    # Type checking
npx next lint       # Linting
```

Manually verify:
- `/` (dashboard) loads without errors
- `/driver?id=...` loads profile correctly
- `/analytics` loads with all data
- `/analytics/[id]` loads detail view correctly
- Auth-then-data flow still works (login redirect)
