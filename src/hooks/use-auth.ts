/**
 * KORTEX AI — Authentication Hook
 *
 * Single source of truth for auth state via Convex Auth (Freebuff).
 * Uses useAuthToken for session state and useAuthActions for signIn/signOut.
 * No localStorage, no Supabase, no duplicated state.
 */
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useMemo } from "react";

export function useAuth() {
  const token = useAuthToken();
  const { signIn, signOut } = useAuthActions();

  // Token presence indicates authentication — no localStorage, no manual state
  const isAuthenticated = token !== null;
  const isLoading = false; // ConvexAuthProvider handles loading internally

  // Decode minimal user info from token if available
  const user = useMemo(() => {
    if (!token) return null;
    try {
      // JWT payload is base64url-encoded in the second segment
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        _id: payload.sub ?? payload.id,
        name: payload.name ?? payload.email?.split("@")[0] ?? "User",
        email: payload.email,
        image: payload.picture,
      };
    } catch {
      // Token is present but not a standard JWT — still authenticated
      return { name: "User", email: undefined };
    }
  }, [token]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
