'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Markdown from 'react-markdown';
import { Eye, Loader2, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstanceSchema,
  LOADER_LABEL,
  ModLoaderSchema,
  UpsertInstanceRequestSchema,
  type Instance,
  type InstanceVisibility,
  type ModLoader,
  type UpsertInstanceRequest,
} from '@pilote/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { VisibilityToggle } from './visibility-toggle';
import { coverGradient, initials, readApiError } from './lib';

const LOADERS = ModLoaderSchema.options;
const RAM_MIN = 1024;
const RAM_MAX = 16384;
const RAM_STEP = 512;

type FormState = {
  name: string;
  cover: string;
  description: string;
  changelog: string;
  mcVersion: string;
  loader: ModLoader;
  loaderVersion: string;
  recommendedRamMb: number;
  visibility: InstanceVisibility;
};

function toFormState(instance?: Instance): FormState {
  return {
    name: instance?.name ?? '',
    cover: instance?.cover ?? '',
    description: instance?.description ?? '',
    changelog: instance?.changelog ?? '',
    mcVersion: instance?.mcVersion ?? '',
    loader: instance?.loader ?? 'fabric',
    loaderVersion: instance?.loaderVersion ?? '',
    recommendedRamMb: instance?.recommendedRamMb ?? 4096,
    visibility: instance?.visibility ?? 'public',
  };
}

export function InstanceEditorForm({
  instance,
  onSaved,
}: {
  /** Existing instance for edit mode; omitted for create mode. */
  instance?: Instance;
  /** Called after a successful save with the persisted instance. */
  onSaved?: (instance: Instance) => void;
}) {
  const router = useRouter();
  const isEdit = !!instance;
  const [form, setForm] = useState<FormState>(() => toFormState(instance));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const coverStyle = useMemo(
    () =>
      form.cover
        ? { backgroundImage: `url(${form.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundImage: coverGradient(form.name || 'instance') },
    [form.cover, form.name],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const payload: UpsertInstanceRequest = {
      name: form.name.trim(),
      description: form.description,
      changelog: form.changelog,
      mcVersion: form.mcVersion.trim(),
      loader: form.loader,
      loaderVersion: form.loaderVersion.trim() || undefined,
      recommendedRamMb: form.recommendedRamMb,
      visibility: form.visibility,
      cover: form.cover.trim() || undefined,
    };

    const validated = UpsertInstanceRequestSchema.safeParse(payload);
    if (!validated.success) {
      const first = validated.error.issues[0];
      toast.error(first?.message ?? 'Formulaire invalide');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/instances/${instance.id}` : '/api/admin/instances';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = InstanceSchema.parse(await res.json());
      toast.success(isEdit ? 'Instance mise à jour' : 'Instance créée');
      if (onSaved) onSaved(saved);
      if (!isEdit) {
        router.replace(`/admin/instances/${saved.id}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Identity */}
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-[15px] font-semibold text-fg-1">Identité</h2>
        <p className="mt-1 text-[12.5px] text-muted">Nom, cover et description de l’instance.</p>

        <div className="mt-5 flex gap-5">
          <div className="shrink-0">
            <Label className="mb-1.5 block">Cover</Label>
            <span
              className="flex h-[88px] w-[120px] items-center justify-center overflow-hidden rounded-[12px] border border-border-2 text-[20px] font-semibold text-white/90"
              style={coverStyle}
            >
              {form.cover ? '' : initials(form.name || 'MC')}
            </span>
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Mon super modpack"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover">URL de la cover (optionnel)</Label>
              <Input
                id="cover"
                value={form.cover}
                onChange={(e) => set('cover', e.target.value)}
                placeholder="https://… (laisser vide pour une cover auto)"
                inputMode="url"
              />
              <p className="text-[11.5px] text-muted-3">
                Vide = cover générée automatiquement à partir du nom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Markdown: description + changelog */}
      <section className="grid gap-5 lg:grid-cols-2">
        <MarkdownField
          id="description"
          label="Description"
          hint="Présentation affichée sur la fiche de l’instance."
          value={form.description}
          onChange={(v) => set('description', v)}
        />
        <MarkdownField
          id="changelog"
          label="Changelog"
          hint="Notes de version, format Markdown."
          value={form.changelog}
          onChange={(v) => set('changelog', v)}
        />
      </section>

      {/* Runtime */}
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-[15px] font-semibold text-fg-1">Moteur</h2>
        <p className="mt-1 text-[12.5px] text-muted">Version de Minecraft, loader et mémoire.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="mcVersion">Version Minecraft</Label>
            <Input
              id="mcVersion"
              value={form.mcVersion}
              onChange={(e) => set('mcVersion', e.target.value)}
              placeholder="1.21.1"
              className="font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Loader</Label>
            <Select value={form.loader} onValueChange={(v) => set('loader', v as ModLoader)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOADERS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LOADER_LABEL[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loaderVersion">Version du loader</Label>
            <Input
              id="loaderVersion"
              value={form.loaderVersion}
              onChange={(e) => set('loaderVersion', e.target.value)}
              placeholder={form.loader === 'vanilla' ? '—' : '0.16.9'}
              className="font-mono"
              disabled={form.loader === 'vanilla'}
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <Label>RAM recommandée</Label>
            <span className="font-mono text-[12.5px] text-fg-2">
              {(form.recommendedRamMb / 1024).toFixed(form.recommendedRamMb % 1024 === 0 ? 0 : 1)} Go
              <span className="ml-1.5 text-muted-3">({form.recommendedRamMb} Mo)</span>
            </span>
          </div>
          <Slider
            min={RAM_MIN}
            max={RAM_MAX}
            step={RAM_STEP}
            value={[form.recommendedRamMb]}
            onValueChange={([v]) => set('recommendedRamMb', v ?? RAM_MIN)}
          />
          <div className="flex justify-between font-mono text-[10.5px] text-muted-3">
            <span>{RAM_MIN / 1024} Go</span>
            <span>{RAM_MAX / 1024} Go</span>
          </div>
        </div>
      </section>

      {/* Visibility */}
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-[15px] font-semibold text-fg-1">Visibilité</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          Les instances privées n’apparaissent jamais dans la liste publique.
        </p>
        <div className="mt-5">
          <VisibilityToggle
            value={form.visibility}
            onChange={(v) => set('visibility', v)}
            disabled={saving}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-2.5 pb-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin')}
          disabled={saving}
        >
          Annuler
        </Button>
        <Button type="submit" className="gap-1.5" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Enregistrer' : 'Créer l’instance'}
        </Button>
      </div>
    </form>
  );
}

function MarkdownField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <Tabs defaultValue="edit">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <Label htmlFor={id}>{label}</Label>
            <p className="mt-0.5 text-[11.5px] text-muted-3">{hint}</p>
          </div>
          <TabsList>
            <TabsTrigger value="edit" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Éditer
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Aperçu
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="edit">
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Markdown supporté…"
            className="min-h-[180px] resize-y font-mono text-[12.5px]"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div
            className={cn(
              'prose-pilote min-h-[180px] rounded-[10px] border border-border-input bg-surface-input p-3.5 text-[13px] leading-relaxed text-fg-3',
            )}
          >
            {value.trim() ? (
              <MarkdownPreview source={value} />
            ) : (
              <p className="text-muted-3">Rien à prévisualiser.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  return (
    <Markdown
      components={{
        h1: ({ children }) => <h1 className="mb-2 text-[16px] font-semibold text-fg-1">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-[14px] font-semibold text-fg-2">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2.5 text-[13px] font-semibold text-fg-2">{children}</h3>,
        p: ({ children }) => <p className="mb-2 text-fg-3">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 text-fg-3">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-fg-3">{children}</ol>,
        li: ({ children }) => <li className="text-fg-3">{children}</li>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded-[5px] border border-border-2 bg-surface-2 px-1.5 py-px font-mono text-[11.5px] text-fg-2">
            {children}
          </code>
        ),
        strong: ({ children }) => <strong className="font-semibold text-fg-1">{children}</strong>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border-2 pl-3 text-muted">{children}</blockquote>
        ),
        hr: () => <hr className="my-3 border-border-subtle" />,
      }}
    >
      {source}
    </Markdown>
  );
}
