import { useEffect, useState } from "react";

type AuthUser = {
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
};

const STORAGE_KEY = "kortex-local-auth";

function isConvexConfigured() {
  const value = (import.meta.env.VITE_CONVEX_URL as string | undefined | null)?.trim() || "";
  return Boolean(value && !value.includes("example"));
}

function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as { user?: AuthUser } | null;
  } catch {
    return null;
  }
}

function deriveUser(provider: string, data: unknown): AuthUser {
  if (data instanceof FormData) {
    const email = (data.get("email") as string | null)?.trim();
    if (email) {
      return { name: email.split("@")[0], email };
    }
  }

  if (typeof data === "object" && data && "email" in data) {
    const email = String((data as { email?: string }).email || "").trim();
    if (email) {
      return { name: email.split("@")[0], email };
    }
  }

  if (provider === "anonymous") {
    return { name: "Guest User", email: "guest@kortex.local" };
  }

  return { name: "Local User", email: "local@kortex.local" };
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (isConvexConfigured()) {
      setIsLoading(false);
      return;
    }

    const stored = getStoredSession();
    if (stored?.user) {
      setUser(stored.user);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, []);

  const signIn = async (provider: string, data?: unknown) => {
    const nextUser = deriveUser(provider, data);
    const session = { user: nextUser };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    setUser(nextUser);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
