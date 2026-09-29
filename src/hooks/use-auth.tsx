import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n/config";
import type { Company, Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    companyName?: string;
    vatStatus: "kleinunternehmer" | "regelbesteuert";
    defaultVatRate: 7 | 19;
    taxNumber?: string;
    role?: "business" | "admin";
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfileLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "payalarm-lang";
export const JUST_SIGNED_UP_KEY = "payalarm:justSignedUp";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      if (p.company_id) {
        const { data: comp } = await supabase
          .from("companies")
          .select("*")
          .eq("id", p.company_id)
          .maybeSingle();
        setCompany((comp as Company) ?? null);
      } else {
        setCompany(null);
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        void i18n.changeLanguage(saved);
      } else if (p.language && p.language !== "en") {
        void i18n.changeLanguage(p.language);
      }
    }
  }, []);

  useEffect(() => {
    // Register the listener BEFORE checking for an existing session.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setUser(nextSession?.user ?? null);
        setSession(nextSession);

        if (nextSession?.user) {
          setTimeout(() => {
            void loadProfile(nextSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setCompany(null);
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
          setCompany(null);
        }
      },
    );

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      companyName?: string;
      vatStatus: "kleinunternehmer" | "regelbesteuert";
      defaultVatRate: 7 | 19;
      taxNumber?: string;
      role?: "business" | "admin";
    }) => {
      const role = input.role ?? "business";
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName, role },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;

      const newUser = data.user;
      if (!newUser) throw new Error("auth.genericError");

      // Marks a fresh signup so the route guard can show the welcome screen
      // once, instead of redirecting straight to the portal.
      try {
        sessionStorage.setItem(JUST_SIGNED_UP_KEY, "1");
      } catch {
        /* storage may be unavailable — welcome screen is optional */
      }

      // Admin accounts get no company — they use the admin console directly.
      if (role === "admin") {
        await supabase.from("profiles").update({ role: "admin" }).eq("id", newUser.id);
        await loadProfile(newUser.id);
        return;
      }

      const { data: companyData, error: compError } = await supabase
        .from("companies")
        .insert({
          name: input.companyName?.trim() || `${input.fullName}'s Company`,
          plan: "trial",
          trial_ends_at: new Date(
            Date.now() + 14 * 86400000,
          ).toISOString(),
          status: "active",
          currency: "EUR",
          vat_status: input.vatStatus,
          default_vat_rate: input.defaultVatRate,
          tax_number: input.taxNumber?.trim() || null,
        })
        .select()
        .single();
      if (compError) throw compError;

      await supabase
        .from("profiles")
        .update({ company_id: (companyData as Company).id })
        .eq("id", newUser.id);

      await supabase.from("subscriptions").insert({
        company_id: (companyData as Company).id,
        plan: "professional",
        status: "trialing",
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 14 * 86400000).toISOString(),
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      });

      await loadProfile(newUser.id);
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (s?.user) {
      await loadProfile(s.user.id);
    }
  }, [loadProfile]);

  const setProfileLanguage = useCallback(
    async (lang: string) => {
      localStorage.setItem(STORAGE_KEY, lang);
      if (user) {
        await supabase
          .from("profiles")
          .update({ language: lang })
          .eq("id", user.id);
        setProfile((p) => (p ? { ...p, language: lang } : p));
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      company,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setProfileLanguage,
    }),
    [
      user,
      session,
      profile,
      company,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setProfileLanguage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
