<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { avatarColor, initials } from '@/lib/cover';

/**
 * Minecraft head avatar for a profile. Renders the player's head from their UUID via a
 * head-render service (premium accounts get their real head; offline UUIDs get the default
 * Steve/Alex). Falls back to coloured initials if there's no UUID or the image can't load
 * (e.g. offline). Pass sizing/rounding via `class`; the font-size sets the initials size.
 */
const props = withDefaults(
  defineProps<{
    name: string;
    uuid?: string;
    /** Rendered size in px (used to request a crisp 2x head). */
    size?: number;
  }>(),
  { size: 32, uuid: '' },
);

const failed = ref(false);
watch(
  () => props.uuid,
  () => {
    failed.value = false;
  },
);

const headUrl = computed(() => {
  if (!props.uuid) return '';
  const id = props.uuid.replace(/-/g, '');
  const px = Math.min(Math.max(Math.round(props.size * 2), 32), 160);
  return `https://mc-heads.net/avatar/${id}/${px}`;
});

const showImage = computed(() => Boolean(props.uuid) && !failed.value);
</script>

<template>
  <span
    class="relative inline-flex items-center justify-center overflow-hidden font-semibold text-white"
    :style="{ background: showImage ? 'var(--surface-3)' : avatarColor(name) }"
  >
    <img
      v-if="showImage"
      :src="headUrl"
      alt=""
      loading="lazy"
      draggable="false"
      class="h-full w-full object-cover [image-rendering:pixelated]"
      @error="failed = true"
    />
    <span v-else>{{ initials(name) }}</span>
  </span>
</template>
