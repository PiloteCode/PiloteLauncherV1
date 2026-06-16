'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileBox, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Instance } from '@pilote/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoaderBadge } from './loader-badge';
import { VisibilityBadge } from './visibility-badge';
import { apiJson, coverGradient, formatBytes, formatDate, initials, totalSize } from './lib';

export function InstanceTable({ instances }: { instances: Instance[] }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiJson<void>(`/api/admin/instances/${pendingDelete.id}`, { method: 'DELETE' });
      toast.success(`Instance « ${pendingDelete.name} » supprimée`);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[34%]">Instance</TableHead>
              <TableHead>Visibilité</TableHead>
              <TableHead>Version MC</TableHead>
              <TableHead>Loader</TableHead>
              <TableHead>Fichiers</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="w-[52px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const files = inst.files ?? [];
              return (
                <TableRow key={inst.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/instances/${inst.id}`}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] text-[11px] font-semibold text-white/90"
                        style={
                          inst.cover
                            ? { backgroundImage: `url(${inst.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : { backgroundImage: coverGradient(inst.name) }
                        }
                      >
                        {inst.cover ? '' : initials(inst.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-fg-1 group-hover:text-fg">
                          {inst.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-3">v{inst.version}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <VisibilityBadge visibility={inst.visibility} />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12.5px] text-fg-3">{inst.mcVersion}</span>
                  </TableCell>
                  <TableCell>
                    <LoaderBadge loader={inst.loader} version={inst.loaderVersion} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
                      <FileBox className="h-3.5 w-3.5 text-muted-3" />
                      {files.length}
                      <span className="text-muted-3">·</span>
                      <span className="font-mono text-[11.5px] text-muted-2">
                        {formatBytes(totalSize(files))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[12.5px] text-muted-2">{formatDate(inst.updatedAt)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-2 hover:text-fg"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => router.push(`/admin/instances/${inst.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                          Éditer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setPendingDelete(inst);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l’instance ?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? (
                <>
                  « {pendingDelete.name} » et tous ses fichiers attachés seront supprimés
                  définitivement. Cette action est irréversible.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
