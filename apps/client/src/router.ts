import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

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

export default router;
