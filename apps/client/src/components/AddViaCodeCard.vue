<script setup lang="ts">
import { KeyRound, Plus } from 'lucide-vue-next';

const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="group flex min-h-[206px] flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border-input bg-surface/40 p-6 text-center transition-colors hover:border-accent/50 hover:bg-surface-hover focus-ring"
    @click="emit('click')"
  >
    <span
      class="flex h-12 w-12 items-center justify-center rounded-[14px] border border-border-2 bg-surface-2 text-muted-2 transition-colors group-hover:border-accent/40 group-hover:text-accent"
    >
      <KeyRound class="h-5 w-5" />
    </span>
    <span class="space-y-1">
      <span class="block text-[13.5px] font-semibold text-fg-2">Ajouter via un code</span>
      <span class="block text-[12px] text-muted-2">Débloquez une instance privée avec son code d'accès.</span>
    </span>
    <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
      <Plus class="h-3.5 w-3.5" /> Saisir un code
    </span>
  </button>
</template>
