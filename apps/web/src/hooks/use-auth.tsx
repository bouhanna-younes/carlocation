"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/database.types";

interface AuthContextValue {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: Profile | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profilePromiseRef = useRef<Promise<Profile | null> | null>(null);
  const queryClient = useQueryClient();

  // Centralized profile fetcher (dedupes concurrent calls)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (profilePromiseRef.current) return profilePromiseRef.current;
    const p = (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Failed to fetch profile:", error.message);
        return null;
      }
      return data as unknown as Profile;
    })();
    profilePromiseRef.current = p;
    try {
      return await p;
    } finally {
      profilePromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!cancelled) {
            if (profile) {
              setUser(profile);
            }
            // If profile is null, user still has a valid session — don't force logout
            // They just can't access app pages until profile is created
            setIsLoading(false);
          }
        } else {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!cancelled) setUser(profile);
        } else {
          if (!cancelled) setUser(null);
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        throw new Error("لم يتم العثور على ملف المستخدم — تواصل مع المدير");
      }
      setUser(profile);
      return { user: profile };
    },
    [fetchProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    queryClient.clear();
    window.location.href = "/login";
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setUser(profile);
    }
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
