import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import 'shared-css/base.css';
import 'shared-css/layout.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
