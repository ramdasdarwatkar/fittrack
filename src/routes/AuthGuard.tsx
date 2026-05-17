import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ProfileService } from "@/services/ProfileService";

export default function AuthGuard() {
  const [status, setStatus] = useState<
    "loading" | "unauth" | "onboard" | "ready"
  >("loading");
  const location = useLocation();

  const initAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("unauth");
      return;
    }

    const profileExists = await ProfileService.checkAndSyncProfile(
      session.user.id,
    );

    if (!profileExists) {
      setStatus("onboard");
    } else {
      setStatus("ready");
    }
  };

  useEffect(() => {
    const runValidation = async () => {
      await initAuth();
    };
    runValidation();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setStatus("unauth");
      else {
        initAuth();
      }
    });

    const handleReevaluate = () => {
      initAuth();
    };
    window.addEventListener("auth_reevaluate", handleReevaluate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("auth_reevaluate", handleReevaluate);
    };
  }, []);

  if (status === "loading") {
    return <div className="h-svh w-full bg-background" />;
  }

  const path = location.pathname;

  if (status === "unauth" && path !== "/login")
    return <Navigate to="/login" replace />;
  if (status === "onboard" && path !== "/onboarding")
    return <Navigate to="/onboarding" replace />;

  // TARGETED ENTRY FIX: Inject the synchronization token ONLY during entry transitions
  if (status === "ready" && (path === "/login" || path === "/onboarding")) {
    return <Navigate to="/" replace state={{ syncOnMount: true }} />;
  }

  return <Outlet />;
}
