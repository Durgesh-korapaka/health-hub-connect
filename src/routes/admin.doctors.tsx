import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Doctor = { id: string; full_name: string; specialization: string; bio: string | null; consultation_fee: number; user_id: string | null };

export const Route = createFileRoute("/admin/doctors")({
  component: ManageDoctors,
});

function ManageDoctors() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doctor[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => supabase.from("doctors").select("*").order("full_name").then(({ data }) => setDocs((data ?? []) as Doctor[]));

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (primaryRole(roles) !== "admin") { navigate({ to: "/dashboard" }); return; }
    load();
  }, [user, roles, loading, navigate]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("doctors").insert({
      full_name: String(fd.get("full_name")).slice(0, 100),
      specialization: String(fd.get("specialization")).slice(0, 100),
      bio: String(fd.get("bio") || "").slice(0, 500) || null,
      consultation_fee: Number(fd.get("consultation_fee") || 0),
    });
    if (error) return toast.error(error.message);
    toast.success("Doctor added");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this doctor?")) return;
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Doctors</h1>
            <p className="text-muted-foreground">Add and remove doctors in the directory.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add doctor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New doctor</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div><Label>Full name</Label><Input name="full_name" required maxLength={100} /></div>
                <div><Label>Specialization</Label><Input name="specialization" required maxLength={100} /></div>
                <div><Label>Bio</Label><Textarea name="bio" maxLength={500} /></div>
                <div><Label>Consultation fee ($)</Label><Input name="consultation_fee" type="number" min={0} step="0.01" defaultValue={50} required /></div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader><CardTitle>Directory</CardTitle></CardHeader>
          <CardContent>
            {docs === null ? <p className="text-muted-foreground">Loading…</p>
              : docs.length === 0 ? <p className="text-muted-foreground">No doctors yet.</p>
              : (
                <div className="space-y-3">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="font-medium">{d.full_name}</div>
                        <div className="text-sm text-muted-foreground">{d.specialization} · ${Number(d.consultation_fee).toFixed(0)}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => del(d.id)}>Delete</Button>
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
