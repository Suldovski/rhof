import { ReactNode } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authStore, useAuth } from "@/lib/auth-store";

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
  const user = auth.users.find((u) => u.id === auth.currentUserId);
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
          <Button variant="ghost" size="icon" aria-label="Notificações">
            <Bell className="h-4 w-4" />
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
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
