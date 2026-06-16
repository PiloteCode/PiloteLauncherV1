<script setup lang="ts">
import { Toaster as SonnerToaster } from 'vue-sonner';
import 'vue-sonner/style.css';
</script>

<template>
  <SonnerToaster
    position="bottom-right"
    theme="dark"
    :duration="4200"
    :gap="10"
    :offset="20"
    :toast-options="{
      class: 'pilote-toast',
      style: {
        background: 'var(--surface-2)',
        border: '1px solid var(--border-2)',
        color: 'var(--fg-1)',
        borderRadius: '12px',
        boxShadow: 'var(--tw-shadow, 0 22px 50px -18px rgba(0,0,0,.8))',
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: '13px',
      },
    }"
  />
</template>

<style>
.pilote-toast [data-icon] {
  color: var(--accent);
}
[data-sonner-toast][data-type='success'] [data-icon] {
  color: var(--success);
}
[data-sonner-toast][data-type='error'] [data-icon] {
  color: var(--destructive);
}
[data-sonner-toast] [data-description] {
  color: var(--muted);
}
</style>
