import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-store";
import { isClientAllowedUrl } from "@/lib/client-helpers";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Erro 404</p>
        <h1 className="mt-3 font-display text-5xl">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O recurso solicitado não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bucagrans · RH da Construção" },
      { name: "description", content: "Sistema de RH para empresas de obras — cadastros, folha salarial e gestão de canteiro." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!auth.loading && !auth.currentUser && !isLogin) {
      navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [auth.currentUser, auth.loading, navigate, pathname, isLogin]);

  // Verificar se cliente está tentando acessar URL não permitida
  useEffect(() => {
    if (!auth.loading && auth.currentUser && !isClientAllowedUrl(pathname, auth.currentUser)) {
      console.warn(`Cliente tentou acessar URL não permitida: ${pathname}`);
      navigate({ to: "/" });
    }
  }, [pathname, auth.currentUser, auth.loading, navigate]);

  if (auth.loading && !isLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center" suppressHydrationWarning>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {auth.currentUser && !isLogin ? (
        <SidebarProvider>
          <AppSidebar />
          <main className="w-full">
            <Outlet />
            <Toaster />
          </main>
        </SidebarProvider>
      ) : (
        <>
          <Outlet />
          <Toaster />
        </>
      )}
    </QueryClientProvider>
  );
}
