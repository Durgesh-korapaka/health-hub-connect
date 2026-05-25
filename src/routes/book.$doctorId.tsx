import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

type Doctor = { id: string; full_name: string; specialization: string; consultation_fee: number };
type Schedule = { day_of_week: number; start_time: string; end_time: string };

export const Route = createFileRoute("/book/$doctorId")({
  component: BookPage,
});

function BookPage() {
  const { doctorId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("doctors").select("id,full_name,specialization,consultation_fee").eq("id", doctorId).maybeSingle()
      .then(({ data }) => setDoctor(data as Doctor | null));
    supabase.from("doctor_schedules").select("day_of_week,start_time,end_time").eq("doctor_id", doctorId)
      .then(({ data }) => setSchedules((data ?? []) as Schedule[]));
  }, [doctorId, user, authLoading, navigate]);

  useEffect(() => {
    if (!date) { setBookedTimes([]); return; }
    supabase.from("appointments").select("appointment_time").eq("doctor_id", doctorId).eq("appointment_date", date).neq("status", "cancelled")
      .then(({ data }) => setBookedTimes((data ?? []).map((r) => String(r.appointment_time).slice(0, 5))));
  }, [date, doctorId]);

  const dayOfWeek = date ? new Date(date + "T00:00:00").getDay() : -1;
  const sched = schedules.find((s) => s.day_of_week === dayOfWeek);

  const slots: string[] = [];
  if (sched) {
    const [sh, sm] = sched.start_time.split(":").map(Number);
    const [eh, em] = sched.end_time.split(":").map(Number);
    let m = sh * 60 + sm;
    const end = eh * 60 + em;
    while (m < end) {
      const h = Math.floor(m / 60), mm = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
      m += 30;
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !date || !time) return;
    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      reason: reason.slice(0, 500),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Appointment requested!");
    navigate({ to: "/my-appointments" });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {!doctor ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Book with {doctor.full_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{doctor.specialization} · ${Number(doctor.consultation_fee).toFixed(0)} per visit</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} required />
                </div>
                <div>
                  <Label>Time slot</Label>
                  {!date ? (
                    <p className="text-sm text-muted-foreground mt-2">Choose a date first.</p>
                  ) : !sched ? (
                    <p className="text-sm text-muted-foreground mt-2">Doctor is not available on this day.</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {slots.map((s) => {
                        const taken = bookedTimes.includes(s);
                        return (
                          <button type="button" key={s} disabled={taken}
                            onClick={() => setTime(s)}
                            className={`rounded-md border px-2 py-1.5 text-sm transition ${taken ? "opacity-40 cursor-not-allowed line-through" : time === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="reason">Reason for visit</Label>
                  <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
                </div>
                <Button type="submit" disabled={!time || submitting} className="w-full">
                  {submitting ? "Booking…" : "Confirm appointment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
