import { ReactNode } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { authStore, useAuth } from "@/lib/auth-store";
import { useDismissals } from "@/lib/dismissals-store";

interface PageShellProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, eyebrow, description, actions, children }: PageShellProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const dismissals = useDismissals();
  const pendingDem = dismissals.filter((d) => d.status === "pendente").length;
  const user = auth.currentUser;
  const initials = user
    ? user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "??";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
        <SidebarTrigger />
        <div className="hidden flex-1 max-w-md items-center gap-2 rounded-md border border-input bg-muted/40 px-3 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionário, CPF, obra..."
            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Notificações" asChild className="relative">
            <Link to="/admin/demissoes">
              <Bell className="h-4 w-4" />
              {pendingDem > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[9px]">
                  {pendingDem}
                </Badge>
              )}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-right leading-tight md:block">
              <p className="text-xs font-semibold">{user?.name ?? "Convidado"}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {user?.role ?? "—"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair"
            onClick={() => {
              authStore.logout();
              navigate({ to: "/login", search: { redirect: "/" } });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-5 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-2xl md:text-4xl break-words">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 md:[&>*]:flex-none">{actions}</div>}
        </div>
      </div>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
