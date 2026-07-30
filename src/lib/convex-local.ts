/**
 * Convex Local — Thin wrapper around real Convex hooks.
 *
 * Re-exports useQuery and useMutation from convex/react with the same
 * signatures the existing components expect, so every import of
 * `@/lib/convex-local` now uses the real Convex backend with zero mock data.
 */

import { useQuery, useMutation, useAction } from "convex/react";

// Re-export with the same names the codebase already uses.
// useLocalQuery  → real Convex useQuery  (returns data | undefined)
// useLocalMutation → real Convex useMutation  (returns async mutator)
// useLocalAction → real Convex useAction  (returns async action)

export { useQuery as useLocalQuery, useMutation as useLocalMutation, useAction as useLocalAction };
