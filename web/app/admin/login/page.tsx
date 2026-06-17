'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/marketing/logo';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get('from') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result?.error) {
        toast.error(result.error.message || 'Identifiants invalides');
        setLoading(false);
        return;
      }
      toast.success('Connexion réussie');
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="p-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Accueil
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-24">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col items-center text-center">
            <Logo size={52} />
            <h1 className="mt-6 text-[22px] font-semibold tracking-tight text-fg">
              Panneau d’administration
            </h1>
            <p className="mt-2 text-[13.5px] text-muted">
              Connectez-vous pour gérer vos instances.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-card border border-border bg-surface p-6"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="admin@pilote.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="mt-5 text-center font-mono text-[11px] text-muted-3">
            Accès réservé à l’équipe
          </p>
        </div>
      </div>
    </div>
  );
}
