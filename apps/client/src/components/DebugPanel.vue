<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { Bug, X, RotateCcw, Trash2 } from 'lucide-vue-next';
import { useDebugStore } from '@/stores/debug';
import { useProfilesStore } from '@/stores/profiles';
import { useInstancesStore } from '@/stores/instances';
import { useModulesStore } from '@/stores/modules';
import { getBridge, hasBridge } from '@/lib/bridge';

const debug = useDebugStore();
const { open, unlocked, events } = storeToRefs(debug);
const router = useRouter();
const route = useRoute();

const profiles = useProfilesStore();
const instances = useInstancesStore();
const modules = useModulesStore();

const version = ref('—');
onMounted(async () => {
  if (hasBridge()) {
    try {
      version.value = await getBridge().app.getVersion();
    } catch {
      /* ignore */
    }
  }
});

const stats = computed(() => [
  { label: 'Profils', value: profiles.profiles.length },
  { label: 'Actif', value: profiles.active?.name ?? '—' },
  { label: 'Publiques', value: instances.publicInstances.length },
  { label: 'Privées', value: instances.unlockedInstances.length },
  { label: 'En cours', value: instances.runningIds.length },
  { label: 'Modules on', value: modules.modules.filter((m) => m.enabled).length },
]);

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour12: false });
}

const actions = [
  { label: 'Rejouer le splash', run: () => router.push('/') },
  { label: 'Recharger instances', run: () => instances.load() },
  { label: 'Recharger modules', run: () => modules.load() },
  { label: 'Toast OK', run: () => toast.success('Test ✓') },
  { label: 'Toast erreur', run: () => toast.error('Erreur de test') },
];
</script>

<template>
  <Transition name="debug">
    <div
      v-if="unlocked && open"
      class="absolute bottom-4 right-4 z-[80] flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-card border border-border-2 bg-surface shadow-dialog"
    >
      <header class="flex items-center gap-2 border-b border-border-subtle bg-surface-2 px-3 py-2">
        <Bug class="h-4 w-4 text-accent" />
        <span class="text-[13px] font-semibold text-fg-1">Mode dev</span>
        <span class="font-mono text-[10px] text-muted-3">v{{ version }}</span>
        <span class="ml-auto font-mono text-[10px] text-muted-3">{{ String(route.name ?? '') }}</span>
        <button class="rounded p-1 text-muted-2 hover:text-fg" @click="debug.close()">
          <X class="h-3.5 w-3.5" />
        </button>
      </header>

      <div class="grid grid-cols-3 gap-px bg-border-subtle">
        <div v-for="s in stats" :key="s.label" class="bg-surface px-2 py-1.5">
          <div class="font-mono text-[9px] uppercase tracking-wide text-muted-3">{{ s.label }}</div>
          <div class="truncate text-[12px] font-semibold text-fg-2">{{ s.value }}</div>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5 border-y border-border-subtle p-2.5">
        <button
          v-for="a in actions"
          :key="a.label"
          class="rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-[11px] text-fg-3 transition-colors hover:border-border-hover hover:text-fg"
          @click="a.run()"
        >
          {{ a.label }}
        </button>
      </div>

      <div class="flex items-center justify-between px-3 py-1.5">
        <span class="font-mono text-[10px] uppercase tracking-wide text-muted-3">
          Événements ({{ events.length }})
        </span>
        <div class="flex items-center gap-2 text-muted-2">
          <span class="font-mono text-[10px] text-muted-3">F12 : DevTools</span>
          <button class="hover:text-fg" title="Vider" @click="debug.clearLog()">
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3 font-mono text-[10.5px] leading-relaxed">
        <p v-if="events.length === 0" class="flex items-center gap-1.5 text-muted-3">
          <RotateCcw class="h-3 w-3" /> En attente d'événements…
        </p>
        <div v-for="(e, i) in events" :key="i" class="flex gap-2 border-b border-border-subtle/60 py-1">
          <span class="shrink-0 text-muted-3">{{ time(e.ts) }}</span>
          <span
            class="shrink-0 font-semibold"
            :class="e.channel === 'error' ? 'text-destructive' : 'text-accent'"
            >{{ e.channel }}</span
          >
          <span class="min-w-0 break-words text-muted">{{ e.text }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.debug-enter-active,
.debug-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.debug-enter-from,
.debug-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
