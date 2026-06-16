'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, RotateCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AccessCodeResponseSchema } from '@pilote/types';
import { Button } from '@/components/ui/button';
import { apiJson } from './lib';

/**
 * Generates or rotates the private access code. The plaintext is returned by the API only
 * once (only the argon2 hash is stored), so we surface it prominently and let the admin copy it.
 */
export function AccessCodePanel({
  instanceId,
  hasExistingCode,
}: {
  instanceId: string;
  hasExistingCode: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await apiJson<unknown>(`/api/admin/instances/${instanceId}/access-code`, {
        method: 'POST',
      });
      const parsed = AccessCodeResponseSchema.parse(data);
      setCode(parsed.code);
      setCopied(false);
      toast.success('Code d’accès généré', {
        description: 'Copiez-le maintenant — il ne sera plus affiché.',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Génération impossible');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié dans le presse-papier');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copie impossible');
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border-2 bg-surface-2 text-accent">
          <KeyRound className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold text-fg-1">Code d’accès</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Cette instance est privée. Générez un code à transmettre aux joueurs. Seul son
            hash argon2 est stocké — le code en clair n’est affiché qu’une seule fois.
          </p>

          {code ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-[10px] border border-accent/40 bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface-input))] p-2.5">
                <code className="flex-1 select-all px-1 font-mono text-[15px] tracking-wider text-fg">
                  {code}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={copy}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié' : 'Copier'}
                </Button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-2">
                <ShieldAlert className="h-3.5 w-3.5 text-muted-3" />
                Conservez ce code en lieu sûr. Le régénérer invalidera l’ancien.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" onClick={generate} disabled={loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasExistingCode || code ? (
                <RotateCw className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {hasExistingCode || code ? 'Régénérer le code' : 'Générer un code'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
