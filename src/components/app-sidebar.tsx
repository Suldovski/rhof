import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  HardHat,
  FileText,
  Settings,
  Wallet,
  Receipt,
  Clock,
  UserMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDismissals } from "@/lib/dismissals-store";

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

const main = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Funcionários", url: "/funcionarios", icon: Users },
  { title: "Novo Cadastro", url: "/funcionarios/novo", icon: UserPlus },
];

const ops = [
  { title: "Obras", url: "/obras", icon: HardHat },
  { title: "Folha Salarial", url: "/folha-salarial", icon: Wallet },
  { title: "Horas Extras", url: "/horas-extras", icon: Clock },
  { title: "RDV", url: "/rdv", icon: Receipt },
  { title: "Documentos", url: "/documentos", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            Gestão de Pessoas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            Operação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ops.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <AdminDemissoesItem />
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
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
