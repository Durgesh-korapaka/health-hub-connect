import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ doctors: number; appts: number; pending: number; records: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (primaryRole(roles) !== "admin") { navigate({ to: "/dashboard" }); return; }
    (async () => {
      const [d, a, p, r] = await Promise.all([
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("medical_records").select("id", { count: "exact", head: true }),
      ]);
      setStats({ doctors: d.count ?? 0, appts: a.count ?? 0, pending: p.count ?? 0, records: r.count ?? 0 });
      const { data: recentAppts } = await supabase.from("appointments")
        .select("id,appointment_date,appointment_time,status,doctors(full_name)")
        .order("created_at", { ascending: false }).limit(10);
      setRecent(recentAppts ?? []);
    })();
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview.</p>
          </div>
          <Button asChild><Link to="/admin/doctors">Manage Doctors</Link></Button>
        </div>
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Doctors", value: stats.doctors },
              { label: "Appointments", value: stats.appts },
              { label: "Pending", value: stats.pending },
              { label: "Records", value: stats.records },
            ].map((s) => (
              <Card key={s.label}><CardContent className="py-6">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-3xl font-bold">{s.value}</div>
              </CardContent></Card>
            ))}
          </div>
        )}
        <Card>
          <CardHeader><CardTitle>Recent Appointments</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? <p className="text-muted-foreground">No appointments yet.</p> : (
              <div className="space-y-2">
                {recent.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{a.doctors?.full_name ?? "—"}</div>
                      <div className="text-sm text-muted-foreground">{a.appointment_date} at {String(a.appointment_time).slice(0, 5)}</div>
                    </div>
                    <Badge variant="secondary">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
