"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";
import { loginAction, logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { Lock, LogOut } from "lucide-react";

export function LoginDialog() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await loginAction(password);
    if (res.success) {
      toast.success("Login realizado com sucesso");
      setOpen(false);
      setPassword("");
      router.refresh();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await logoutAction();
    toast.success("Logout realizado");
    router.refresh();
  }

  if (isAdmin) {
    return (
      <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground flex gap-1.5 items-center">
        <LogOut size={16} /> Sair
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground flex gap-1.5 items-center">
          <Lock size={16} /> Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acesso Restrito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 pt-4">
          <Input
            type="password"
            placeholder="Senha de administrador"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <Button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white" disabled={loading || !password}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
