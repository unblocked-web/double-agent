import Vue from 'vue';
import Router from 'vue-router';
import Home from './pages/Home.vue';
import About from '@/pages/About.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      component: About,
    },
    {
      path: '/benchmarks',
      name: 'benchmarks',
      component: () => import('./pages/Benchmarks.vue'),
      props: true,
    },
    {
      path: '/benchmark/:scraperKey/browser/:browserKey',
      name: 'scraperBenchmark',
      component: () => import('./pages/ScraperBenchmark.vue'),
      props: true,
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { selector: to.hash };
    } else if (savedPosition) {
      return savedPosition;
    } else {
      return { x: 0, y: 0 };
    }
  },
});
