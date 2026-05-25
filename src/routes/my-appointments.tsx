import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Appt = {
  id: string; appointment_date: string; appointment_time: string; reason: string | null; status: string;
  doctors: { full_name: string; specialization: string } | null;
};

type MedRecord = {
  id: string; diagnosis: string; prescription: string | null; notes: string | null; created_at: string;
  doctors: { full_name: string } | null;
};

const statusColor: Record<string, string> = {
  pending: "bg-yellow-200/60 text-yellow-900",
  confirmed: "bg-primary/20 text-primary-foreground",
  completed: "bg-green-200/60 text-green-900",
  cancelled: "bg-red-200/60 text-red-900",
};

export const Route = createFileRoute("/my-appointments")({
  component: MyAppointmentsPage,
});

function MyAppointmentsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [appts, setAppts] = useState<Appt[] | null>(null);
  const [records, setRecords] = useState<MedRecord[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.from("appointments").select("id,appointment_date,appointment_time,reason,status,doctors(full_name,specialization)").eq("patient_id", user.id).order("appointment_date", { ascending: false }),
      supabase.from("medical_records").select("id,diagnosis,prescription,notes,created_at,doctors(full_name)").eq("patient_id", user.id).order("created_at", { ascending: false }),
    ]);
    setAppts((a ?? []) as unknown as Appt[]);
    setRecords((r ?? []) as unknown as MedRecord[]);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    load();
  }, [user, loading, navigate, load]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Appointment cancelled"); load(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground">Track upcoming visits and view your medical history.</p>
          </div>
          <Button asChild><Link to="/doctors">Book new</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Appointments</CardTitle></CardHeader>
          <CardContent>
            {appts === null ? <p className="text-muted-foreground">Loading…</p>
              : appts.length === 0 ? <p className="text-muted-foreground">No appointments yet. <Link to="/doctors" className="underline">Find a doctor</Link>.</p>
              : (
                <div className="space-y-3">
                  {appts.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                      <div>
                        <div className="font-medium">{a.doctors?.full_name ?? "—"} <span className="text-muted-foreground font-normal">· {a.doctors?.specialization}</span></div>
                        <div className="text-sm text-muted-foreground">{a.appointment_date} at {String(a.appointment_time).slice(0, 5)}</div>
                        {a.reason && <div className="text-sm mt-1">"{a.reason}"</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                        {(a.status === "pending" || a.status === "confirmed") && (
                          <Button variant="outline" size="sm" onClick={() => cancel(a.id)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Medical Records</CardTitle></CardHeader>
          <CardContent>
            {records === null ? <p className="text-muted-foreground">Loading…</p>
              : records.length === 0 ? <p className="text-muted-foreground">No records yet.</p>
              : (
                <div className="space-y-3">
                  {records.map((r) => (
                    <div key={r.id} className="rounded-lg border p-4">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{r.doctors?.full_name}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1"><span className="font-medium">Diagnosis:</span> {r.diagnosis}</div>
                      {r.prescription && <div><span className="font-medium">Prescription:</span> {r.prescription}</div>}
                      {r.notes && <div className="text-sm text-muted-foreground mt-1">{r.notes}</div>}
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
