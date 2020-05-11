import Vue from 'vue';
import App from './App.vue';
import router from './router';
import vSelect from 'vue-select';
import VueResource from 'vue-resource';
import VTooltip from 'v-tooltip';
import slug from 'vue-string-filter/libs/slug';

Vue.filter('slug', slug);
Vue.use(VTooltip);
Vue.use(VueResource);

Vue.config.productionTip = false;

Vue.component('v-select', vSelect);

new Vue({
  router,
  render: h => h(App),
  http: {
    root: process.env.VUE_APP_DATA_HOST,
  },
}).$mount('#app');
