import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmployeeStatus } from "@/lib/employees";

const labels: Record<EmployeeStatus, string> = {
  ativo: "Ativo",
  ferias: "Em férias",
  afastado: "Afastado",
  desligado: "Desligado",
};

const tone: Record<EmployeeStatus, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  ferias: "bg-accent/15 text-accent border-accent/30",
  afastado: "bg-warning/20 text-warning-foreground border-warning/40",
  desligado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", tone[status])}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </Badge>
  );
}
