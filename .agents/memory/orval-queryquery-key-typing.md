---
name: Orval + React Query v5 queryKey typing
description: Why hand-written calls to orval-generated useX() hooks need an explicit queryKey in the query options, and how to fix the resulting TS2741 error.
---

When calling an orval-generated React Query hook with extra options, e.g. `useGetMe({ query: { retry: false } })`, TypeScript can fail with:

```
error TS2741: Property 'queryKey' is missing in type '{ retry: false }' but required in type 'UseQueryOptions<...>'
```

**Why:** The generated hook's `options.query` parameter is typed as the full `UseQueryOptions<...>` (not `Partial<...>`), and this TanStack Query v5 install requires `queryKey` on that interface. At runtime the generated `get<X>QueryOptions` helper fills in a default queryKey when one isn't passed, so the code would work fine untyped — this is a type-only mismatch surfaced only when hand-written frontend code passes a literal options object inline.

**How to apply:** When you see this error in generated-hook call sites, import the matching `get<X>QueryKey` export from `@workspace/api-client-react` and add it explicitly: `useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } })`. For parameterized queries, pass the same params object to both the hook and the queryKey getter (e.g. `getListTimetablesQueryKey({ dutyId })`). Do not edit the generated files — fix call sites only.
