'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  FileBox,
  Loader2,
  Package,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  InstanceSchema,
  ModMetadataSchema,
  type FileTarget,
  type Instance,
  type InstanceFile,
  type ModMetadata,
} from '@pilote/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  formatBytes,
  readApiError,
  shortHash,
  TARGET_LABEL,
  TARGET_ORDER,
  totalSize,
} from './lib';

/**
 * Admin file rows carry an `id` (for PATCH/DELETE by fileId) and parsed `modMetadata`,
 * which the admin API includes in addition to the public InstanceFile fields.
 */
type AdminFile = InstanceFile & {
  id?: string;
  modMetadata?: ModMetadata | string | null;
};

const TARGETS: FileTarget[] = [...TARGET_ORDER];

function parseMeta(raw: AdminFile['modMetadata']): ModMetadata | null {
  if (!raw) return null;
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const parsed = ModMetadataSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function FileManager({
  instance,
  onChange,
}: {
  instance: Instance;
  /** Called with the fresh instance returned by the API after a successful mutation. */
  onChange: (instance: Instance) => void;
}) {
  const files = (instance.files ?? []) as AdminFile[];
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploadTarget, setUploadTarget] = useState<FileTarget>('mods');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<FileTarget, AdminFile[]>();
    for (const t of TARGETS) map.set(t, []);
    for (const f of files) {
      const list = map.get(f.target) ?? [];
      list.push(f);
      map.set(f.target, list);
    }
    return TARGETS.map((t) => ({ target: t, files: map.get(t) ?? [] })).filter(
      (g) => g.files.length > 0,
    );
  }, [files]);

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (arr.length === 0) return;
      setUploading(true);
      const fd = new FormData();
      for (const f of arr) fd.append('files', f);
      try {
        const res = await fetch(
          `/api/admin/instances/${instance.id}/files?target=${uploadTarget}`,
          { method: 'POST', body: fd },
        );
        if (!res.ok) throw new Error(await readApiError(res));
        const updated = InstanceSchema.parse(await res.json());
        onChange(updated);
        toast.success(
          arr.length === 1
            ? `« ${arr[0]?.name} » ajouté`
            : `${arr.length} fichiers ajoutés`,
          { description: `Cible : ${TARGET_LABEL[uploadTarget]}` },
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload impossible');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [instance.id, uploadTarget, onChange],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) void upload(e.dataTransfer.files);
    },
    [upload],
  );

  const onPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) void upload(e.target.files);
    },
    [upload],
  );

  async function patchFile(file: AdminFile, patch: { enabled?: boolean; target?: FileTarget }) {
    if (!file.id) {
      toast.error('Identifiant de fichier manquant — rechargez la page.');
      return;
    }
    setBusyFileId(file.id);
    try {
      const res = await fetch(`/api/admin/instances/${instance.id}/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = InstanceSchema.parse(await res.json());
      onChange(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Modification impossible');
    } finally {
      setBusyFileId(null);
    }
  }

  async function deleteFile(file: AdminFile) {
    if (!file.id) {
      toast.error('Identifiant de fichier manquant — rechargez la page.');
      return;
    }
    setBusyFileId(file.id);
    try {
      const res = await fetch(`/api/admin/instances/${instance.id}/files/${file.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      // 204: refetch the instance to get the new version + file list.
      const refetch = await fetch(`/api/admin/instances`, { cache: 'no-store' });
      if (refetch.ok) {
        const json = (await refetch.json()) as { instances: Instance[] };
        const fresh = json.instances.find((i) => i.id === instance.id);
        if (fresh) onChange(fresh);
      }
      toast.success(`« ${file.path} » supprimé`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setBusyFileId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <label className="mb-1.5 block text-[12.5px] font-medium text-fg-3">Dossier cible</label>
          <Select value={uploadTarget} onValueChange={(v) => setUploadTarget(v as FileTarget)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TARGET_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver
            ? 'border-accent bg-[color-mix(in_oklch,var(--accent)_8%,transparent)]'
            : 'border-border-2 bg-surface/40 hover:border-border-hover',
        )}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={onPick} />
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-2 bg-surface-2 text-accent">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}
        </div>
        <p className="text-[14px] font-medium text-fg-2">
          {uploading ? 'Upload en cours…' : 'Glissez vos fichiers ici'}
        </p>
        <p className="text-[12.5px] text-muted">
          ou cliquez pour parcourir · cible{' '}
          <span className="font-mono text-muted-2">{TARGET_LABEL[uploadTarget]}</span>
        </p>
        <p className="font-mono text-[11px] text-muted-3">
          hachés en SHA-1, dédupliqués et analysés automatiquement
        </p>
      </div>

      {/* File table */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-2 bg-surface/40 px-6 py-12 text-center">
          <FileBox className="h-6 w-6 text-muted-3" />
          <p className="text-[13.5px] text-muted">Aucun fichier pour l’instant.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
            <span className="text-[12.5px] font-medium text-fg-3">
              {files.length} fichier{files.length > 1 ? 's' : ''}
            </span>
            <span className="font-mono text-[11.5px] text-muted-2">
              {formatBytes(totalSize(files))}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[36%]">Fichier</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Dossier</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="w-[48px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((group) =>
                group.files.map((file) => {
                  const meta = parseMeta(file.modMetadata);
                  const rowKey = file.id ?? `${file.target}:${file.sha1}:${file.path}`;
                  const busy = busyFileId != null && busyFileId === file.id;
                  return (
                    <TableRow key={rowKey} className={cn(busy && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-3" />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-fg-2">
                              {file.path}
                            </div>
                            {meta && (meta.name || meta.modId || meta.version) ? (
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {meta.modId ? (
                                  <span className="rounded-[5px] border border-border-2 bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted-2">
                                    {meta.modId}
                                  </span>
                                ) : null}
                                {meta.version ? (
                                  <span className="rounded-[5px] border border-border-2 bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted-2">
                                    v{meta.version}
                                  </span>
                                ) : null}
                                {meta.loader ? (
                                  <span className="rounded-[5px] border border-border-2 bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted-2">
                                    {meta.loader}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default font-mono text-[11.5px] text-muted-2">
                              {shortHash(file.sha1)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="font-mono text-[11px]">{file.sha1}</span>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11.5px] text-muted-2">
                          {formatBytes(file.sizeBytes)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={file.target}
                          onValueChange={(v) => void patchFile(file, { target: v as FileTarget })}
                          disabled={busy || !file.id}
                        >
                          <SelectTrigger className="h-8 w-[148px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGETS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TARGET_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={file.enabled}
                          disabled={busy || !file.id}
                          onCheckedChange={(checked) => void patchFile(file, { enabled: checked })}
                          aria-label={file.enabled ? 'Désactiver' : 'Activer'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-2 hover:text-destructive"
                          disabled={busy || !file.id}
                          onClick={() => void deleteFile(file)}
                          aria-label="Supprimer le fichier"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
