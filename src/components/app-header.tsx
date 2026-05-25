import { Link, useNavigate } from "@tanstack/react-router";
import { Stethoscope, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, primaryRole } from "@/hooks/use-auth";

export function AppHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const role = primaryRole(roles);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span>MediCare</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-accent">Dashboard</Link>
              {role === "patient" && (
                <>
                  <Link to="/doctors" className="px-3 py-1.5 rounded-md hover:bg-accent">Doctors</Link>
                  <Link to="/my-appointments" className="px-3 py-1.5 rounded-md hover:bg-accent">My Appointments</Link>
                </>
              )}
              {role === "admin" && <Link to="/admin/doctors" className="px-3 py-1.5 rounded-md hover:bg-accent">Manage Doctors</Link>}
              <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" />Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/doctors" className="px-3 py-1.5 rounded-md hover:bg-accent">Doctors</Link>
              <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
