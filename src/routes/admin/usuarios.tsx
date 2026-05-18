import { createFileRoute } from "@tanstack/react-router";
import { useAuthContext } from "@/lib/auth-context";
import { useAuth } from "@/lib/auth-store";
import { PageShell } from "@/components/page-shell";
import { CreateUserDialog, UsersManagementTable } from "@/components/users/user-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function UsersPage() {
  const { loading } = useAuthContext();
  const isAdmin = useAuth((state) => state.isAdmin());

  if (loading) {
    return (
      <PageShell title="Usuários" subtitle="Gerenciamento de usuários do sistema">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell title="Usuários" subtitle="Gerenciamento de usuários do sistema">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar esta página.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell 
      title="Usuários" 
      subtitle="Gerenciamento de usuários do sistema"
      action={<CreateUserDialog />}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Todos os Usuários</CardTitle>
            <CardDescription>
              Crie, edite e gerencie usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersManagementTable />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export const Route = createFileRoute("/admin/usuarios")({
  component: UsersPage,
});
