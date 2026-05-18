import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSites } from "@/lib/sites-store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/funcionarios/novo")({
  head: () => ({ meta: [{ title: "Novo cadastro · Bucagrans RH" }] }),
  component: NewEmployee,
});

function NewEmployee() {
  const navigate = useNavigate();
  const sites = useSites();
  const [accountType, setAccountType] = useState<"cc" | "cp">("cc");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Funcionário cadastrado com sucesso.");
      navigate({ to: "/funcionarios" });
    }, 600);
  };

  return (
    <PageShell
      eyebrow="Admissão"
      title="Novo funcionário"
      description="Preencha as informações para registrar um novo colaborador no quadro."
      actions={
        <Button variant="outline" asChild>
          <Link to="/funcionarios"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome completo" required><Input required placeholder="Ex: João da Silva" /></FormField>
            <FormField label="CPF" required><Input required placeholder="000.000.000-00" /></FormField>
            <FormField label="RG"><Input placeholder="00.000.000-0" /></FormField>
            <FormField label="Data de nascimento"><Input type="date" /></FormField>
            <FormField label="E-mail"><Input type="email" placeholder="nome@bucagrans.com.br" /></FormField>
            <FormField label="Telefone"><Input placeholder="(00) 00000-0000" /></FormField>
            <FormField label="Endereço" className="md:col-span-2"><Input placeholder="Rua, número, bairro, cidade" /></FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Vínculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Cargo" required><Input required placeholder="Ex: Pedreiro" /></FormField>
            <FormField label="Departamento" required>
              <Select>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Obra">Obra</SelectItem>
                  <SelectItem value="Engenharia">Engenharia</SelectItem>
                  <SelectItem value="Seguranca">Segurança</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Obra alocada">
              <Select>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Data de admissão" required><Input type="date" required /></FormField>
            <FormField label="Salário base"><Input type="number" placeholder="0,00" /></FormField>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">Documentos trabalhistas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField label="CTPS"><Input placeholder="0000000/0000" /></FormField>
            <FormField label="PIS/PASEP"><Input placeholder="000.00000.00-0" /></FormField>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">Dados bancários</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField label="Banco"><Input placeholder="Ex: Itaú, Bradesco, Caixa" /></FormField>
            <FormField label="Agência"><Input placeholder="0000" /></FormField>
            <FormField label="Conta"><Input placeholder="00000-0" /></FormField>
            <FormField label="Tipo de conta">
              <RadioGroup
                value={accountType}
                onValueChange={(v) => setAccountType(v as "cc" | "cp")}
                className="flex gap-4 pt-2"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <RadioGroupItem value="cc" /> Conta Corrente
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <RadioGroupItem value="cp" /> Conta Poupança
                </label>
              </RadioGroup>
            </FormField>
            <FormField label="Chave PIX" className="md:col-span-2">
              <Input placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 lg:col-span-3">
          <Button type="button" variant="ghost" asChild>
            <Link to="/funcionarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : (<><Save className="mr-1 h-4 w-4" /> Cadastrar funcionário</>)}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function FormField({
  label, required, children, className = "",
}: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
