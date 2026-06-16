'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Boxes, Plus, RefreshCw } from 'lucide-react';
import { ListInstancesResponseSchema, type Instance } from '@pilote/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InstanceTable } from '@/components/admin/instance-table';
import { readApiError } from '@/components/admin/lib';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; instances: Instance[] };

export default function AdminDashboardPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/instances', { cache: 'no-store' });
      if (!res.ok) {
        setState({ status: 'error', message: await readApiError(res) });
        return;
      }
      const json = await res.json();
      const parsed = ListInstancesResponseSchema.parse(json);
      const instances = [...parsed.instances].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
      setState({ status: 'ready', instances });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Chargement impossible',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Instances</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Gérez vos modpacks distribués — publics et privés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void load()}
            disabled={state.status === 'loading'}
            aria-label="Rafraîchir"
          >
            <RefreshCw className={state.status === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button asChild className="gap-1.5">
            <Link href="/admin/instances/new">
              <Plus className="h-4 w-4" />
              Nouvelle instance
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {state.status === 'loading' && <DashboardSkeleton />}

        {state.status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-2 bg-surface-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-fg-1">Impossible de charger les instances</p>
              <p className="mt-1 font-mono text-[12px] text-muted-2">{state.message}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Réessayer
            </Button>
          </div>
        )}

        {state.status === 'ready' && state.instances.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border-2 bg-surface/50 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-border-2 bg-surface-2 text-muted-2">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-fg-1">Aucune instance pour l’instant</p>
              <p className="mt-1 max-w-sm text-[13px] text-muted">
                Créez votre première instance, ajoutez des mods, puis partagez-la avec vos
                joueurs.
              </p>
            </div>
            <Button asChild className="gap-1.5">
              <Link href="/admin/instances/new">
                <Plus className="h-4 w-4" />
                Créer une instance
              </Link>
            </Button>
          </div>
        )}

        {state.status === 'ready' && state.instances.length > 0 && (
          <InstanceTable instances={state.instances} />
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="border-b border-border-subtle px-4 py-3">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-9 w-9 rounded-[9px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
