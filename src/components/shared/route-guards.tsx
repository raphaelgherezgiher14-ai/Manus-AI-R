import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth, JUST_SIGNED_UP_KEY } from "@/hooks/use-auth";
import type { Role } from "@/types";

// eslint-disable-next-line react-refresh/only-export-components
export function homeForRole(role?: Role | null): string {
  if (role === "admin") return "/admin";
  // Customer accounts no longer have a portal: they reach documents via magic links.
  return "/app";
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (profile?.role !== role) {
    return <Navigate to={homeForRole(profile?.role)} replace />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading || (user && !profile)) {
    return <LoadingScreen />;
  }

  if (user && profile) {
    // A brand-new signup lands on the welcome screen once; that page clears the flag.
    let justSignedUp = false;
    try {
      justSignedUp = sessionStorage.getItem(JUST_SIGNED_UP_KEY) === "1";
    } catch {
      justSignedUp = false;
    }
    return <Navigate to={justSignedUp ? "/welcome" : homeForRole(profile.role)} replace />;
  }

  return <>{children}</>;
}
