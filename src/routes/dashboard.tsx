import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, primaryRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    const role = primaryRole(roles);
    if (role === "admin") navigate({ to: "/admin" });
    else if (role === "doctor") navigate({ to: "/doctor" });
    else navigate({ to: "/my-appointments" });
  }, [user, roles, loading, navigate]);

  return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
}
