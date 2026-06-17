import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { useProfilesStore } from '@/stores/profiles';
import { hasBridge } from '@/lib/bridge';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'splash',
    component: () => import('@/views/SplashView.vue'),
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/modules',
    name: 'modules',
    component: () => import('@/views/ModulesView.vue'),
  },
  {
    path: '/instance/:id',
    name: 'instance',
    component: () => import('@/views/InstanceDetailView.vue'),
    props: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Onboarding gate: you can't reach the library/settings/modules without a first profile.
// (The splash also routes there on launch; this enforces it for any direct navigation.)
const NEEDS_PROFILE = new Set(['home', 'settings', 'modules', 'instance']);
router.beforeEach((to) => {
  if (!hasBridge()) return true;
  const profiles = useProfilesStore();
  if (NEEDS_PROFILE.has(String(to.name)) && profiles.loaded && !profiles.hasProfile) {
    return { name: 'onboarding' };
  }
  return true;
});

export default router;
