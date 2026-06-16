'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ListInstancesResponseSchema, type Instance } from '@pilote/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstanceEditorForm } from './instance-editor-form';
import { FileManager } from './file-manager';
import { AccessCodePanel } from './access-code-panel';
import { LoaderBadge } from './loader-badge';
import { VisibilityBadge } from './visibility-badge';
import { readApiError } from './lib';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; instance: Instance };

export function InstanceEditor({ instanceId }: { instanceId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/instances', { cache: 'no-store' });
      if (!res.ok) {
        setState({ status: 'error', message: await readApiError(res) });
        return;
      }
      const parsed = ListInstancesResponseSchema.parse(await res.json());
      const found = parsed.instances.find((i) => i.id === instanceId);
      if (!found) {
        setState({ status: 'not-found' });
        return;
      }
      setState({ status: 'ready', instance: found });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Chargement impossible',
      });
    }
  }, [instanceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateInstance = useCallback((instance: Instance) => {
    setState({ status: 'ready', instance });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-8 py-9">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Toutes les instances
      </Link>

      {state.status === 'loading' && <EditorSkeleton />}

      {state.status === 'error' && (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-2 bg-surface-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="font-mono text-[12px] text-muted-2">{state.message}</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      )}

      {state.status === 'not-found' && (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border-2 bg-surface/50 px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-fg-1">Instance introuvable</p>
          <p className="max-w-sm text-[13px] text-muted">
            Elle a peut-être été supprimée. Retournez au tableau de bord.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin">Retour</Link>
          </Button>
        </div>
      )}

      {state.status === 'ready' && (
        <ReadyEditor instance={state.instance} onChange={updateInstance} />
      )}
    </div>
  );
}

function ReadyEditor({
  instance,
  onChange,
}: {
  instance: Instance;
  onChange: (instance: Instance) => void;
}) {
  return (
    <>
      <div className="mt-4 mb-7 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{instance.name}</h1>
        <VisibilityBadge visibility={instance.visibility} />
        <LoaderBadge loader={instance.loader} version={instance.loaderVersion} />
        <span className="font-mono text-[11.5px] text-muted-3">
          v{instance.version} · {instance.mcVersion}
        </span>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="files">
            Fichiers
            <span className="ml-1.5 rounded-[5px] bg-surface-3 px-1.5 py-px font-mono text-[10.5px] text-muted-2">
              {instance.files?.length ?? 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6 space-y-5">
          <InstanceEditorForm instance={instance} onSaved={onChange} />

          {instance.visibility === 'private' && (
            <>
              <Separator />
              <AccessCodePanel
                instanceId={instance.id}
                hasExistingCode={instance.visibility === 'private'}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FileManager instance={instance} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function EditorSkeleton() {
  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-9 w-64 rounded-[10px]" />
      <div className="rounded-card border border-border bg-surface p-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-5 flex gap-5">
          <Skeleton className="h-[88px] w-[120px] rounded-[12px]" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-9 w-full rounded-[10px]" />
            <Skeleton className="h-9 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  );
}
