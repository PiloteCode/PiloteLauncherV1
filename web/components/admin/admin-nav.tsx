'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import {
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { signOut, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/marketing/logo';

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/instances/new', label: 'Nouvelle instance', icon: Plus },
];

function avatarHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isPending } = useSession();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const user = data?.user;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Déconnecté');
      router.replace('/admin/login');
      router.refresh();
    } catch {
      toast.error('Échec de la déconnexion');
      setSigningOut(false);
    }
  }

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col border-r border-border-subtle bg-titlebar">
      <Link href="/admin" className="flex h-16 items-center gap-2.5 border-b border-border-subtle px-5">
        <Logo size={28} />
        <div className="leading-none">
          <div className="text-[14px] font-semibold tracking-tight text-fg">Pilote Project</div>
          <div className="mt-0.5 font-mono text-[10.5px] text-muted-3">admin</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.href, n.exact);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors',
                active
                  ? 'bg-[color-mix(in_oklch,var(--accent)_14%,transparent)] text-accent'
                  : 'text-muted hover:bg-surface-hover hover:text-fg',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border-subtle p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted hover:text-fg"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-[18px] w-[18px] dark:hidden" />
          <Moon className="hidden h-[18px] w-[18px] dark:block" />
          Thème
        </Button>

        <div className="flex items-center gap-2.5 rounded-[10px] border border-border-2 bg-surface p-2.5">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </>
          ) : (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{
                  background: `oklch(0.55 0.115 ${avatarHue(user?.email ?? user?.name ?? 'admin')})`,
                }}
              >
                {(user?.name ?? user?.email ?? 'A').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[12.5px] font-medium text-fg-2">
                  {user?.name ?? 'Admin'}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-3">
                  {user?.email ?? ''}
                </div>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-2 hover:text-destructive"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
