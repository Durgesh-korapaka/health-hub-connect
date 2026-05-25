import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Doctor = { id: string; full_name: string; specialization: string; bio: string | null; consultation_fee: number };

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
});

function DoctorsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setDocs([]); return; }
    supabase.from("doctors").select("id,full_name,specialization,bio,consultation_fee").order("full_name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setDocs(data ?? []);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Our Doctors</h1>
            <p className="text-muted-foreground">Browse specialists and book an appointment.</p>
          </div>
        </div>
        {!user ? (
          <Card><CardContent className="py-10 text-center">
            <p className="mb-4 text-muted-foreground">Please sign in to view doctors and book appointments.</p>
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          </CardContent></Card>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : docs === null ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : docs.length === 0 ? (
          <p className="text-muted-foreground">No doctors available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Stethoscope className="h-5 w-5" /></div>
                    <div>
                      <CardTitle className="text-base">{d.full_name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{d.specialization}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">{d.bio ?? "—"}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold">${Number(d.consultation_fee).toFixed(0)}<span className="text-xs font-normal text-muted-foreground"> / visit</span></span>
                    <Button asChild size="sm"><Link to="/book/$doctorId" params={{ doctorId: d.id }}>Book</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
