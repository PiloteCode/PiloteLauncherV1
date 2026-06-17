<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import {
  MessageCircle,
  Timer,
  Signal,
  Gauge,
  Puzzle,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-vue-next';
import type { ModuleView } from '@pilote/types';
import Sidebar from '@/components/Sidebar.vue';
import { Button, ScrollArea, Switch, Badge, Input } from '@/components/ui';
import { useModulesStore } from '@/stores/modules';
import { getBridge, hasBridge } from '@/lib/bridge';

const store = useModulesStore();
const { modules, ui } = storeToRefs(store);

const ICONS: Record<string, LucideIcon> = {
  'message-circle': MessageCircle,
  timer: Timer,
  signal: Signal,
  gauge: Gauge,
};
const iconFor = (name: string): LucideIcon => ICONS[name] ?? Puzzle;

const CATEGORY_LABEL: Record<string, string> = {
  social: 'Social',
  stats: 'Stats',
  performance: 'Performance',
  server: 'Serveur',
  utility: 'Utilitaire',
};

// Local editable copies of each module's settings, seeded from the persisted values.
const drafts = reactive<Record<string, Record<string, unknown>>>({});
function draftFor(m: ModuleView): Record<string, unknown> {
  if (!drafts[m.id]) drafts[m.id] = { ...m.settings };
  return drafts[m.id]!;
}

async function toggle(m: ModuleView, value: boolean): Promise<void> {
  await store.setEnabled(m.id, value);
}

async function saveSettings(m: ModuleView): Promise<void> {
  await store.saveSettings(m.id, { ...draftFor(m) });
}

function setField(m: ModuleView, key: string, value: unknown): void {
  draftFor(m)[key] = value;
}

function openMarketplace(): void {
  if (!hasBridge()) return;
  // The marketplace lives on the site; open it in the browser.
  void getBridge().app.openExternal('https://piloteproject.pilotecode.com/modules');
}

onMounted(() => {
  void store.init();
});
</script>

<template>
  <div class="flex h-full w-full">
    <Sidebar />

    <ScrollArea class="flex-1" viewport-class="px-7 py-6">
      <div class="mx-auto max-w-[760px] animate-fade space-y-5">
        <header class="flex items-end justify-between gap-4">
          <div>
            <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Modules</h1>
            <p class="mt-0.5 text-[13px] text-muted-2">
              Active des petites extensions pour enrichir ton launcher.
            </p>
          </div>
          <Button variant="secondary" class="gap-2" @click="openMarketplace">
            <ShoppingBag class="h-4 w-4" />
            Explorer
          </Button>
        </header>

        <div v-if="modules.length === 0" class="rounded-[18px] border border-border bg-surface-elevated p-10 text-center">
          <Puzzle class="mx-auto h-7 w-7 text-muted-3" />
          <p class="mt-3 text-[13px] text-muted-2">Aucun module pour l'instant.</p>
        </div>

        <section
          v-for="m in modules"
          :key="m.id"
          class="rounded-[18px] border border-border bg-surface-elevated p-5"
          :class="m.enabled ? 'border-accent/25' : ''"
        >
          <div class="flex items-start gap-3.5">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-border-2 bg-surface-2"
              :class="m.enabled ? 'text-accent' : 'text-muted-2'"
            >
              <component :is="iconFor(m.icon)" class="h-[18px] w-[18px]" />
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-[14.5px] font-semibold text-fg-1">{{ m.name }}</h2>
                <Badge class="shrink-0">{{ CATEGORY_LABEL[m.category] ?? m.category }}</Badge>
              </div>
              <p class="mt-1 text-[12.5px] leading-relaxed text-muted">{{ m.description }}</p>

              <div v-if="m.permissions.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="p in m.permissions"
                  :key="p"
                  class="rounded-md border border-border-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-3"
                >
                  {{ p }}
                </span>
              </div>
            </div>

            <Switch
              :model-value="m.enabled"
              class="mt-1 shrink-0"
              @update:model-value="(v: boolean) => toggle(m, v)"
            />
          </div>

          <!-- Live module UI (summary, actions, settings) when enabled -->
          <div v-if="m.enabled && ui[m.id]" class="mt-4 space-y-3 border-t border-border-subtle pt-4">
            <p v-if="ui[m.id]!.summary" class="flex items-center gap-2 text-[12.5px] text-fg-2">
              <span class="h-1.5 w-1.5 rounded-full bg-accent" />
              {{ ui[m.id]!.summary }}
            </p>

            <div v-if="ui[m.id]!.actions.length" class="flex flex-wrap gap-2">
              <Button
                v-for="(a, i) in ui[m.id]!.actions"
                :key="i"
                :variant="a.variant === 'secondary' ? 'secondary' : a.variant === 'destructive' ? 'destructive' : 'default'"
                size="sm"
                @click="a.onClick()"
              >
                {{ a.label }}
              </Button>
            </div>

            <div v-if="ui[m.id]!.settingsFields.length" class="space-y-2.5">
              <div v-for="f in ui[m.id]!.settingsFields" :key="f.key" class="space-y-1">
                <label class="text-[12px] font-medium text-fg-3">{{ f.label }}</label>
                <Switch
                  v-if="f.type === 'boolean'"
                  :model-value="Boolean(draftFor(m)[f.key])"
                  @update:model-value="(v: boolean) => { setField(m, f.key, v); saveSettings(m); }"
                />
                <Input
                  v-else
                  :model-value="String(draftFor(m)[f.key] ?? '')"
                  :placeholder="f.placeholder"
                  :type="f.type === 'number' ? 'number' : 'text'"
                  @update:model-value="(v: string | number | undefined) => setField(m, f.key, f.type === 'number' ? Number(v ?? 0) : (v ?? ''))"
                  @blur="saveSettings(m)"
                />
                <p v-if="f.help" class="text-[11px] text-muted-3">{{ f.help }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ScrollArea>
  </div>
</template>
