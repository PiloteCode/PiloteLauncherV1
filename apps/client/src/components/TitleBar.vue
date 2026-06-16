<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Minus, Square, X } from 'lucide-vue-next';
import Logo from '@/components/Logo.vue';
import { getBridge, hasBridge } from '@/lib/bridge';

const version = ref('');

onMounted(async () => {
  if (!hasBridge()) return;
  try {
    version.value = await getBridge().app.getVersion();
  } catch {
    version.value = '';
  }
});

function minimize(): void {
  if (hasBridge()) void getBridge().app.minimize();
}
function toggleMaximize(): void {
  if (hasBridge()) void getBridge().app.toggleMaximize();
}
function close(): void {
  if (hasBridge()) void getBridge().app.close();
}
</script>

<template>
  <header
    class="drag-region relative z-30 flex h-11 shrink-0 items-center justify-between border-b border-border-subtle bg-titlebar pl-3.5 pr-2"
  >
    <div class="flex items-center gap-2.5">
      <Logo :size="13" />
      <span class="text-[13px] font-semibold tracking-tight text-fg-1">Pilote Project</span>
      <span v-if="version" class="font-mono text-[11px] text-muted-3">v{{ version }}</span>
    </div>

    <div class="no-drag flex items-center gap-1">
      <button
        type="button"
        class="flex h-7 w-9 items-center justify-center rounded-[7px] text-muted-2 transition-colors hover:bg-surface-hover hover:text-fg-1 focus-ring"
        aria-label="Réduire"
        @click="minimize"
      >
        <Minus class="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        class="flex h-7 w-9 items-center justify-center rounded-[7px] text-muted-2 transition-colors hover:bg-surface-hover hover:text-fg-1 focus-ring"
        aria-label="Agrandir"
        @click="toggleMaximize"
      >
        <Square class="h-3 w-3" />
      </button>
      <button
        type="button"
        class="flex h-7 w-9 items-center justify-center rounded-[7px] text-muted-2 transition-colors hover:bg-destructive hover:text-white focus-ring"
        aria-label="Fermer"
        @click="close"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </header>
</template>
