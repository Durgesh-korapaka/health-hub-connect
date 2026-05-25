import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Users, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Healthcare made simple</span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">Book care. Track health. <span className="text-primary">Stay connected.</span></h1>
          <p className="mt-6 text-lg text-muted-foreground">A complete appointment and patient-record system for clinics — patients book, doctors manage, admins oversee.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/doctors">Browse doctors</Link></Button>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Calendar, title: "Easy scheduling", desc: "See real availability and book in seconds." },
            { icon: Users, title: "Doctor directory", desc: "Browse specialists with bios and consultation fees." },
            { icon: FileText, title: "Medical records", desc: "Diagnoses, prescriptions, and notes — all in one place." },
            { icon: Shield, title: "Secure by design", desc: "Role-based access keeps patient data private." },
            { icon: Calendar, title: "Doctor schedules", desc: "Doctors see today's appointments at a glance." },
            { icon: Users, title: "Admin oversight", desc: "Manage doctors and view system activity." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><f.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© 2026 MediCare — Demo healthcare system</footer>
    </div>
  );
}
