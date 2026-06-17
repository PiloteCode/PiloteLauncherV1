<script setup lang="ts">
import { Library, Puzzle, Settings as SettingsIcon } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import ProfileSwitcher from '@/components/ProfileSwitcher.vue';

const nav = [
  { to: '/home', label: 'Bibliothèque', icon: Library },
  { to: '/modules', label: 'Modules', icon: Puzzle },
  { to: '/settings', label: 'Réglages', icon: SettingsIcon },
];
</script>

<template>
  <aside class="flex w-[228px] shrink-0 flex-col border-r border-border-subtle bg-titlebar">
    <nav class="flex-1 space-y-1 p-3">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        v-slot="{ isActive, href, navigate }"
        custom
      >
        <a
          :href="href"
          class="group flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13px] font-medium transition-colors no-drag"
          :class="
            isActive
              ? 'bg-accent/12 text-accent'
              : 'text-muted hover:bg-surface-hover hover:text-fg-1'
          "
          @click="navigate"
        >
          <component
            :is="item.icon"
            class="h-[18px] w-[18px] shrink-0 transition-colors"
            :class="isActive ? 'text-accent' : 'text-muted-2 group-hover:text-fg-2'"
          />
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="border-t border-border-subtle p-3">
      <ProfileSwitcher />
    </div>
  </aside>
</template>
