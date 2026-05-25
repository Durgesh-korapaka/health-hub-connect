import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Appt = {
  id: string; patient_id: string; appointment_date: string; appointment_time: string; reason: string | null; status: string;
};

export const Route = createFileRoute("/doctor")({
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appt[] | null>(null);
  const [patients, setPatients] = useState<Record<string, string>>({});

  const load = useCallback(async (docId: string) => {
    const { data } = await supabase.from("appointments").select("id,patient_id,appointment_date,appointment_time,reason,status")
      .eq("doctor_id", docId).order("appointment_date", { ascending: false }).order("appointment_time");
    const list = (data ?? []) as Appt[];
    setAppts(list);
    const ids = [...new Set(list.map((a) => a.patient_id))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      const map: Record<string, string> = {};
      (p ?? []).forEach((row) => { map[row.id] = row.full_name || "Patient"; });
      setPatients(map);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (primaryRole(roles) !== "doctor" && primaryRole(roles) !== "admin") { navigate({ to: "/dashboard" }); return; }
    supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) { setAppts([]); return; }
      setDoctorId(data.id);
      load(data.id);
    });
  }, [user, roles, loading, navigate, load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); if (doctorId) load(doctorId); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todays = (appts ?? []).filter((a) => a.appointment_date === today);
  const upcoming = (appts ?? []).filter((a) => a.appointment_date > today);
  const past = (appts ?? []).filter((a) => a.appointment_date < today);

  const Section = ({ title, list }: { title: string; list: Appt[] }) => (
    <Card>
      <CardHeader><CardTitle>{title} <span className="text-sm font-normal text-muted-foreground">({list.length})</span></CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <div className="space-y-3">
            {list.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <div className="font-medium">{patients[a.patient_id] ?? "Patient"}</div>
                  <div className="text-sm text-muted-foreground">{a.appointment_date} at {String(a.appointment_time).slice(0, 5)}</div>
                  {a.reason && <div className="text-sm mt-1">"{a.reason}"</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{a.status}</Badge>
                  {a.status === "pending" && <Button size="sm" onClick={() => setStatus(a.id, "confirmed")}>Confirm</Button>}
                  {a.status !== "completed" && a.status !== "cancelled" && (
                    <RecordDialog appointmentId={a.id} patientId={a.patient_id} doctorId={doctorId!} onSaved={() => doctorId && load(doctorId)} />
                  )}
                  {a.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "cancelled")}>Cancel</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Manage your appointments and patient records.</p>
        </div>
        {appts === null ? <p className="text-muted-foreground">Loading…</p>
          : doctorId === null ? <Card><CardContent className="py-8 text-center text-muted-foreground">Your doctor profile hasn't been linked yet. Ask an admin to link your account.</CardContent></Card>
          : (
            <>
              <Section title="Today" list={todays} />
              <Section title="Upcoming" list={upcoming} />
              <Section title="Past" list={past} />
            </>
          )}
      </div>
    </div>
  );
}

function RecordDialog({ appointmentId, patientId, doctorId, onSaved }: { appointmentId: string; patientId: string; doctorId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("medical_records").insert({
      appointment_id: appointmentId, patient_id: patientId, doctor_id: doctorId,
      diagnosis: String(fd.get("diagnosis")).slice(0, 500),
      prescription: String(fd.get("prescription") || "").slice(0, 1000) || null,
      notes: String(fd.get("notes") || "").slice(0, 1000) || null,
    });
    if (!error) await supabase.from("appointments").update({ status: "completed" }).eq("id", appointmentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Record saved"); setOpen(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Complete + Record</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add medical record</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="diag">Diagnosis</Label><Input id="diag" name="diagnosis" required maxLength={500} /></div>
          <div><Label htmlFor="presc">Prescription</Label><Textarea id="presc" name="prescription" maxLength={1000} /></div>
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" maxLength={1000} /></div>
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Save record"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
