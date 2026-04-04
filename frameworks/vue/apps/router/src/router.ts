import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from './auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/Home.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('./pages/Dashboard.vue'),
    },
    {
      path: '/table',
      name: 'table',
      component: () => import('./pages/Table.vue'),
    },
    {
      path: '/form',
      name: 'form',
      component: () => import('./pages/Form.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('./pages/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./pages/Settings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('./pages/Notifications.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('./pages/Search.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./pages/About.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/Login.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./pages/NotFound.vue'),
    },
  ],
});

// Auth guard
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export { router };
