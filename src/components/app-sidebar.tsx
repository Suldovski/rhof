import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  HardHat,
  FileText,
  Settings,
  Wallet,
  Clock,
  UserMinus,
  Receipt,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDismissals } from "@/lib/dismissals-store";
import { useAuth } from "@/lib/auth-store";
import { authStore } from "@/lib/auth-store";
import { useNavigate } from "@tanstack/react-router";
import * as Permissions from "@/lib/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// Menu items - shown based on user object (matriz vs obra)
const getMainMenuItems = (user?: any) => {
  const items: Array<{ title: string; url: string; icon: any }> = [];

  // For work-site users, hide Painel and Funcionários (they should only see limited set in ops)
  if (user && (Permissions.isWorkUser(user) || Permissions.isRhObra(user))) return items;

  // Painel - todos menos cliente
  if (Permissions.canAccessPainel(user?.role)) {
    items.push({ title: "Painel", url: "/", icon: LayoutDashboard });
  }

  // Funcionários - apenas perfis de matriz
  if (Permissions.canAccessFuncionarios(user?.role)) {
    items.push({ title: "Funcionários", url: "/funcionarios", icon: Users });
  }

  return items;
};

const getOpsMenuItems = (user?: any) => {
  const items: Array<{ title: string; url: string; icon: any }> = [];

  // If the user is a work-site user (rh_obra / work), only show a reduced set
  if (user && (Permissions.isWorkUser(user) || Permissions.isRhObra(user))) {
    // Obras
    if (Permissions.canAccessObras(user?.role)) items.push({ title: "Obras", url: "/obras", icon: HardHat });
    // Folha Salarial
    if (Permissions.canAccessFolhaSalarial(user?.role)) items.push({ title: "Folha Salarial", url: "/folha-salarial", icon: Wallet });
    // Documentos
    if (Permissions.canAccessDocumentos(user?.role)) items.push({ title: "Documentos", url: "/documentos", icon: FileText });
    // Note: Demissões and Configurações intentionally hidden for obra users per hierarchy rules
    return items;
  }

  // Default full set for matriz/admin
  if (Permissions.canAccessObras(user?.role)) items.push({ title: "Obras", url: "/obras", icon: HardHat });
  if (Permissions.canAccessFolhaSalarial(user?.role)) items.push({ title: "Folha Salarial", url: "/folha-salarial", icon: Wallet });
  if (Permissions.canAccessHorasExtras(user?.role)) items.push({ title: "Horas Extras", url: "/horas-extras", icon: Clock });
  if (Permissions.canAccessRDV(user?.role)) items.push({ title: "RDV", url: "/rdv", icon: Receipt });
  if (Permissions.canAccessDocumentos(user?.role)) items.push({ title: "Documentos", url: "/documentos", icon: FileText });

  return items;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const auth = useAuth();
  const navigate = useNavigate();
  const role = auth.currentUser?.role;

  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

  const handleLogout = async () => {
    await authStore.logout();
    navigate({ to: "/login", search: { redirect: "/" } });
  };

  const mainItems = getMainMenuItems(role);
  const opsItems = getOpsMenuItems(role);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-base text-sidebar-foreground">BUCAGRANS</p>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
                Recursos Humanos
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {mainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">
              Gestão de Pessoas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {opsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">
              Operação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {opsItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {Permissions.isRhMatriz(role) && (
            <AdminDemissoesItem />
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start h-9 px-2"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminDemissoesItem() {
  const items = useDismissals();
  const pending = items.filter((d) => d.status === "pendente").length;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to="/admin/demissoes">
          <UserMinus className="h-4 w-4" />
          <span>Demissões</span>
          {pending > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
              {pending}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
